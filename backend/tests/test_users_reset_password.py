"""API 6 – POST /api/users/{id}/reset-password: phạm vi theo vai trò, hiệu lực sau khi đặt lại (UC3)."""

from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import BANG_KY_TU_MAT_KHAU
from app.models import SystemLog, User
from tests.conftest import DongHo
from tests.du_lieu import (
    bearer,
    dang_nhap,
    goi_refresh,
    phan_cong,
    refresh_token,
    tao_lop,
    tao_mon,
    tao_tai_khoan,
    tao_truong,
    xep_lop,
)


@dataclass
class TheGioi:
    tk: dict[str, User]


@pytest.fixture
def the_gioi(db: Session) -> TheGioi:
    """Hai trường A, B; GVCN lớp 7A1 năm 2026-2027 (năm hiện tại) và 6A1 năm 2025-2026 (năm cũ)."""
    a, b = tao_truong(db, "truonga"), tao_truong(db, "truongb")
    mon = tao_mon(db)
    tk = {
        "sys": tao_tai_khoan(db, "admin", "SYSTEM_ADMIN"),
        "bientap": tao_tai_khoan(db, "bientap", "CONTENT_EDITOR"),
        "qtt_a": tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", a),
        "qtt2_a": tao_tai_khoan(db, "truonga.admin2", "SCHOOL_ADMIN", a),
        "qtt_b": tao_tai_khoan(db, "truongb.admin", "SCHOOL_ADMIN", b),
        "gvcn_a": tao_tai_khoan(db, "truonga.gv001", "TEACHER", a, ma="GV001"),
        "gv2_a": tao_tai_khoan(db, "truonga.gv002", "TEACHER", a, ma="GV002"),
        "gv_b": tao_tai_khoan(db, "truongb.gv001", "TEACHER", b, ma="GV001"),
        "hs_lop_cn": tao_tai_khoan(db, "truonga.hs001", "STUDENT", a, ma="HS001"),
        "hs_lop_khac": tao_tai_khoan(db, "truonga.hs002", "STUDENT", a, ma="HS002"),
        "hs_nam_cu": tao_tai_khoan(db, "truonga.hs003", "STUDENT", a, ma="HS003"),
        "hs_b": tao_tai_khoan(db, "truongb.hs001", "STUDENT", b, ma="HS001"),
    }
    lop_cn, lop_khac = tao_lop(db, a, "7A1"), tao_lop(db, a, "7A2")
    lop_nam_cu = tao_lop(db, a, "6A1", "2025-2026")
    phan_cong(db, lop_cn, tk["gvcn_a"], mon, chu_nhiem=True)
    phan_cong(db, lop_cn, tk["gv2_a"], mon)  # dạy nhưng không chủ nhiệm
    phan_cong(db, lop_khac, tk["gv2_a"], mon, chu_nhiem=True)
    phan_cong(db, lop_nam_cu, tk["gvcn_a"], mon, chu_nhiem=True)
    xep_lop(db, lop_cn, tk["hs_lop_cn"])
    xep_lop(db, lop_khac, tk["hs_lop_khac"])
    xep_lop(db, lop_nam_cu, tk["hs_nam_cu"])
    return TheGioi(tk)


def _dat_lai(client: TestClient, the_gioi: TheGioi, dong_ho: DongHo, nguoi_goi: str, muc_tieu: int | str):
    target_id = the_gioi.tk[muc_tieu].id if isinstance(muc_tieu, str) else muc_tieu
    return client.post(
        f"/api/users/{target_id}/reset-password", headers=bearer(the_gioi.tk[nguoi_goi], dong_ho.gio)
    )


@pytest.mark.parametrize(
    ("nguoi_goi", "muc_tieu"),
    [
        ("sys", "qtt_a"),
        ("sys", "bientap"),
        ("qtt_a", "gvcn_a"),
        ("qtt_a", "hs_lop_cn"),
        ("gvcn_a", "hs_lop_cn"),
    ],
)
def test_trong_pham_vi_dat_lai_duoc(
    client: TestClient, the_gioi: TheGioi, dong_ho: DongHo, nguoi_goi: str, muc_tieu: str
) -> None:
    res = _dat_lai(client, the_gioi, dong_ho, nguoi_goi, muc_tieu)

    assert res.status_code == 200, res.json()
    target = the_gioi.tk[muc_tieu]
    assert set(res.json()) == {"user_id", "username", "new_password"}
    assert (res.json()["user_id"], res.json()["username"]) == (target.id, target.username)


@pytest.mark.parametrize(
    ("nguoi_goi", "muc_tieu", "status", "ma_loi"),
    [
        # Quản trị hệ thống: chỉ quản trị trường, biên tập viên.
        ("sys", "gvcn_a", 403, "FORBIDDEN"),
        ("sys", "hs_lop_cn", 403, "FORBIDDEN"),
        ("sys", "sys", 403, "FORBIDDEN"),
        # Quản trị trường: chỉ giáo viên, học sinh cùng trường.
        ("qtt_a", "qtt2_a", 403, "FORBIDDEN"),
        ("qtt_a", "qtt_a", 403, "FORBIDDEN"),
        ("qtt_a", "gv_b", 404, "USER_NOT_FOUND"),
        ("qtt_a", "hs_b", 404, "USER_NOT_FOUND"),
        ("qtt_a", "qtt_b", 404, "USER_NOT_FOUND"),
        ("qtt_a", "bientap", 404, "USER_NOT_FOUND"),
        ("qtt_a", "sys", 404, "USER_NOT_FOUND"),
        # Giáo viên chủ nhiệm: chỉ học sinh lớp mình chủ nhiệm trong năm học hiện tại.
        ("gvcn_a", "hs_lop_khac", 403, "FORBIDDEN"),
        ("gvcn_a", "hs_nam_cu", 403, "FORBIDDEN"),
        ("gvcn_a", "gv2_a", 403, "FORBIDDEN"),
        ("gvcn_a", "hs_b", 404, "USER_NOT_FOUND"),
        # Dạy lớp nhưng không chủ nhiệm.
        ("gv2_a", "hs_lop_cn", 403, "FORBIDDEN"),
        # Vai trò không có chức năng này.
        ("hs_lop_cn", "hs_lop_khac", 403, "FORBIDDEN"),
        ("bientap", "qtt_a", 403, "FORBIDDEN"),
    ],
)
def test_ngoai_pham_vi(
    client: TestClient,
    db: Session,
    the_gioi: TheGioi,
    dong_ho: DongHo,
    nguoi_goi: str,
    muc_tieu: str,
    status: int,
    ma_loi: str,
) -> None:
    target = the_gioi.tk[muc_tieu]
    hash_cu, phien_ban_cu = target.password_hash, target.token_version

    res = _dat_lai(client, the_gioi, dong_ho, nguoi_goi, muc_tieu)

    assert res.status_code == status
    assert res.json()["error"]["code"] == ma_loi
    db.refresh(target)
    assert (target.password_hash, target.token_version) == (hash_cu, phien_ban_cu)
    assert db.scalar(select(func.count()).select_from(SystemLog).where(SystemLog.action == "RESET_PASSWORD")) == 0


def test_tai_khoan_khong_ton_tai_404(client: TestClient, the_gioi: TheGioi, dong_ho: DongHo) -> None:
    res = _dat_lai(client, the_gioi, dong_ho, "sys", 99_999_999)

    assert res.status_code == 404
    assert res.json()["error"]["code"] == "USER_NOT_FOUND"


def test_chua_dang_nhap_401(client: TestClient, the_gioi: TheGioi) -> None:
    res = client.post(f"/api/users/{the_gioi.tk['qtt_a'].id}/reset-password")

    assert res.status_code == 401
    assert res.json()["error"]["code"] == "NOT_AUTHENTICATED"


@pytest.mark.parametrize("id_sai", ["abc", "0", "-1", "2147483648", "99999999999"])
def test_id_sai_hoac_ngoai_khoang_422(client: TestClient, the_gioi: TheGioi, dong_ho: DongHo, id_sai: str) -> None:
    # id vượt INT của CSDL phải trả 422, không để CSDL báo tràn số thành lỗi 500.
    res = client.post(f"/api/users/{id_sai}/reset-password", headers=bearer(the_gioi.tk["qtt_a"], dong_ho.gio))

    assert res.status_code == 422
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    assert res.json()["error"]["details"][0]["field"] == "user_id"


def test_id_lon_nhat_hop_le_tra_404(client: TestClient, the_gioi: TheGioi, dong_ho: DongHo) -> None:
    res = _dat_lai(client, the_gioi, dong_ho, "sys", 2_147_483_647)

    assert res.status_code == 404


def test_nguoi_goi_dang_phai_doi_mat_khau_403(
    client: TestClient, db: Session, the_gioi: TheGioi, dong_ho: DongHo
) -> None:
    qtt = the_gioi.tk["qtt_a"]
    qtt.must_change_password = True
    db.flush()

    res = _dat_lai(client, the_gioi, dong_ho, "qtt_a", "hs_lop_cn")

    assert res.status_code == 403
    assert res.json()["error"]["code"] == "PASSWORD_CHANGE_REQUIRED"


def test_hieu_luc_sau_khi_dat_lai_quan_tri_truong(
    client: TestClient, db: Session, the_gioi: TheGioi, dong_ho: DongHo
) -> None:
    target = the_gioi.tk["qtt_a"]
    refresh_cu = refresh_token(target, dong_ho.gio)
    target.failed_login_count = 3
    target.locked_until = dong_ho.gio.replace(hour=23)
    db.flush()
    phien_ban_cu = target.token_version

    res = _dat_lai(client, the_gioi, dong_ho, "sys", "qtt_a")

    assert res.status_code == 200
    assert res.headers["cache-control"] == "no-store"
    mat_khau_moi = res.json()["new_password"]
    assert len(mat_khau_moi) == 8 and set(mat_khau_moi) <= set(BANG_KY_TU_MAT_KHAU)
    db.refresh(target)
    assert target.token_version == phien_ban_cu + 1
    assert (target.failed_login_count, target.locked_until) == (0, None)
    assert target.must_change_password is True
    # Phiên cũ bị thu hồi; mật khẩu mới đăng nhập được ngay (đã gỡ khóa tạm) và phải đổi mật khẩu.
    assert goi_refresh(client, refresh_cu).json()["error"]["code"] == "REFRESH_INVALID"
    dang_nhap_moi = dang_nhap(client, target.username, mat_khau_moi)
    assert dang_nhap_moi.status_code == 200
    assert dang_nhap_moi.json()["must_change_password"] is True
    # Nhật ký: ai đặt lại cho ai, không có mật khẩu.
    nhat_ky = db.scalars(select(SystemLog).where(SystemLog.action == "RESET_PASSWORD")).one()
    assert (nhat_ky.user_id, nhat_ky.target_id, nhat_ky.school_id) == (
        the_gioi.tk["sys"].id, target.id, target.school_id,
    )  # fmt: skip
    assert nhat_ky.detail == {"actor": "admin", "username": "truonga.admin"}
    assert mat_khau_moi not in str(nhat_ky.detail)


@pytest.mark.parametrize(("nguoi_goi", "muc_tieu"), [("qtt_a", "gvcn_a"), ("gvcn_a", "hs_lop_cn")])
def test_giao_vien_hoc_sinh_khong_bi_bat_doi_mat_khau(
    client: TestClient, db: Session, the_gioi: TheGioi, dong_ho: DongHo, nguoi_goi: str, muc_tieu: str
) -> None:
    res = _dat_lai(client, the_gioi, dong_ho, nguoi_goi, muc_tieu)

    assert res.status_code == 200
    target = the_gioi.tk[muc_tieu]
    db.refresh(target)
    assert target.must_change_password is False


def test_bien_tap_vien_bi_bat_doi_mat_khau(client: TestClient, db: Session, the_gioi: TheGioi, dong_ho: DongHo) -> None:
    _dat_lai(client, the_gioi, dong_ho, "sys", "bientap")

    db.refresh(the_gioi.tk["bientap"])
    assert the_gioi.tk["bientap"].must_change_password is True


def test_gvcn_sang_nam_hoc_moi_khong_con_dat_lai_duoc(
    client: TestClient, the_gioi: TheGioi, dong_ho: DongHo
) -> None:
    # 18/11/2026 -> năm học 2026-2027; tua tới 1/8/2027 (giờ Việt Nam) -> 2027-2028.
    dong_ho.gio = dong_ho.gio.replace(year=2027, month=7, day=31, hour=17, minute=0)

    res = _dat_lai(client, the_gioi, dong_ho, "gvcn_a", "hs_lop_cn")

    assert res.status_code == 403
