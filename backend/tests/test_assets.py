"""API 45–48 – /api/assets: danh sách, nạp GLB (kiểm tra tự động), chi tiết, xóa (UC 21, Bảng 3-11)."""

from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.main import app
from app.models import Asset, Lesson, Subject, SystemLog, User
from app.services import assets as assets_service
from app.services import nhat_ky
from tests.conftest import DongHo
from tests.du_lieu import bearer, kiem_tra_nhat_ky, tao_mon, tao_tai_khoan, tao_truong
from tests.glb_mau import gltf_co_anh, gltf_mau, png, tao_glb

GLB_TOT = tao_glb(gltf_mau(ten_node=["Vay_lung", "Mang", None], so_chi_so=30))


@dataclass
class MoiTruong:
    client: TestClient
    db: Session
    dong_ho: DongHo
    noi_dung: Path
    tk: dict[str, User]

    def nap(self, user: User | None, du_lieu: bytes = GLB_TOT, **form: Any) -> Response:
        data = {"name": "Cá chép", "source_type": "SELF_BUILT"} | {k: str(v) for k, v in form.items()}
        headers = bearer(user, self.dong_ho.gio) if user else {}
        return self.client.post(
            "/api/assets", headers=headers, data=data, files={"file": ("ca-chep.glb", du_lieu, "model/gltf-binary")}
        )

    def file_trong(self, thu_muc: str) -> list[str]:
        p = self.noi_dung / thu_muc
        return sorted(x.name for x in p.iterdir()) if p.exists() else []

    def so_mo_hinh(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Asset)) or 0

    def so_nhat_ky(self) -> int:
        return self.db.scalar(select(func.count()).where(SystemLog.action == "UPLOAD_ASSET")) or 0


@pytest.fixture
def mt(client: TestClient, db: Session, dong_ho: DongHo, tmp_path: Path) -> Iterator[MoiTruong]:
    """Thư mục nội dung tạm cho mỗi test (không ghi vào volume thật) và các tài khoản mỗi vai trò."""
    settings = get_settings().model_copy(update={"content_dir": tmp_path / "content"})
    app.dependency_overrides[get_settings] = lambda: settings
    a = tao_truong(db, "truonga")
    tk = {
        "bientap": tao_tai_khoan(db, "bientap", "CONTENT_EDITOR"),
        "sys": tao_tai_khoan(db, "admin", "SYSTEM_ADMIN"),
        "qtt": tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", a),
        "gv": tao_tai_khoan(db, "truonga.gv001", "TEACHER", a, ma="GV001"),
        "hs": tao_tai_khoan(db, "truonga.hs001", "STUDENT", a),
    }
    yield MoiTruong(client, db, dong_ho, tmp_path / "content", tk)


def gltf_tam_giac(so_tam_giac: int) -> bytes:
    return tao_glb(gltf_mau(so_chi_so=so_tam_giac * 3))


def gltf_texture(canh: int) -> bytes:
    gltf, bin_ = gltf_co_anh(png(canh, 16))
    return tao_glb(gltf, bin_)


# ---------------------------------------------------------------- thành công
def test_bien_tap_vien_nap_thanh_cong(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], name="  Cá chép – cấu tạo ngoài  ")

    assert res.status_code == 201, res.text
    body = res.json()
    assert body == {
        "id": body["id"],
        "file_size": len(GLB_TOT),
        "triangle_count": 30,  # 3 node dùng chung một mesh 10 tam giác
        "max_texture_px": None,
        "mesh_names": ["Vay_lung", "Mang"],
        "unnamed_meshes": 1,
        "warnings": [],
    }
    asset = mt.db.get(Asset, body["id"])
    assert asset is not None
    assert asset.name == "Cá chép – cấu tạo ngoài"
    assert asset.file_path == f"models/{body['id']}.v1.glb"
    assert asset.mesh_names == ["Vay_lung", "Mang"]
    assert asset.uploaded_by == mt.tk["bientap"].id
    assert asset.source_type == "SELF_BUILT" and asset.attribution is None
    # File nằm đúng chỗ Nginx phục vụ, nội dung y nguyên; không còn file tạm.
    assert (mt.noi_dung / asset.file_path).read_bytes() == GLB_TOT
    assert mt.file_trong("tmp") == []
    dong = kiem_tra_nhat_ky(
        mt.db, "UPLOAD_ASSET", user_id=mt.tk["bientap"].id, target_type="asset", target_id=asset.id, school_id=None
    )
    assert dong.detail["target_name"] == "Cá chép – cấu tạo ngoài"


def test_quan_tri_he_thong_nap_duoc(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["sys"])
    assert res.status_code == 201, res.text
    kiem_tra_nhat_ky(mt.db, "UPLOAD_ASSET", user_id=mt.tk["sys"].id, target_id=res.json()["id"])


@pytest.mark.parametrize("nguon", ["CC_BY", "CC_BY_SA"])
def test_giay_phep_cc_by_luu_dong_ghi_cong(mt: MoiTruong, nguon: str) -> None:
    res = mt.nap(mt.tk["bientap"], source_type=nguon, attribution="  Tác giả: Nguyễn Văn A (CC BY 4.0) ")
    assert res.status_code == 201, res.text
    asset = mt.db.get(Asset, res.json()["id"])
    assert asset is not None and asset.attribution == "Tác giả: Nguyễn Văn A (CC BY 4.0)"


def test_ghi_cong_rong_voi_nguon_khac_luu_null(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], source_type="CC0", attribution="   ")
    assert res.status_code == 201, res.text
    assert mt.db.get(Asset, res.json()["id"]).attribution is None  # type: ignore[union-attr]


def test_hai_lan_nap_hai_file_rieng(mt: MoiTruong) -> None:
    id1 = mt.nap(mt.tk["bientap"]).json()["id"]
    id2 = mt.nap(mt.tk["bientap"]).json()["id"]
    assert mt.file_trong("models") == sorted([f"{id1}.v1.glb", f"{id2}.v1.glb"])


# ---------------------------------------------------------------- quyền
@pytest.mark.parametrize("vai_tro", ["qtt", "gv", "hs"])
def test_vai_tro_khac_bi_cam(mt: MoiTruong, vai_tro: str) -> None:
    res = mt.nap(mt.tk[vai_tro])
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"
    assert mt.so_mo_hinh() == 0 and mt.file_trong("models") == []


def test_chua_dang_nhap(mt: MoiTruong) -> None:
    res = mt.nap(None)
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "NOT_AUTHENTICATED"


# ---------------------------------------------------------------- lỗi nghiệp vụ (Bảng 3-11)
@pytest.mark.parametrize("ghi_cong", [None, "", "   "])
@pytest.mark.parametrize("nguon", ["CC_BY", "CC_BY_SA"])
def test_thieu_ghi_cong(mt: MoiTruong, nguon: str, ghi_cong: str | None) -> None:
    form = {"source_type": nguon} | ({"attribution": ghi_cong} if ghi_cong is not None else {})
    res = mt.nap(mt.tk["bientap"], **form)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "ATTRIBUTION_REQUIRED"
    assert res.json()["error"]["details"][0]["field"] == "attribution"
    assert mt.so_mo_hinh() == 0 and mt.so_nhat_ky() == 0


@pytest.mark.parametrize("du_lieu", [b"", b"khong phai glb", tao_glb(gltf_mau(), phien_ban=1)])
def test_file_khong_phai_glb(mt: MoiTruong, du_lieu: bytes) -> None:
    res = mt.nap(mt.tk["bientap"], du_lieu)
    assert res.status_code == 422
    loi = res.json()["error"]
    assert loi["code"] == "INVALID_GLB"
    assert loi["message"]
    assert mt.so_mo_hinh() == 0 and mt.so_nhat_ky() == 0 and mt.file_trong("models") == []


def test_vuot_muc_chan_tam_giac(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], gltf_tam_giac(1_500_001), accept_warnings="true")
    assert res.status_code == 422
    loi = res.json()["error"]
    assert loi["code"] == "LIMIT_EXCEEDED"
    assert loi["details"] == [{
        "field": "triangle_count",
        "value": 1_500_001,
        "limit": 1_500_000,
        "message": "Số tam giác 1.500.001 vượt mức 1.500.000",
    }]
    assert mt.so_mo_hinh() == 0 and mt.so_nhat_ky() == 0


def test_vuot_muc_chan_texture(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], gltf_texture(8192), accept_warnings="true")
    assert res.status_code == 422
    assert [(d["field"], d["value"], d["limit"]) for d in res.json()["error"]["details"]] == [
        ("max_texture_px", 8192, 4096)
    ]


def test_dung_muc_chan_van_nap_duoc_kem_canh_bao(mt: MoiTruong) -> None:
    gltf, bin_ = gltf_co_anh(png(4096, 4096))
    gltf["accessors"][1]["count"] = 1_500_000 * 3
    res = mt.nap(mt.tk["bientap"], tao_glb(gltf, bin_), accept_warnings="true")
    assert res.status_code == 201, res.text
    assert [w["field"] for w in res.json()["warnings"]] == ["triangle_count", "max_texture_px"]


def test_dung_muc_canh_bao_khong_bi_hoi(mt: MoiTruong) -> None:
    gltf, bin_ = gltf_co_anh(png(2048, 2048))
    gltf["accessors"][1]["count"] = 500_000 * 3
    res = mt.nap(mt.tk["bientap"], tao_glb(gltf, bin_))
    assert res.status_code == 201, res.text
    assert res.json()["warnings"] == []


def test_vuot_muc_canh_bao_chua_xac_nhan(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], gltf_tam_giac(500_001))
    assert res.status_code == 409
    loi = res.json()["error"]
    assert loi["code"] == "WARNINGS_NOT_ACCEPTED"
    assert loi["details"] == [{
        "field": "triangle_count",
        "value": 500_001,
        "limit": 500_000,
        "message": "Số tam giác 500.001 vượt mức 500.000",
    }]
    assert mt.so_mo_hinh() == 0 and mt.so_nhat_ky() == 0 and mt.file_trong("models") == []


def test_vuot_muc_canh_bao_da_xac_nhan(mt: MoiTruong) -> None:
    res = mt.nap(mt.tk["bientap"], gltf_texture(3000), accept_warnings="true")
    assert res.status_code == 201, res.text
    assert res.json()["warnings"] == [{
        "field": "max_texture_px",
        "value": 3000,
        "limit": 2048,
        "message": "Texture 3.000 px vượt mức 2.048 px",
    }]
    kiem_tra_nhat_ky(mt.db, "UPLOAD_ASSET", target_id=res.json()["id"])


def test_accept_warnings_false_van_hoi(mt: MoiTruong) -> None:
    assert mt.nap(mt.tk["bientap"], gltf_tam_giac(500_001), accept_warnings="false").status_code == 409


def test_file_qua_150_mb(mt: MoiTruong, monkeypatch: pytest.MonkeyPatch) -> None:
    # Không tạo file 150 MB thật: hạ mức chặn xuống dưới cỡ file mẫu.
    monkeypatch.setitem(assets_service.MUC_CHAN, "file_size", len(GLB_TOT) - 1)
    res = mt.nap(mt.tk["bientap"])
    assert res.status_code == 413
    assert res.json()["error"]["code"] == "FILE_TOO_LARGE"
    assert mt.so_mo_hinh() == 0


def test_dung_luong_vuot_muc_canh_bao(mt: MoiTruong, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(assets_service.MUC_CANH_BAO, "file_size", len(GLB_TOT) - 1)
    res = mt.nap(mt.tk["bientap"])
    assert res.status_code == 409
    chi_tiet = res.json()["error"]["details"]
    assert [d["field"] for d in chi_tiet] == ["file_size"]
    assert "MB" in chi_tiet[0]["message"]


# ---------------------------------------------------------------- dữ liệu gửi lên sai
@pytest.mark.parametrize(
    ("form", "truong"),
    [
        ({"name": "   "}, "name"),
        ({"name": "x" * 201}, "name"),
        ({"source_type": "TU_SUU_TAM"}, "source_type"),
        ({"accept_warnings": "co"}, "accept_warnings"),
        ({"attribution": "x" * 501}, "attribution"),
    ],
)
def test_du_lieu_sai(mt: MoiTruong, form: dict[str, str], truong: str) -> None:
    res = mt.nap(mt.tk["bientap"], **form)
    assert res.status_code == 422
    loi = res.json()["error"]
    assert loi["code"] == "VALIDATION_ERROR"
    assert truong in [d["field"] for d in loi["details"]]


def test_thieu_file(mt: MoiTruong) -> None:
    res = mt.client.post(
        "/api/assets",
        headers=bearer(mt.tk["bientap"], mt.dong_ho.gio),
        data={"name": "Cá chép", "source_type": "SELF_BUILT"},
    )
    assert res.status_code == 422
    assert "file" in [d["field"] for d in res.json()["error"]["details"]]


# ---------------------------------------------------------------- không để lại file mồ côi
def test_loi_truoc_khi_doi_ten_xoa_file_tam(mt: MoiTruong, monkeypatch: pytest.MonkeyPatch) -> None:
    def hong(*_a: object, **_k: object) -> None:
        raise RuntimeError("hỏng giả")

    monkeypatch.setattr(nhat_ky, "ghi", hong)
    with pytest.raises(RuntimeError):
        mt.nap(mt.tk["bientap"])
    assert mt.file_trong("tmp") == [] and mt.file_trong("models") == []


def test_loi_khi_commit_xoa_file_da_doi_ten(mt: MoiTruong, monkeypatch: pytest.MonkeyPatch) -> None:
    def hong() -> None:
        raise RuntimeError("CSDL hỏng giả")

    monkeypatch.setattr(mt.db, "commit", hong)
    with pytest.raises(RuntimeError):
        mt.nap(mt.tk["bientap"])
    assert mt.file_trong("tmp") == [] and mt.file_trong("models") == []


# ================================================================ API 45, 47, 48
def tao_bai(db: Session, asset_id: int, tieu_de: str = "Cá chép – cấu tạo ngoài", trang_thai: str = "DRAFT") -> Lesson:
    mon = db.scalar(select(Subject).where(Subject.code == "KHTN_THU")) or tao_mon(db)
    bai = Lesson(subject_id=mon.id, grade=6, title=tieu_de, asset_id=asset_id, status=trang_thai,
                 config={"answer_formula": "bí mật"})
    db.add(bai)
    db.flush()
    return bai


def goi(mt: MoiTruong, method: str, url: str, user: User | None = None, **kw: Any) -> Response:
    headers = bearer(user or mt.tk["bientap"], mt.dong_ho.gio)
    return mt.client.request(method, url, headers=headers, **kw)


# ---------------------------------------------------------------- API 45 – danh sách
def test_danh_sach_moi_nap_truoc_kem_chi_so(mt: MoiTruong) -> None:
    cu = mt.nap(mt.tk["bientap"], name="Tim người").json()["id"]
    moi = mt.nap(mt.tk["sys"], du_lieu=gltf_texture(4096), name="Tế bào thực vật", accept_warnings="true").json()["id"]
    mt.db.execute(update(Asset).where(Asset.id == cu).values(created_at=datetime(2026, 1, 1)))
    tao_bai(mt.db, cu)

    res = goi(mt, "GET", "/api/assets")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 2 and body["page"] == 1 and body["page_size"] == 20
    assert [x["id"] for x in body["items"]] == [moi, cu]
    dong_moi, dong_cu = body["items"]
    assert dong_moi["warning_fields"] == ["max_texture_px"]
    assert dong_moi["uploaded_by_name"] == mt.tk["sys"].full_name
    assert dong_moi["file_url"] == f"/content/models/{moi}.v1.glb"
    assert dong_moi["lesson_count"] == 0
    assert dong_cu == dong_cu | {"name": "Tim người", "mesh_count": 2, "triangle_count": 30, "lesson_count": 1,
                                 "warning_fields": [], "source_type": "SELF_BUILT", "attribution": None}
    assert dong_cu["created_at"].endswith("Z") or dong_cu["created_at"].endswith("+00:00")
    assert "file_path" not in dong_cu and "uploaded_by" not in dong_cu


def test_danh_sach_tim_theo_ten_va_phan_trang(mt: MoiTruong) -> None:
    for ten in ["Cá chép", "Cá rô", "Tim người", "100%_mau"]:
        mt.nap(mt.tk["bientap"], name=ten)
    res = goi(mt, "GET", "/api/assets", params={"q": " CÁ ", "page_size": 1, "page": 2})
    body = res.json()
    assert body["total"] == 2 and len(body["items"]) == 1
    # Ký tự đặc biệt của LIKE được hiểu theo nghĩa đen.
    assert goi(mt, "GET", "/api/assets", params={"q": "%_"}).json()["total"] == 1
    assert goi(mt, "GET", "/api/assets", params={"q": "khong-co"}).json() == {
        "items": [], "total": 0, "page": 1, "page_size": 20
    }


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 101}, {"page_size": 0}, {"q": "x" * 201}])
def test_danh_sach_tham_so_sai(mt: MoiTruong, params: dict[str, Any]) -> None:
    res = goi(mt, "GET", "/api/assets", params=params)
    assert res.status_code == 422 and res.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("vai_tro", ["qtt", "gv", "hs"])
@pytest.mark.parametrize("method,url", [("GET", "/api/assets"), ("GET", "/api/assets/1"), ("DELETE", "/api/assets/1")])
def test_vai_tro_khac_khong_xem_xoa_duoc(mt: MoiTruong, vai_tro: str, method: str, url: str) -> None:
    res = goi(mt, method, url, mt.tk[vai_tro])
    assert res.status_code == 403 and res.json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.parametrize("method,url", [("GET", "/api/assets"), ("GET", "/api/assets/1"), ("DELETE", "/api/assets/1")])
def test_chua_dang_nhap_khong_xem_xoa_duoc(mt: MoiTruong, method: str, url: str) -> None:
    assert mt.client.request(method, url).status_code == 401


# ---------------------------------------------------------------- API 47 – chi tiết
def test_chi_tiet_bao_cao_va_mesh(mt: MoiTruong) -> None:
    id_ = mt.nap(mt.tk["bientap"], du_lieu=gltf_texture(4096), accept_warnings="true",
                 source_type="CC_BY", attribution="Tác giả: Trần B").json()["id"]
    bai = tao_bai(mt.db, id_, "Tế bào", "PUBLISHED")

    res = goi(mt, "GET", f"/api/assets/{id_}", mt.tk["sys"])
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["warnings"] == [
        {"field": "max_texture_px", "value": 4096, "limit": 2048, "message": "Texture 4.096 px vượt mức 2.048 px"}
    ]
    assert body["attribution"] == "Tác giả: Trần B"
    assert body["lessons"] == [{"id": bai.id, "title": "Tế bào", "status": "PUBLISHED"}]
    assert body["lesson_count"] == 1
    assert isinstance(body["mesh_names"], list)
    assert "config" not in res.text and "bí mật" not in res.text


@pytest.mark.parametrize("id_", ["999999", "0", "2147483648", "abc"])
def test_chi_tiet_khong_co(mt: MoiTruong, id_: str) -> None:
    res = goi(mt, "GET", f"/api/assets/{id_}")
    if id_ == "999999":
        assert res.status_code == 404 and res.json()["error"]["code"] == "ASSET_NOT_FOUND"
    else:
        assert res.status_code == 422


# ---------------------------------------------------------------- API 48 – xóa
def test_xoa_mo_hinh_chua_dung(mt: MoiTruong) -> None:
    id_ = mt.nap(mt.tk["bientap"], name="Mô hình thử").json()["id"]
    assert mt.file_trong("models") == [f"{id_}.v1.glb"]

    res = goi(mt, "DELETE", f"/api/assets/{id_}")
    assert res.status_code == 204 and res.content == b""
    assert mt.db.get(Asset, id_) is None
    assert mt.file_trong("models") == []
    dong = kiem_tra_nhat_ky(
        mt.db, "DELETE_ASSET", user_id=mt.tk["bientap"].id, target_type="asset", target_id=id_, school_id=None
    )
    assert dong.detail["target_name"] == "Mô hình thử"
    assert goi(mt, "GET", f"/api/assets/{id_}").status_code == 404


def test_quan_tri_he_thong_xoa_duoc(mt: MoiTruong) -> None:
    id_ = mt.nap(mt.tk["bientap"]).json()["id"]
    assert goi(mt, "DELETE", f"/api/assets/{id_}", mt.tk["sys"]).status_code == 204
    kiem_tra_nhat_ky(mt.db, "DELETE_ASSET", user_id=mt.tk["sys"].id, target_id=id_)


def test_xoa_mo_hinh_dang_duoc_dung(mt: MoiTruong) -> None:
    id_ = mt.nap(mt.tk["bientap"]).json()["id"]
    b1 = tao_bai(mt.db, id_, "Cá chép – cấu tạo ngoài")
    b2 = tao_bai(mt.db, id_, "Cá chép – cấu tạo trong", "PUBLISHED")

    res = goi(mt, "DELETE", f"/api/assets/{id_}")
    assert res.status_code == 409, res.text
    err = res.json()["error"]
    assert err["code"] == "ASSET_IN_USE" and "2 bài học" in err["message"]
    assert err["details"] == [
        {"id": b1.id, "title": "Cá chép – cấu tạo ngoài", "status": "DRAFT"},
        {"id": b2.id, "title": "Cá chép – cấu tạo trong", "status": "PUBLISHED"},
    ]
    assert mt.db.get(Asset, id_) is not None and mt.file_trong("models") == [f"{id_}.v1.glb"]
    assert mt.db.scalar(select(func.count()).where(SystemLog.action == "DELETE_ASSET")) == 0


def test_xoa_mo_hinh_khong_co(mt: MoiTruong) -> None:
    res = goi(mt, "DELETE", "/api/assets/999999")
    assert res.status_code == 404 and res.json()["error"]["code"] == "ASSET_NOT_FOUND"


def test_xoa_khi_file_da_mat_van_xoa_ban_ghi(mt: MoiTruong) -> None:
    id_ = mt.nap(mt.tk["bientap"]).json()["id"]
    (mt.noi_dung / "models" / f"{id_}.v1.glb").unlink()
    assert goi(mt, "DELETE", f"/api/assets/{id_}").status_code == 204
    assert mt.db.get(Asset, id_) is None


def test_xoa_loi_commit_giu_nguyen_file(mt: MoiTruong, monkeypatch: pytest.MonkeyPatch) -> None:
    id_ = mt.nap(mt.tk["bientap"]).json()["id"]

    def hong() -> None:
        raise RuntimeError("CSDL hỏng giả")

    monkeypatch.setattr(mt.db, "commit", hong)
    with pytest.raises(RuntimeError):
        goi(mt, "DELETE", f"/api/assets/{id_}")
    assert mt.file_trong("models") == [f"{id_}.v1.glb"]
