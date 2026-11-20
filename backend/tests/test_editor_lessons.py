"""API 7 – /api/subjects; API 49–55 – /api/editor/lessons: soạn, xuất bản, gỡ, xóa bài học (UC 20)."""

import unicodedata
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Asset, Assignment, Attempt, Lesson, LessonPart, Question, Subject, SystemLog, User
from tests.conftest import DongHo
from tests.du_lieu import bearer, kiem_tra_nhat_ky, tao_lop, tao_mon, tao_tai_khoan, tao_truong


@dataclass
class MoiTruong:
    client: TestClient
    db: Session
    dong_ho: DongHo
    tk: dict[str, User]
    mon: Subject

    def goi(self, method: str, url: str, user: User | None = None, **kw: Any) -> Response:
        headers = bearer(user or self.tk["bientap"], self.dong_ho.gio)
        return self.client.request(method, url, headers=headers, **kw)

    def bai(self, **kw: Any) -> dict[str, Any]:
        """Dữ liệu bài hợp lệ, ghi đè bằng kw."""
        return {
            "subject_id": self.mon.id,
            "grade": 6,
            "chapter": "Đa dạng thế giới sống",
            "lesson_no": 34,
            "title": "Cá chép – cấu tạo ngoài",
            "lesson_type": "STRUCTURE",
            "book_series": "KNTT",
            "asset_id": None,
            "config": {},
        } | kw

    def tao(self, user: User | None = None, **kw: Any) -> dict[str, Any]:
        res = self.goi("POST", "/api/editor/lessons", user, json=self.bai(**kw))
        assert res.status_code == 201, res.text
        return res.json()

    def mo_hinh(self, ten: str = "Cá chép", source_type: str = "SELF_BUILT", attribution: str | None = None) -> Asset:
        a = Asset(
            name=ten,
            file_path="models/1.v1.glb",
            file_size=1000,
            triangle_count=10,
            mesh_names=["vay_lung", "mat"],
            source_type=source_type,
            attribution=attribution,
        )
        self.db.add(a)
        self.db.flush()
        return a

    def gan_nhan(self, lesson_id: int, n: int = 1) -> None:
        for i in range(n):
            self.db.add(LessonPart(lesson_id=lesson_id, mesh_names=["vay_lung"], label=f"Vây {i}", sort_order=i))
        self.db.flush()

    def du_dieu_kien(self, **kw: Any) -> dict[str, Any]:
        """Bài nháp đủ điều kiện xuất bản."""
        b = self.tao(asset_id=self.mo_hinh().id, **kw)
        self.gan_nhan(b["id"])
        return b

    def giao(self, lesson_id: int, han: timedelta | None) -> Assignment:
        truong = tao_truong(self.db, f"t{uuid.uuid4().hex[:6]}")
        lop = tao_lop(self.db, truong, "6A1")
        due_at = None if han is None else self.dong_ho.gio + han
        # Ngày mở luôn trước hạn nộp (CHECK due_after_open).
        open_at = self.dong_ho.gio - timedelta(days=2) if due_at is None else min(
            self.dong_ho.gio - timedelta(days=2), due_at - timedelta(days=1)
        )
        a = Assignment(class_id=lop.id, lesson_id=lesson_id, open_at=open_at, due_at=due_at)
        self.db.add(a)
        self.db.flush()
        return a

    def so_nhat_ky(self, ma: str) -> int:
        return self.db.scalar(select(func.count()).where(SystemLog.action == ma)) or 0


@pytest.fixture
def mt(client: TestClient, db: Session, dong_ho: DongHo) -> Iterator[MoiTruong]:
    a = tao_truong(db, "truonga")
    tk = {
        "bientap": tao_tai_khoan(db, "bientap", "CONTENT_EDITOR"),
        "sys": tao_tai_khoan(db, "admin", "SYSTEM_ADMIN"),
        "qtt": tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", a),
        "gv": tao_tai_khoan(db, "truonga.gv001", "TEACHER", a, ma="GV001"),
        "hs": tao_tai_khoan(db, "truonga.hs001", "STUDENT", a),
    }
    yield MoiTruong(client, db, dong_ho, tk, tao_mon(db))


# ================================================================ API 7
@pytest.mark.parametrize("vai_tro", ["bientap", "sys", "qtt", "gv", "hs"])
def test_moi_vai_tro_xem_duoc_mon(mt: MoiTruong, vai_tro: str) -> None:
    res = mt.goi("GET", "/api/subjects", mt.tk[vai_tro])
    assert res.status_code == 200, res.text
    mon = next(m for m in res.json() if m["code"] == "KHTN_THU")
    assert mon == {"id": mt.mon.id, "code": "KHTN_THU", "name": "Khoa học tự nhiên", "min_grade": 6, "max_grade": 9}


def test_mon_chua_dang_nhap(mt: MoiTruong) -> None:
    assert mt.client.get("/api/subjects").status_code == 401


# ================================================================ quyền
DUONG_DAN = [
    ("GET", "/api/editor/lessons"),
    ("POST", "/api/editor/lessons"),
    ("GET", "/api/editor/lessons/1"),
    ("PUT", "/api/editor/lessons/1"),
    ("DELETE", "/api/editor/lessons/1"),
    ("POST", "/api/editor/lessons/1/publish"),
    ("POST", "/api/editor/lessons/1/unpublish"),
    ("PUT", "/api/editor/lessons/1/parts"),
]


@pytest.mark.parametrize("vai_tro", ["qtt", "gv", "hs"])
@pytest.mark.parametrize("method,url", DUONG_DAN)
def test_vai_tro_khac_bi_cam(mt: MoiTruong, vai_tro: str, method: str, url: str) -> None:
    res = mt.goi(method, url, mt.tk[vai_tro], json=mt.bai())
    assert res.status_code == 403 and res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.parametrize("method,url", DUONG_DAN)
def test_chua_dang_nhap(mt: MoiTruong, method: str, url: str) -> None:
    assert mt.client.request(method, url, json=mt.bai()).status_code == 401


@pytest.mark.parametrize("method,url", DUONG_DAN[2:])
def test_bai_khong_co(mt: MoiTruong, method: str, url: str) -> None:
    res = mt.goi(method, url.replace("/1", "/999999"), json=mt.bai() | {"parts": []})
    assert res.status_code == 404 and res.json()["error"]["code"] == "LESSON_NOT_FOUND"
    assert mt.db.scalar(select(func.count()).select_from(SystemLog).where(SystemLog.action.like("%LESSON%"))) == 0


# ================================================================ API 50 – tạo
def test_tao_bai_nhap(mt: MoiTruong) -> None:
    asset = mt.mo_hinh()
    res = mt.goi(
        "POST",
        "/api/editor/lessons",
        json=mt.bai(title="  Cá chép – cấu tạo ngoài ", asset_id=asset.id, config={"camera_tong_quan": {"position": [1, 2, 3], "target": [0, 0, 0]}}),
    )
    assert res.status_code == 201, res.text
    b = res.json()
    assert b["status"] == "DRAFT" and b["title"] == "Cá chép – cấu tạo ngoài"
    assert b["subject"] == {"id": mt.mon.id, "code": "KHTN_THU", "name": "Khoa học tự nhiên"}
    assert b["book_series"] == "KNTT" and b["grade"] == 6 and b["lesson_no"] == 34
    assert b["asset"]["id"] == asset.id and b["asset"]["file_url"] == "/content/models/1.v1.glb"
    assert b["asset"]["mesh_names"] == ["vay_lung", "mat"]
    assert b["config"] == {"camera_tong_quan": {"position": [1, 2, 3], "target": [0, 0, 0]}}
    assert b["parts"] == [] and b["questions"] == []
    assert b["created_by_name"] == mt.tk["bientap"].full_name and b["published_at"] is None
    assert b["missing_for_publish"] == ["Chưa gắn nhãn bộ phận nào"]
    lesson = mt.db.get(Lesson, b["id"])
    assert lesson is not None and lesson.created_by == mt.tk["bientap"].id
    dong = kiem_tra_nhat_ky(mt.db, "CREATE_LESSON", user_id=mt.tk["bientap"].id, target_type="lesson", target_id=b["id"])
    assert dong.detail["target_name"] == "Cá chép – cấu tạo ngoài"


def test_quan_tri_he_thong_tao_duoc(mt: MoiTruong) -> None:
    b = mt.tao(mt.tk["sys"], asset_id=None)
    assert b["missing_for_publish"] == ["Chưa chọn mô hình 3D", "Chưa gắn nhãn bộ phận nào"]
    kiem_tra_nhat_ky(mt.db, "CREATE_LESSON", user_id=mt.tk["sys"].id, target_id=b["id"])


def test_tao_khong_nhan_trang_thai_gui_len(mt: MoiTruong) -> None:
    b = mt.tao(status="PUBLISHED", published_at="2026-01-01T00:00:00Z", created_by=999)
    assert b["status"] == "DRAFT" and b["published_at"] is None


@pytest.mark.parametrize(
    "sua,truong",
    [
        ({"title": "   "}, "title"),
        ({"title": "x" * 301}, "title"),
        ({"grade": 0}, "grade"),
        ({"grade": 13}, "grade"),
        ({"lesson_no": 0}, "lesson_no"),
        ({"lesson_no": 40000}, "lesson_no"),
        ({"lesson_type": "VIDEO"}, "lesson_type"),
        ({"subject_id": None}, "subject_id"),
        ({"config": [1, 2]}, "config"),
        ({"asset_id": 2147483648}, "asset_id"),
    ],
)
def test_tao_du_lieu_sai(mt: MoiTruong, sua: dict[str, Any], truong: str) -> None:
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(**sua))
    assert res.status_code == 422, res.text
    assert truong in [d["field"] for d in res.json()["error"]["details"]]
    assert mt.so_nhat_ky("CREATE_LESSON") == 0


def test_tao_mon_mo_hinh_khong_ton_tai(mt: MoiTruong) -> None:
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(subject_id=999999, asset_id=999999))
    assert res.status_code == 422
    assert {d["field"] for d in res.json()["error"]["details"]} == {"subject_id", "asset_id"}
    assert mt.so_nhat_ky("CREATE_LESSON") == 0


def test_tao_lop_ngoai_khoang_cua_mon(mt: MoiTruong) -> None:
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(grade=10))
    assert res.status_code == 422
    assert res.json()["error"]["details"] == [
        {"field": "grade", "message": "Môn Khoa học tự nhiên chỉ có từ lớp 6 đến lớp 9, hãy chọn lại lớp"}
    ]


def test_tao_trung_bai_hoi_lai(mt: MoiTruong) -> None:
    dau = mt.tao()
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(title="Cá chép bản 2"))
    assert res.status_code == 409, res.text
    err = res.json()["error"]
    assert err["code"] == "DUPLICATE_LESSON"
    assert err["details"] == [{"id": dau["id"], "title": "Cá chép – cấu tạo ngoài", "status": "DRAFT"}]
    assert mt.so_nhat_ky("CREATE_LESSON") == 1
    # Xác nhận thì lưu.
    assert mt.goi("POST", "/api/editor/lessons", json=mt.bai(confirm_duplicate=True)).status_code == 201


@pytest.mark.parametrize("sua", [{"lesson_no": 35}, {"grade": 7}, {"book_series": "CTST"}, {"lesson_no": None}])
def test_khac_khoa_khong_tinh_trung(mt: MoiTruong, sua: dict[str, Any]) -> None:
    mt.tao()
    assert mt.goi("POST", "/api/editor/lessons", json=mt.bai(**sua)).status_code == 201


# ================================================================ API 49 – danh sách
def test_danh_sach_loc_va_phan_trang(mt: MoiTruong) -> None:
    nhap = mt.tao(title="Cá chép – cấu tạo ngoài", lesson_no=1)
    xb = mt.du_dieu_kien(title="Tim người", grade=8, lesson_no=2, chapter="Cơ thể người")
    assert mt.goi("POST", f"/api/editor/lessons/{xb['id']}/publish").status_code == 200
    mt.db.add(Question(lesson_id=xb["id"], question_type="CHOICE", content="?", answer=[0]))
    mt.db.flush()

    res = mt.goi("GET", "/api/editor/lessons")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2 and body["page"] == 1 and body["page_size"] == 20
    dong = {d["id"]: d for d in body["items"]}
    assert dong[xb["id"]] == {
        "id": xb["id"],
        "title": "Tim người",
        "subject": {"id": mt.mon.id, "code": "KHTN_THU", "name": "Khoa học tự nhiên"},
        "grade": 8,
        "book_series": "KNTT",
        "chapter": "Cơ thể người",
        "lesson_no": 2,
        "lesson_type": "STRUCTURE",
        "status": "PUBLISHED",
        "asset_id": xb["asset"]["id"],
        "asset_name": "Cá chép",
        "part_count": 1,
        "question_count": 1,
        "created_by_name": mt.tk["bientap"].full_name,
        "updated_at": dong[xb["id"]]["updated_at"],
        "published_at": "2026-11-18T07:00:00Z",
    }
    assert dong[xb["id"]]["part_count"] == 1 and dong[xb["id"]]["question_count"] == 1
    assert dong[xb["id"]]["asset_name"] == "Cá chép"
    assert dong[nhap["id"]]["asset_id"] is None and dong[nhap["id"]]["part_count"] == 0
    assert "config" not in dong[nhap["id"]]

    def ids(**params: Any) -> list[int]:
        return [d["id"] for d in mt.goi("GET", "/api/editor/lessons", params=params).json()["items"]]

    assert ids(status="DRAFT") == [nhap["id"]]
    assert ids(status="PUBLISHED") == [xb["id"]]
    assert ids(grade=8) == [xb["id"]]
    assert ids(subject_id=mt.mon.id, q="CƠ THỂ") == [xb["id"]]  # tìm cả trong chương
    assert ids(q="%") == [] and ids(q="_") == [] and ids(q="\\") == []
    p2 = mt.goi("GET", "/api/editor/lessons", params={"page": 2, "page_size": 1}).json()
    assert p2["total"] == 2 and len(p2["items"]) == 1


@pytest.mark.parametrize(
    "params", [{"status": "ARCHIVED"}, {"page": 0}, {"page_size": 101}, {"grade": 13}, {"q": "x" * 201}]
)
def test_danh_sach_tham_so_sai(mt: MoiTruong, params: dict[str, Any]) -> None:
    assert mt.goi("GET", "/api/editor/lessons", params=params).status_code == 422


# ================================================================ API 51 – chi tiết
def test_chi_tiet_kem_nhan_va_cau_hoi_co_dap_an(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien(config={"thi_nghiem": {"cong_thuc": "Vb = Ca * Va / Cb", "sai_so": 0.05}})
    mt.db.add(Question(lesson_id=b["id"], question_type="NUMERIC", content="Vb?", answer={"value": 12.5}, tolerance=0.1))
    mt.db.flush()
    res = mt.goi("GET", f"/api/editor/lessons/{b['id']}", mt.tk["sys"])
    assert res.status_code == 200
    body = res.json()
    assert body["config"] == {"thi_nghiem": {"cong_thuc": "Vb = Ca * Va / Cb", "sai_so": 0.05}}
    assert body["parts"][0] | {"id": 0} == {
        "id": 0, "mesh_names": ["vay_lung"], "label": "Vây 0", "description": None, "camera_view": None, "sort_order": 0
    }
    assert body["questions"][0]["answer"] == {"value": 12.5} and body["questions"][0]["tolerance"] == "0.1"
    assert body["missing_for_publish"] == []


# ================================================================ API 52 – sửa
def test_sua_bai_ghi_truong_da_doi(mt: MoiTruong) -> None:
    b = mt.tao()
    mt.dong_ho.tua(hours=1)
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(title="Cá chép – bài 34", config={"kich_ban_phim": [1]}))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["title"] == "Cá chép – bài 34" and body["config"] == {"kich_ban_phim": [1]}
    assert body["updated_at"].startswith("2026-11-18T08:00")
    dong = kiem_tra_nhat_ky(mt.db, "UPDATE_LESSON", target_id=b["id"])
    assert dong.detail["changed_fields"] == ["title", "config"]
    assert "Vb" not in str(dong.detail)


def test_sua_khong_doi_gi_khong_ghi_nhat_ky(mt: MoiTruong) -> None:
    b = mt.tao()
    assert mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai()).status_code == 200
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0


def test_sua_bai_da_xac_nhan_trung_khong_hoi_lai(mt: MoiTruong) -> None:
    mt.tao()
    b2 = mt.tao(confirm_duplicate=True, title="Bản 2")
    res = mt.goi("PUT", f"/api/editor/lessons/{b2['id']}", json=mt.bai(title="Bản 2 – sửa"))
    assert res.status_code == 200, res.text


def test_sua_thanh_trung_thi_hoi(mt: MoiTruong) -> None:
    mt.tao()
    b2 = mt.tao(lesson_no=35)
    res = mt.goi("PUT", f"/api/editor/lessons/{b2['id']}", json=mt.bai(lesson_no=34))
    assert res.status_code == 409 and res.json()["error"]["code"] == "DUPLICATE_LESSON"
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0
    # Tự trùng với chính nó thì không tính.
    assert mt.goi("PUT", f"/api/editor/lessons/{b2['id']}", json=mt.bai(lesson_no=35, title="x")).status_code == 200


def test_sua_bai_da_xuat_ban_duoc(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(chapter="Chương mới", asset_id=b["asset"]["id"]))
    assert res.status_code == 200 and res.json()["status"] == "PUBLISHED"


def test_sua_bai_da_xuat_ban_bo_mo_hinh_bi_chan(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(asset_id=None))
    assert res.status_code == 400
    err = res.json()["error"]
    assert err["code"] == "LESSON_INCOMPLETE" and err["details"] == ["Chưa chọn mô hình 3D"]
    assert mt.db.get(Lesson, b["id"]).asset_id == b["asset"]["id"]  # type: ignore[union-attr]
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0


@pytest.mark.parametrize("sua", [{"grade": 20}, {"asset_id": 999999}, {"subject_id": 999999}])
def test_sua_du_lieu_sai(mt: MoiTruong, sua: dict[str, Any]) -> None:
    b = mt.tao()
    assert mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(**sua)).status_code == 422
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0


@pytest.mark.parametrize("bo", ["config", "asset_id", "chapter", "lesson_no", "book_series"])
def test_sua_thieu_truong_khong_xoa_ngam(mt: MoiTruong, bo: str) -> None:
    b = mt.tao(config={"thi_nghiem": {"cong_thuc": "Vb = Ca * Va / Cb"}})
    du_lieu = mt.bai()
    del du_lieu[bo]
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=du_lieu)
    assert res.status_code == 422 and bo in [d["field"] for d in res.json()["error"]["details"]]
    assert mt.db.get(Lesson, b["id"]).config == {"thi_nghiem": {"cong_thuc": "Vb = Ca * Va / Cb"}}  # type: ignore[union-attr]


@pytest.mark.parametrize(
    "config,truong",
    [
        ({"camera_view": {"position": [0, 0, 1], "target": [0, 0, 0]}}, "config.camera_view"),  # khóa cũ
        ({"formula": "x"}, "config.formula"),
        ({"camera_tong_quan": {"position": [0, 0], "target": [0, 0, 0]}}, "config.camera_tong_quan.position.2"),
        ({"camera_tong_quan": {"position": [0, 0, 1], "target": [0, 0, 0], "zoom": 1}}, "config.camera_tong_quan.zoom"),
        ({"kich_ban_phim": {"a": 1}}, "config.kich_ban_phim"),
        ({"thi_nghiem": [1]}, "config.thi_nghiem"),
    ],
)
def test_config_chi_nhan_3_khoa(mt: MoiTruong, config: dict[str, Any], truong: str) -> None:
    """Khung config đã chốt: `camera_tong_quan`, `kich_ban_phim`, `thi_nghiem`; khóa lạ hay sai dạng → 422 (API 50, 52)."""
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(config=config))
    assert res.status_code == 422, res.text
    assert truong in [d["field"] for d in res.json()["error"]["details"]]
    b = mt.tao(lesson_no=40)
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(lesson_no=40, config=config))
    assert res.status_code == 422 and mt.so_nhat_ky("UPDATE_LESSON") == 0


def test_config_bo_khoa_null_va_luu_goc_tong_quan(mt: MoiTruong) -> None:
    b = mt.tao(config={"camera_tong_quan": None, "kich_ban_phim": None, "thi_nghiem": None})
    assert b["config"] == {}
    goc = {"position": [0.5, 1, 4], "target": [0, 0.25, 0]}
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(config={"camera_tong_quan": goc}))
    assert res.status_code == 200 and res.json()["config"] == {"camera_tong_quan": goc}
    assert kiem_tra_nhat_ky(mt.db, "UPDATE_LESSON", target_id=b["id"]).detail["changed_fields"] == ["config"]


def test_bai_cu_config_null_luu_rong_khong_tinh_la_doi(mt: MoiTruong) -> None:
    b = mt.tao()
    bai = mt.db.get(Lesson, b["id"])
    assert bai is not None
    bai.config = None
    mt.db.flush()
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai())
    assert res.status_code == 200 and res.json()["config"] == {}
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0


def test_config_qua_lon(mt: MoiTruong) -> None:
    res = mt.goi("POST", "/api/editor/lessons", json=mt.bai(config={"thi_nghiem": {"x": "a" * (1024 * 1024)}}))
    assert res.status_code == 422
    assert res.json()["error"]["details"] == [
        {"field": "config", "message": "Cấu hình bài quá lớn (tối đa 1 MB), hãy rút gọn"}
    ]


def test_doi_mon_thanh_trung_thi_hoi(mt: MoiTruong) -> None:
    mon2 = tao_mon(mt.db, "KHTN_HAI")
    mt.tao(subject_id=mon2.id)
    b = mt.tao()  # cùng lớp, số bài nhưng khác môn
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(subject_id=mon2.id))
    assert res.status_code == 409 and res.json()["error"]["code"] == "DUPLICATE_LESSON"


def test_sua_bai_da_xuat_ban_sang_mo_hinh_thieu_ghi_cong(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    cc = mt.mo_hinh(ten="Tim", source_type="CC_BY_SA", attribution=" ")
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}", json=mt.bai(asset_id=cc.id))
    assert res.status_code == 400 and res.json()["error"]["code"] == "LESSON_INCOMPLETE"
    assert mt.so_nhat_ky("UPDATE_LESSON") == 0


# ================================================================ API 54 – xuất bản
def test_xuat_ban(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.dong_ho.tua(minutes=5)
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish", mt.tk["sys"])
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "PUBLISHED" and body["published_by_name"] == mt.tk["sys"].full_name
    assert body["published_at"].startswith("2026-11-18T07:05")
    kiem_tra_nhat_ky(mt.db, "PUBLISH_LESSON", user_id=mt.tk["sys"].id, target_type="lesson", target_id=b["id"])
    # Bấm lần hai: không đổi, không ghi thêm nhật ký.
    assert mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish").status_code == 200
    assert mt.so_nhat_ky("PUBLISH_LESSON") == 1


def test_xuat_ban_thieu_dieu_kien(mt: MoiTruong) -> None:
    b = mt.tao()
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    assert res.status_code == 400
    err = res.json()["error"]
    assert err["code"] == "LESSON_INCOMPLETE"
    assert err["details"] == ["Chưa chọn mô hình 3D", "Chưa gắn nhãn bộ phận nào"]
    assert mt.db.get(Lesson, b["id"]).status == "DRAFT"  # type: ignore[union-attr]
    assert mt.so_nhat_ky("PUBLISH_LESSON") == 0


def test_xuat_ban_thieu_ghi_cong(mt: MoiTruong) -> None:
    # CSDL chặn CC BY không có ghi công; dòng ghi công toàn khoảng trắng vẫn lọt CHECK nên service phải kiểm tra.
    a = mt.mo_hinh(source_type="CC_BY", attribution="   ")
    b = mt.tao(asset_id=a.id)
    mt.gan_nhan(b["id"])
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    assert res.status_code == 400
    assert res.json()["error"]["details"] == ["Mô hình theo giấy phép CC BY / CC BY-SA chưa có dòng ghi công tác giả"]


# ================================================================ API 55 – gỡ xuất bản
def test_go_xuat_ban(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "DRAFT"
    assert body["published_at"] is not None  # giữ "xuất bản lần gần nhất"
    kiem_tra_nhat_ky(mt.db, "UNPUBLISH_LESSON", target_id=b["id"])
    # Bài nháp gỡ lần nữa: không đổi, không ghi nhật ký.
    assert mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish").status_code == 200
    assert mt.so_nhat_ky("UNPUBLISH_LESSON") == 1


def test_go_bai_dang_giao_con_han_hoi_lai(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    giao = mt.giao(b["id"], timedelta(days=3))
    mt.giao(b["id"], timedelta(days=-1))  # đã hết hạn: không tính

    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish")
    assert res.status_code == 409, res.text
    err = res.json()["error"]
    assert err["code"] == "LESSON_ASSIGNED" and "1 lớp" in err["message"]
    assert err["details"] == [{"assignment_id": giao.id, "class_name": "6A1", "due_at": "2026-11-21T07:00:00Z"}]
    assert mt.db.get(Lesson, b["id"]).status == "PUBLISHED"  # type: ignore[union-attr]
    assert mt.so_nhat_ky("UNPUBLISH_LESSON") == 0

    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish", json={"confirm": True})
    assert res.status_code == 200 and res.json()["status"] == "DRAFT"
    dong = kiem_tra_nhat_ky(mt.db, "UNPUBLISH_LESSON", target_id=b["id"])
    assert dong.detail["active_assignment_count"] == 1


def test_go_xuat_ban_than_sai_kieu(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish", json={"confirm": "abc"})
    assert res.status_code == 422


def test_go_bai_giao_khong_han_cung_hoi(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    mt.giao(b["id"], None)
    res = mt.goi("POST", f"/api/editor/lessons/{b['id']}/unpublish", json={"confirm": False})
    assert res.status_code == 409 and res.json()["error"]["details"][0]["due_at"] is None


# ================================================================ API 53 – xóa
def test_xoa_bai_kem_nhan_va_cau_hoi(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.db.add(Question(lesson_id=b["id"], question_type="CHOICE", content="?", answer=[0]))
    mt.db.flush()
    res = mt.goi("DELETE", f"/api/editor/lessons/{b['id']}")
    assert res.status_code == 204 and res.content == b""
    assert mt.db.get(Lesson, b["id"]) is None
    assert mt.db.scalar(select(func.count()).select_from(LessonPart)) == 0
    assert mt.db.scalar(select(func.count()).select_from(Question)) == 0
    dong = kiem_tra_nhat_ky(mt.db, "DELETE_LESSON", target_type="lesson", target_id=b["id"])
    assert dong.detail["target_name"] == "Cá chép – cấu tạo ngoài"


def test_xoa_bai_da_xuat_ban_chua_giao_duoc(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish")
    assert mt.goi("DELETE", f"/api/editor/lessons/{b['id']}", mt.tk["sys"]).status_code == 204


def test_xoa_bai_da_giao_bi_chan(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.giao(b["id"], timedelta(days=-10))  # kể cả bài giao đã hết hạn
    res = mt.goi("DELETE", f"/api/editor/lessons/{b['id']}")
    assert res.status_code == 409
    err = res.json()["error"]
    assert err["code"] == "LESSON_IN_USE" and err["details"] == {"assignment_count": 1, "attempt_count": 0}
    assert mt.db.get(Lesson, b["id"]) is not None and mt.so_nhat_ky("DELETE_LESSON") == 0


def test_xoa_bai_da_co_bai_nop_bi_chan(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    mt.db.add(
        Attempt(
            client_id=uuid.uuid4(),
            student_id=mt.tk["hs"].id,
            lesson_id=b["id"],
            attempt_type="QUIZ",
            submitted_at=mt.dong_ho.gio,
        )
    )
    mt.db.flush()
    res = mt.goi("DELETE", f"/api/editor/lessons/{b['id']}")
    assert res.status_code == 409 and res.json()["error"]["details"] == {"assignment_count": 0, "attempt_count": 1}
    assert mt.so_nhat_ky("DELETE_LESSON") == 0


# ================================================================ API 56 – nhãn bộ phận
GOC = {"position": [1.5, 0.25, 4], "target": [0, 0, 0]}


def _bo_phan(**kw: Any) -> dict[str, Any]:
    return {
        "mesh_names": ["vay_lung"],
        "label": "Vây lưng",
        "description": "Giúp cá giữ thăng bằng.",
        "camera_view": GOC,
    } | kw


def _luu(mt: MoiTruong, lesson_id: int, parts: list[dict[str, Any]], user: User | None = None) -> Response:
    return mt.goi("PUT", f"/api/editor/lessons/{lesson_id}/parts", user, json={"parts": parts})


def _nhat_ky_cuoi(mt: MoiTruong) -> SystemLog:
    dong = mt.db.scalars(
        select(SystemLog).where(SystemLog.action == "UPDATE_LESSON_PARTS").order_by(SystemLog.id.desc())
    ).first()
    assert dong is not None
    return dong


def test_gan_nhan_lan_dau(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    mt.dong_ho.gio += timedelta(minutes=5)
    mat = _bo_phan(mesh_names=["mat"], label="Mắt", description="  ", camera_view=None)
    res = _luu(mt, b["id"], [_bo_phan(), mat])
    assert res.status_code == 200, res.text
    body = res.json()
    assert [(p["label"], p["mesh_names"], p["sort_order"]) for p in body["parts"]] == [
        ("Vây lưng", ["vay_lung"], 0),
        ("Mắt", ["mat"], 1),
    ]
    assert body["parts"][0]["camera_view"] == {"position": [1.5, 0.25, 4.0], "target": [0.0, 0.0, 0.0]}
    assert body["parts"][1]["description"] is None and body["parts"][1]["camera_view"] is None
    assert body["updated_at"] != b["updated_at"]
    assert "Chưa gắn nhãn bộ phận nào" not in body["missing_for_publish"]
    dong = kiem_tra_nhat_ky(mt.db, "UPDATE_LESSON_PARTS", target_id=b["id"], user_id=mt.tk["bientap"].id)
    assert dong.detail["part_count"] == 2 and dong.detail["added_count"] == 2 and dong.detail["removed_count"] == 0
    assert "Vây lưng" not in str(dong.detail)


def test_quan_tri_he_thong_gan_nhan_duoc(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    assert _luu(mt, b["id"], [_bo_phan()], mt.tk["sys"]).status_code == 200


def test_gop_nhieu_mesh_vao_mot_nhan(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(mesh_names=["mat", "vay_lung"], label="Cả hai")])
    assert res.status_code == 200 and res.json()["parts"][0]["mesh_names"] == ["mat", "vay_lung"]


def test_sua_giu_id_xoa_bo_phan_khong_gui_va_doi_thu_tu(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    dau = _luu(mt, b["id"], [_bo_phan(), _bo_phan(mesh_names=["mat"], label="Mắt")]).json()["parts"]
    id_vay, id_mat = dau[0]["id"], dau[1]["id"]
    # Đảo thứ tự, sửa nhãn "Mắt"; bỏ "Vây lưng" rồi thêm lại thành bộ phận mới (không id).
    res = _luu(mt, b["id"], [_bo_phan(id=id_mat, mesh_names=["mat"], label="Mắt cá"), _bo_phan()])
    assert res.status_code == 200, res.text
    sau = res.json()["parts"]
    assert sau[0]["id"] == id_mat and sau[0]["label"] == "Mắt cá" and sau[0]["sort_order"] == 0
    assert sau[1]["id"] != id_vay and sau[1]["sort_order"] == 1
    assert mt.db.get(LessonPart, id_vay) is None
    dong = _nhat_ky_cuoi(mt)
    assert dong.detail["changed_fields"] == ["label", "sort_order"]
    assert dong.detail["added_count"] == 1 and dong.detail["removed_count"] == 1


def test_luu_lai_khong_doi_gi_khong_ghi_nhat_ky(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    dau = _luu(mt, b["id"], [_bo_phan()]).json()
    mt.dong_ho.gio += timedelta(minutes=5)
    res = _luu(mt, b["id"], [_bo_phan(id=dau["parts"][0]["id"])])
    assert res.status_code == 200 and res.json()["updated_at"] == dau["updated_at"]
    assert mt.so_nhat_ky("UPDATE_LESSON_PARTS") == 1


def test_xoa_het_nhan_bai_nhap(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    res = _luu(mt, b["id"], [])
    assert res.status_code == 200 and res.json()["parts"] == []
    assert "Chưa gắn nhãn bộ phận nào" in res.json()["missing_for_publish"]
    assert kiem_tra_nhat_ky(mt.db, "UPDATE_LESSON_PARTS", target_id=b["id"]).detail["removed_count"] == 1


def test_xoa_het_nhan_bai_da_xuat_ban_bi_chan(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    assert mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish").status_code == 200
    res = _luu(mt, b["id"], [])
    assert res.status_code == 400 and res.json()["error"]["code"] == "LESSON_INCOMPLETE"
    assert mt.so_nhat_ky("UPDATE_LESSON_PARTS") == 0


def test_bai_da_xuat_ban_sua_nhan_duoc(mt: MoiTruong) -> None:
    b = mt.du_dieu_kien()
    assert mt.goi("POST", f"/api/editor/lessons/{b['id']}/publish").status_code == 200
    res = _luu(mt, b["id"], [_bo_phan(label="Vây lưng mới")])
    assert res.status_code == 200 and res.json()["status"] == "PUBLISHED"


def test_bai_chua_co_mo_hinh(mt: MoiTruong) -> None:
    b = mt.tao()
    res = _luu(mt, b["id"], [_bo_phan()])
    assert res.status_code == 400 and res.json()["error"]["code"] == "LESSON_NO_ASSET"
    # Danh sách rỗng vẫn lưu được (xóa nhãn cũ sau khi bỏ mô hình).
    assert _luu(mt, b["id"], []).status_code == 200
    assert mt.so_nhat_ky("UPDATE_LESSON_PARTS") == 0


def test_mesh_khong_co_trong_mo_hinh(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(mesh_names=["vay_lung", "duoi_bi_mat"])])
    assert res.status_code == 422
    loi = res.json()["error"]["details"]
    assert [x["field"] for x in loi] == ["parts.0.mesh_names.1"]
    assert "duoi_bi_mat" not in res.text
    assert mt.so_nhat_ky("UPDATE_LESSON_PARTS") == 0


def test_mot_mesh_hai_bo_phan(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(), _bo_phan(label="Khác")])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.1.mesh_names.0"
    res = _luu(mt, b["id"], [_bo_phan(mesh_names=["mat", "mat"])])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.0.mesh_names.1"


def test_nhan_trung(mt: MoiTruong) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(), _bo_phan(mesh_names=["mat"], label="  VÂY LƯNG ")])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.1.label"
    # Cùng chữ nhưng gõ dạng tổ hợp (NFD) vẫn là trùng; lưu dạng NFC.
    to_hop = unicodedata.normalize("NFD", "Vây lưng")
    res = _luu(mt, b["id"], [_bo_phan(), _bo_phan(mesh_names=["mat"], label=to_hop)])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.1.label"
    res = _luu(mt, b["id"], [_bo_phan(label=to_hop)])
    assert res.status_code == 200 and res.json()["parts"][0]["label"] == "Vây lưng"
    # Nhãn 100 ký tự gõ dạng tổ hợp (dài hơn 100 trước khi chuẩn hóa) vẫn hợp lệ.
    dai = unicodedata.normalize("NFD", "â" * 100)
    assert len(dai) == 200 and _luu(mt, b["id"], [_bo_phan(label=dai)]).status_code == 200


def test_id_cua_bai_khac_hoac_lap(mt: MoiTruong) -> None:
    khac = mt.tao(asset_id=mt.mo_hinh().id, lesson_no=35)
    id_khac = _luu(mt, khac["id"], [_bo_phan()]).json()["parts"][0]["id"]
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(id=id_khac)])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.0.id"
    assert mt.db.get(LessonPart, id_khac) is not None
    id_b = _luu(mt, b["id"], [_bo_phan()]).json()["parts"][0]["id"]
    res = _luu(mt, b["id"], [_bo_phan(id=id_b), _bo_phan(id=id_b, mesh_names=["mat"], label="Mắt")])
    assert res.status_code == 422 and res.json()["error"]["details"][0]["field"] == "parts.1.id"


@pytest.mark.parametrize(
    "sua",
    [
        {"label": ""},
        {"label": "   "},
        {"label": "x" * 101},
        {"description": "x" * 1001},
        {"mesh_names": []},
        {"mesh_names": [""]},
        {"mesh_names": "vay_lung"},
        {"camera_view": {"position": [0, 0], "target": [0, 0, 0]}},
        {"camera_view": {"position": [0, 0, "NaN"], "target": [0, 0, 0]}},
        {"camera_view": {"position": [0, 0, 1e9], "target": [0, 0, 0]}},
        {"camera_view": {"position": [0, 0, 1], "target": [0, 0, 0], "zoom": 2}},
        {"camera_view": {"position": [0, 0, 1]}},
        {"id": 0},
    ],
)
def test_bo_phan_sai_du_lieu(mt: MoiTruong, sua: dict[str, Any]) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = _luu(mt, b["id"], [_bo_phan(**sua)])
    assert res.status_code == 422 and res.json()["error"]["code"] == "VALIDATION_ERROR", res.text


@pytest.mark.parametrize("than", [{}, {"parts": None}, [], {"parts": [_bo_phan()] * 201}])
def test_than_sai(mt: MoiTruong, than: Any) -> None:
    b = mt.tao(asset_id=mt.mo_hinh().id)
    res = mt.goi("PUT", f"/api/editor/lessons/{b['id']}/parts", json=than)
    assert res.status_code == 422
