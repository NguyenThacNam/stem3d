"""API 57–59 – soạn câu hỏi kiểm tra nhanh (UC 23); API 56 chặn xóa bộ phận đang là đáp án (PART_IN_USE)."""

from typing import Any

import pytest
from httpx import Response
from sqlalchemy import func, select, text

from app.models import Question, SystemLog
from tests.du_lieu import kiem_tra_nhat_ky
from tests.test_editor_lessons import MoiTruong, mt  # noqa: F401 – fixture dùng chung

CHOICE = {
    "question_type": "CHOICE",
    "content": "Vây nào giúp cá giữ thăng bằng?",
    "options": ["Vây lưng", "Vây đuôi", "Vây ngực", "Vây bụng"],
    "answer": {"index": 0},
}
NUMERIC = {
    "question_type": "NUMERIC",
    "content": "Thể tích NaOH cần dùng?",
    "options": {"unit": "mL"},
    "answer": {"value": 12.5},
    "tolerance": 0.1,
}


def _bai(mt: MoiTruong, **kw: Any) -> dict[str, Any]:
    """Bài nháp có mô hình và hai bộ phận (Vây lưng, Mắt)."""
    b = mt.tao(asset_id=mt.mo_hinh().id, **kw)
    res = mt.goi(
        "PUT",
        f"/api/editor/lessons/{b['id']}/parts",
        json={
            "parts": [
                {"mesh_names": ["vay_lung"], "label": "Vây lưng"},
                {"mesh_names": ["mat"], "label": "Mắt"},
            ]
        },
    )
    assert res.status_code == 200, res.text
    return res.json()


def _them(mt: MoiTruong, lesson_id: int, cau: dict[str, Any], user: Any = None) -> Response:
    return mt.goi("POST", f"/api/editor/lessons/{lesson_id}/questions", user, json=cau)


def _so_nhat_ky(mt: MoiTruong) -> int:
    return mt.db.scalar(select(func.count()).where(SystemLog.action.like("%_QUESTION"))) or 0


def _tong_nhat_ky(mt: MoiTruong) -> int:
    return mt.db.scalar(select(func.count()).select_from(SystemLog)) or 0


def _khong_lo_dap_an(detail: dict[str, Any], *gia_tri: str) -> None:
    assert not ({"options", "answer", "tolerance", "value", "index", "part_id"} & set(detail)), detail
    for g in gia_tri:
        assert g not in str(detail), detail


# ================================================================ quyền, không tìm thấy
DUONG_DAN = [
    ("POST", "/api/editor/lessons/1/questions"),
    ("PUT", "/api/editor/questions/1"),
    ("DELETE", "/api/editor/questions/1"),
]


@pytest.mark.parametrize("vai_tro", ["qtt", "gv", "hs"])
@pytest.mark.parametrize("method,url", DUONG_DAN)
def test_vai_tro_khac_bi_cam(mt: MoiTruong, vai_tro: str, method: str, url: str) -> None:
    res = mt.goi(method, url, mt.tk[vai_tro], json=CHOICE)
    assert res.status_code == 403 and res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.parametrize("method,url", DUONG_DAN)
def test_chua_dang_nhap(mt: MoiTruong, method: str, url: str) -> None:
    assert mt.client.request(method, url, json=CHOICE).status_code == 401


def test_bai_khong_co(mt: MoiTruong) -> None:
    res = _them(mt, 999999, CHOICE)
    assert res.status_code == 404 and res.json()["error"]["code"] == "LESSON_NOT_FOUND"
    assert _so_nhat_ky(mt) == 0


@pytest.mark.parametrize("method", ["PUT", "DELETE"])
def test_cau_hoi_khong_co(mt: MoiTruong, method: str) -> None:
    res = mt.goi(method, "/api/editor/questions/999999", json=CHOICE)
    assert res.status_code == 404 and res.json()["error"]["code"] == "QUESTION_NOT_FOUND"
    assert _so_nhat_ky(mt) == 0


# ================================================================ API 57 – thêm
def test_them_trac_nghiem(mt: MoiTruong) -> None:
    b = _bai(mt)
    res = _them(mt, b["id"], CHOICE | {"options": ["  Vây lưng ", "Vây đuôi"]})
    assert res.status_code == 201, res.text
    q = res.json()
    assert q | {"id": 0} == {
        "id": 0,
        "question_type": "CHOICE",
        "content": "Vây nào giúp cá giữ thăng bằng?",
        "options": ["Vây lưng", "Vây đuôi"],
        "answer": {"index": 0},
        "tolerance": None,
        "sort_order": 0,
    }
    dong = kiem_tra_nhat_ky(mt.db, "CREATE_QUESTION", target_id=q["id"], target_type="question")
    assert dong.detail["lesson_id"] == b["id"]
    _khong_lo_dap_an(dong.detail, "Vây đuôi")
    # API 51 trả câu hỏi kèm đáp án cho màn soạn.
    chi_tiet = mt.goi("GET", f"/api/editor/lessons/{b['id']}").json()
    assert chi_tiet["questions"][0]["answer"] == {"index": 0}


def test_them_chon_bo_phan_va_nhap_so_theo_thu_tu(mt: MoiTruong) -> None:
    b = _bai(mt)
    id_mat = b["parts"][1]["id"]
    _them(mt, b["id"], CHOICE)
    res = _them(mt, b["id"], {"question_type": "PICK_PART", "content": "Bấm vào mắt cá", "answer": {"part_id": id_mat}})
    assert res.status_code == 201 and res.json()["answer"] == {"part_id": id_mat} and res.json()["sort_order"] == 1
    # Không có phương án: lưu NULL của SQL, không phải JSON 'null'.
    assert mt.db.scalar(text("SELECT options IS NULL FROM questions WHERE id = :i"), {"i": res.json()["id"]})
    res = _them(mt, b["id"], NUMERIC)
    assert res.status_code == 201, res.text
    q = res.json()
    assert q["options"] == {"unit": "mL"} and q["answer"] == {"value": 12.5}
    assert q["tolerance"] == "0.1" and q["sort_order"] == 2


def test_nhap_so_khong_don_vi(mt: MoiTruong) -> None:
    b = _bai(mt)
    for o in (None, {"unit": "  "}, {"unit": None}):
        res = _them(mt, b["id"], NUMERIC | {"options": o, "tolerance": 0})
        assert res.status_code == 201 and res.json()["options"] is None and res.json()["tolerance"] == "0"


def test_quan_tri_he_thong_them_duoc(mt: MoiTruong) -> None:
    b = _bai(mt)
    assert _them(mt, b["id"], CHOICE, mt.tk["sys"]).status_code == 201


def test_bai_da_xuat_ban_bi_chan(mt: MoiTruong) -> None:
    b = _bai(mt)
    q = _them(mt, b["id"], CHOICE).json()
    assert mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish").status_code == 200
    so = _so_nhat_ky(mt)
    for res in (
        _them(mt, b["id"], CHOICE),
        mt.goi("PUT", f"/api/editor/questions/{q['id']}", json=CHOICE),
        mt.goi("DELETE", f"/api/editor/questions/{q['id']}"),
    ):
        assert res.status_code == 409 and res.json()["error"]["code"] == "LESSON_PUBLISHED"
    assert _so_nhat_ky(mt) == so


def test_toi_da_50_cau(mt: MoiTruong) -> None:
    b = _bai(mt)
    for i in range(50):
        mt.db.add(Question(lesson_id=b["id"], question_type="CHOICE", content=f"Câu {i}", options=["a", "b"], answer={"index": 0}, sort_order=i))
    mt.db.flush()
    res = _them(mt, b["id"], CHOICE)
    assert res.status_code == 400 and res.json()["error"]["code"] == "QUESTION_LIMIT"
    assert _so_nhat_ky(mt) == 0


@pytest.mark.parametrize(
    "cau,truong",
    [
        (CHOICE | {"answer": None}, "answer"),  # UC 23 luồng phụ 3.1: chưa chọn đáp án đúng
        (CHOICE | {"answer": {"index": 4}}, "answer"),
        (CHOICE | {"answer": {"index": True}}, "answer"),
        (CHOICE | {"answer": {"index": 0, "x": 1}}, "answer"),
        (CHOICE | {"options": ["Chỉ một"]}, "options"),
        (CHOICE | {"options": ["a", "b", "c", "d", "e", "f", "g"]}, "options"),
        (CHOICE | {"options": ["a", "  "]}, "options.1"),
        (CHOICE | {"options": ["Vây", "vây"]}, "options.1"),
        (CHOICE | {"options": ["a", "x" * 501]}, "options.1"),
        (CHOICE | {"options": "a, b"}, "options"),
        (CHOICE | {"tolerance": 0.1}, "tolerance"),
        ({"question_type": "PICK_PART", "content": "Bấm", "answer": None}, "answer"),
        ({"question_type": "PICK_PART", "content": "Bấm", "answer": {"part_id": 999999}}, "answer"),
        ({"question_type": "PICK_PART", "content": "Bấm", "answer": {"part_id": 1}, "options": ["a"]}, "options"),
        (NUMERIC | {"tolerance": None}, "tolerance"),
        (NUMERIC | {"answer": {"value": "12"}}, "answer"),
        (NUMERIC | {"answer": {"value": 1e13}}, "answer"),
        (NUMERIC | {"options": {"unit": "x" * 31}}, "options"),
        (NUMERIC | {"options": {"don_vi": "mL"}}, "options"),
        (NUMERIC | {"options": ["mL"]}, "options"),
    ],
)
def test_them_sai_du_lieu(mt: MoiTruong, cau: dict[str, Any], truong: str) -> None:
    b = _bai(mt)
    res = _them(mt, b["id"], cau)
    assert res.status_code == 422, res.text
    assert truong in [d["field"] for d in res.json()["error"]["details"]]
    assert _so_nhat_ky(mt) == 0


@pytest.mark.parametrize(
    "sua",
    [
        {"content": "   "},
        {"content": "x" * 2001},
        {"question_type": "ESSAY"},
        {"tolerance": -1},
        {"tolerance": "NaN"},
    ],
)
def test_them_sai_kieu(mt: MoiTruong, sua: dict[str, Any]) -> None:
    b = _bai(mt)
    res = _them(mt, b["id"], NUMERIC | sua)
    assert res.status_code == 422 and res.json()["error"]["code"] == "VALIDATION_ERROR"


def test_chon_bo_phan_khi_bai_chua_co_nhan(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _them(mt, b["id"], {"question_type": "PICK_PART", "content": "Bấm", "answer": {"part_id": 1}})
    assert res.status_code == 422 and "gắn nhãn" in res.json()["error"]["details"][0]["message"]
    assert _so_nhat_ky(mt) == 0


def test_chon_bo_phan_cua_bai_khac(mt: MoiTruong) -> None:
    khac = _bai(mt, lesson_no=35)
    b = _bai(mt)
    res = _them(mt, b["id"], {"question_type": "PICK_PART", "content": "Bấm", "answer": {"part_id": khac["parts"][0]["id"]}})
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "answer"
    assert _so_nhat_ky(mt) == 0


# ================================================================ API 58 – sửa
def test_sua_doi_loai_va_ghi_truong_da_doi(mt: MoiTruong) -> None:
    b = _bai(mt)
    q = _them(mt, b["id"], CHOICE).json()
    res = mt.goi("PUT", f"/api/editor/questions/{q['id']}", json=NUMERIC)
    assert res.status_code == 200, res.text
    assert res.json()["question_type"] == "NUMERIC" and res.json()["id"] == q["id"]
    dong = kiem_tra_nhat_ky(mt.db, "UPDATE_QUESTION", target_id=q["id"])
    assert dong.detail["changed_fields"] == ["question_type", "content", "options", "answer", "tolerance"]
    _khong_lo_dap_an(dong.detail, "12.5", "0.1", "mL")


def test_sua_khong_doi_gi_khong_ghi(mt: MoiTruong) -> None:
    b = _bai(mt)
    q = _them(mt, b["id"], CHOICE).json()
    assert mt.goi("PUT", f"/api/editor/questions/{q['id']}", json=CHOICE).status_code == 200
    assert mt.db.scalar(select(func.count()).where(SystemLog.action == "UPDATE_QUESTION")) == 0


def test_sua_doi_thu_tu(mt: MoiTruong) -> None:
    b = _bai(mt)
    ids = [_them(mt, b["id"], CHOICE | {"content": f"Câu {i}"}).json()["id"] for i in range(3)]
    res = mt.goi("PUT", f"/api/editor/questions/{ids[2]}", json=CHOICE | {"content": "Câu 2", "sort_order": 0})
    assert res.status_code == 200 and res.json()["sort_order"] == 0
    ds = mt.goi("GET", f"/api/editor/lessons/{b['id']}").json()["questions"]
    assert [(q["id"], q["sort_order"]) for q in ds] == [(ids[2], 0), (ids[0], 1), (ids[1], 2)]
    # Vị trí vượt cuối danh sách thì đưa về cuối.
    mt.goi("PUT", f"/api/editor/questions/{ids[2]}", json=CHOICE | {"content": "Câu 2", "sort_order": 50})
    ds = mt.goi("GET", f"/api/editor/lessons/{b['id']}").json()["questions"]
    assert [q["id"] for q in ds] == [ids[0], ids[1], ids[2]]


def test_sua_sai_du_lieu_khong_doi_gi(mt: MoiTruong) -> None:
    b = _bai(mt)
    q = _them(mt, b["id"], CHOICE).json()
    res = mt.goi("PUT", f"/api/editor/questions/{q['id']}", json=CHOICE | {"answer": None})
    assert res.status_code == 422
    assert mt.goi("GET", f"/api/editor/lessons/{b['id']}").json()["questions"][0]["answer"] == {"index": 0}


def test_sua_xoa_cau_vua_bi_xoa_tra_404(mt: MoiTruong) -> None:
    """Câu đã có trong phiên nhưng dòng trên CSDL vừa mất (người khác xóa): đọc lại sau khi khóa bài → 404."""
    b = _bai(mt)
    q = _them(mt, b["id"], CHOICE).json()
    mt.db.get(Question, q["id"])  # nạp vào phiên như lúc đọc trước khi khóa
    mt.db.execute(text("DELETE FROM questions WHERE id = :i"), {"i": q["id"]})
    so = _so_nhat_ky(mt)
    for method in ("PUT", "DELETE"):
        res = mt.goi(method, f"/api/editor/questions/{q['id']}", json=CHOICE)
        assert res.status_code == 404 and res.json()["error"]["code"] == "QUESTION_NOT_FOUND"
    assert _so_nhat_ky(mt) == so


# ================================================================ API 59 – xóa
def test_xoa_va_danh_so_lai(mt: MoiTruong) -> None:
    b = _bai(mt)
    ids = [_them(mt, b["id"], CHOICE | {"content": f"Câu {i}"}).json()["id"] for i in range(3)]
    res = mt.goi("DELETE", f"/api/editor/questions/{ids[0]}")
    assert res.status_code == 204
    assert mt.db.get(Question, ids[0]) is None
    ds = mt.goi("GET", f"/api/editor/lessons/{b['id']}").json()["questions"]
    assert [(q["id"], q["sort_order"]) for q in ds] == [(ids[1], 0), (ids[2], 1)]
    dong = kiem_tra_nhat_ky(mt.db, "DELETE_QUESTION", target_id=ids[0])
    assert dong.detail["target_name"].startswith(b["title"])


# ================================================================ API 56 – PART_IN_USE
def test_xoa_bo_phan_dang_la_dap_an_bi_chan(mt: MoiTruong) -> None:
    b = _bai(mt)
    vay, mat = b["parts"]
    q = _them(mt, b["id"], {"question_type": "PICK_PART", "content": "Bấm vào mắt", "answer": {"part_id": mat["id"]}}).json()
    truoc = _tong_nhat_ky(mt)
    res = mt.goi(
        "PUT",
        f"/api/editor/lessons/{b['id']}/parts",
        json={"parts": [{"id": vay["id"], "mesh_names": ["vay_lung"], "label": "Vây lưng"}]},
    )
    assert res.status_code == 409 and res.json()["error"]["code"] == "PART_IN_USE"
    assert res.json()["error"]["details"] == [
        {"question_id": q["id"], "question_no": 1, "content": "Bấm vào mắt", "part_label": "Mắt"}
    ]
    assert _tong_nhat_ky(mt) == truoc  # lỗi thì không ghi nhật ký
    # Giữ bộ phận đó (sửa nhãn, đổi thứ tự) thì vẫn lưu được; xóa câu hỏi rồi thì xóa được bộ phận.
    giu = [
        {"id": mat["id"], "mesh_names": ["mat"], "label": "Mắt cá"},
        {"id": vay["id"], "mesh_names": ["vay_lung"], "label": "Vây lưng"},
    ]
    assert mt.goi("PUT", f"/api/editor/lessons/{b['id']}/parts", json={"parts": giu}).status_code == 200
    assert mt.goi("DELETE", f"/api/editor/questions/{q['id']}").status_code == 204
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}/parts", json={"parts": giu[1:]})
    assert res.status_code == 200
