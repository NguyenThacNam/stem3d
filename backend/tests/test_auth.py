"""Nhóm 1 – xác thực: login, refresh, logout, me, change-password (Bảng 3-8, mục 3.1.1, UC 1–2)."""

from datetime import UTC, timedelta
from types import SimpleNamespace

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import SystemLog
from app.routers import auth as auth_router
from scripts.seed import TAI_KHOAN, chay_seed
from tests.conftest import DongHo
from tests.du_lieu import (
    MAT_KHAU,
    bearer,
    cookie_refresh,
    dang_nhap,
    gia_tri_refresh,
    goi_refresh,
    refresh_token,
    tao_tai_khoan,
    tao_truong,
)


def _loi(res) -> dict:
    return res.json()["error"]


def _nhat_ky(db: Session, username: str) -> list[SystemLog]:
    db.expire_all()
    return list(
        db.scalars(select(SystemLog).where(SystemLog.detail["actor"].astext == username).order_by(SystemLog.id))
    )


# ======================= Đăng nhập =======================


def test_tai_khoan_seed_dang_nhap_duoc(client: TestClient, db: Session) -> None:
    chay_seed(db, MAT_KHAU)

    for username, role, full_name, thuoc_truong, _ in TAI_KHOAN:
        res = dang_nhap(client, username)
        assert res.status_code == 200, (username, res.json())
        user = res.json()["user"]
        assert (user["role"], user["full_name"]) == (role, full_name)
        if thuoc_truong:
            assert user["school"]["code"] == "nguyendu"
        else:
            assert user["school"] is None


def test_dang_nhap_dung_khuon_dang(client: TestClient, db: Session) -> None:
    truong = tao_truong(db, "nguyendu")
    hs = tao_tai_khoan(db, "nguyendu.hs0123", "STUDENT", truong)

    res = dang_nhap(client, "nguyendu.hs0123")

    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"access_token", "token_type", "expires_in", "must_change_password", "user"}
    assert (body["token_type"], body["expires_in"], body["must_change_password"]) == ("bearer", 900, False)
    assert body["user"] == {
        "id": hs.id,
        "full_name": hs.full_name,
        "role": "STUDENT",
        "school": {"id": truong.id, "code": "nguyendu", "name": truong.name},
    }
    assert "password_hash" not in res.text and "$2b$" not in res.text and MAT_KHAU not in res.text
    assert res.headers["cache-control"] == "no-store"
    # Access token mang sub, role, school_id, cờ đổi mật khẩu.
    claims = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert (claims["sub"], claims["role"], claims["school_id"], claims["type"]) == (
        str(hs.id), "STUDENT", truong.id, "access",
    )  # fmt: skip
    assert claims["exp"] - claims["iat"] == 900


def test_cookie_refresh_dung_thuoc_tinh_dev(client: TestClient, db: Session) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    cookie = cookie_refresh(dang_nhap(client, "bientap")).lower()

    for thuoc_tinh in ("httponly", "samesite=strict", "path=/api/auth", "max-age=28800"):
        assert thuoc_tinh in cookie
    assert "secure" not in cookie


def test_cookie_refresh_co_secure_khi_prod(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    monkeypatch.setattr(auth_router, "get_settings", lambda: SimpleNamespace(is_prod=True))

    cookie = cookie_refresh(dang_nhap(client, "bientap")).lower()

    assert "; secure" in cookie and "httponly" in cookie and "samesite=strict" in cookie


def test_sai_ten_va_sai_mat_khau_cung_phan_hoi(client: TestClient, db: Session) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    sai_ten = dang_nhap(client, "khong-co-ai")
    sai_mat_khau = dang_nhap(client, "bientap", "sai-mat-khau")

    assert sai_ten.status_code == sai_mat_khau.status_code == 401
    assert sai_ten.json() == sai_mat_khau.json()
    assert _loi(sai_ten) == {
        "code": "INVALID_CREDENTIALS",
        "message": "Tên đăng nhập hoặc mật khẩu không đúng",
        "details": None,
    }
    assert "set-cookie" not in sai_mat_khau.headers


def test_bo_dem_tang_va_ve_0_khi_dang_nhap_dung(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    dang_nhap(client, "bientap", "sai-1")
    dang_nhap(client, "bientap", "sai-2")
    db.refresh(user)
    assert user.failed_login_count == 2

    assert dang_nhap(client, "bientap").status_code == 200
    db.refresh(user)
    assert user.failed_login_count == 0
    assert user.last_login_at == dong_ho.gio


@pytest.mark.parametrize(
    ("role", "giay_khoa"),
    [("SYSTEM_ADMIN", 900), ("CONTENT_EDITOR", 900), ("SCHOOL_ADMIN", 900), ("TEACHER", 60), ("STUDENT", 60)],
)
def test_sai_5_lan_bi_khoa_tam(client: TestClient, db: Session, dong_ho: DongHo, role: str, giay_khoa: int) -> None:
    truong = tao_truong(db) if role in {"SCHOOL_ADMIN", "TEACHER", "STUDENT"} else None
    tao_tai_khoan(db, "nguoi.thu", role, truong)

    for _ in range(4):
        assert dang_nhap(client, "nguoi.thu", "sai").status_code == 401
    lan_5 = dang_nhap(client, "nguoi.thu", "sai")

    assert lan_5.status_code == 423
    assert _loi(lan_5)["code"] == "ACCOUNT_LOCKED"
    assert _loi(lan_5)["details"] == {"retry_after_seconds": giay_khoa}
    assert _loi(lan_5)["message"] == f"Tài khoản đang tạm khóa, vui lòng thử lại sau {giay_khoa // 60} phút"

    # Đang khóa: mật khẩu đúng cũng bị từ chối, số giây còn lại giảm theo giờ.
    dong_ho.tua(seconds=giay_khoa - 10)
    dang_khoa = dang_nhap(client, "nguoi.thu")
    assert dang_khoa.status_code == 423
    assert _loi(dang_khoa)["details"] == {"retry_after_seconds": 10}

    dong_ho.tua(seconds=10)
    assert dang_nhap(client, "nguoi.thu").status_code == 200


def test_het_khoa_phai_sai_them_5_lan_moi_khoa_lai(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    for _ in range(5):
        dang_nhap(client, "bientap", "sai")
    dong_ho.tua(minutes=15)

    for _ in range(4):
        assert dang_nhap(client, "bientap", "sai").status_code == 401
    assert dang_nhap(client, "bientap", "sai").status_code == 423


def test_tai_khoan_bi_khoa_tra_403(client: TestClient, db: Session) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR", is_active=False)

    res = dang_nhap(client, "bientap")

    assert res.status_code == 403
    assert _loi(res)["code"] == "ACCOUNT_DISABLED"


def test_tai_khoan_bi_khoa_sai_mat_khau_van_tra_401(client: TestClient, db: Session) -> None:
    # Thứ tự UC1: so mật khẩu trước, kiểm tra trạng thái sau.
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR", is_active=False)

    assert _loi(dang_nhap(client, "bientap", "sai"))["code"] == "INVALID_CREDENTIALS"


def test_truong_bi_khoa_tra_403(client: TestClient, db: Session) -> None:
    truong = tao_truong(db, is_active=False)
    tao_tai_khoan(db, "truonga.gv001", "TEACHER", truong)

    res = dang_nhap(client, "truonga.gv001")

    assert res.status_code == 403
    assert _loi(res)["code"] == "SCHOOL_DISABLED"


@pytest.mark.parametrize(
    "du_lieu",
    [{}, {"username": "a"}, {"password": "b"}, {"username": "", "password": "b"}, {"username": "a", "password": ""}],
)
def test_dang_nhap_thieu_du_lieu_422(client: TestClient, du_lieu: dict) -> None:
    res = client.post("/api/auth/login", json=du_lieu)

    assert res.status_code == 422
    assert _loi(res)["code"] == "VALIDATION_ERROR"


def test_nhat_ky_dang_nhap_khong_ghi_mat_khau(client: TestClient, db: Session) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    # Người dùng gõ nhầm mật khẩu vào ô tên đăng nhập: nhật ký chỉ giữ 3 ký tự đầu.
    dang_nhap(client, "MatKhauGoNham-0", "MatKhauBiMat-1")
    dang_nhap(client, "bientap", "MatKhauBiMat-2")
    for _ in range(4):
        dang_nhap(client, "bientap", "MatKhauBiMat-3")
    dang_nhap(client, "bientap")  # đang khóa
    user.locked_until = None
    db.flush()
    dang_nhap(client, "bientap")

    khong_co = _nhat_ky(db, "Mat***")
    assert [(n.action, n.user_id, n.detail["reason"]) for n in khong_co] == [("LOGIN_FAILED", None, "UNKNOWN_USER")]
    assert khong_co[0].detail["username_length"] == len("MatKhauGoNham-0")
    assert "GoNham" not in str(khong_co[0].detail)
    nhat_ky = _nhat_ky(db, "bientap")
    assert [n.action for n in nhat_ky] == ["LOGIN_FAILED"] * 4 + ["LOGIN_LOCKED", "LOGIN_FAILED", "LOGIN"]
    assert nhat_ky[-2].detail["reason"] == "LOCKED"
    assert all(n.user_id == user.id for n in nhat_ky)
    for n in khong_co + nhat_ky:
        assert "MatKhau" not in str(n.detail)


# ======================= Làm mới token =======================


def test_refresh_cap_access_va_refresh_moi(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    cu = gia_tri_refresh(dang_nhap(client, "bientap"))
    dong_ho.tua(minutes=30)

    res = goi_refresh(client, cu)

    assert res.status_code == 200
    moi = gia_tri_refresh(res)
    assert moi != cu
    assert "max-age=28800" in cookie_refresh(res).lower()
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {res.json()['access_token']}"})
    assert me.status_code == 200


def _refresh_khong_hop_le(res) -> None:
    assert res.status_code == 401
    assert _loi(res)["code"] == "REFRESH_INVALID"
    cookie = cookie_refresh(res).lower()
    assert "max-age=0" in cookie and "path=/api/auth" in cookie


def test_refresh_thieu_cookie(client: TestClient) -> None:
    _refresh_khong_hop_le(goi_refresh(client, None))


@pytest.mark.parametrize("token", ["khong-phai-jwt", jwt.encode({"type": "refresh", "sub": "1"}, "khoa-khac-" * 4)])
def test_refresh_token_hong_hoac_sai_chu_ky(client: TestClient, token: str) -> None:
    _refresh_khong_hop_le(goi_refresh(client, token))


def test_refresh_bang_access_token_bi_tu_choi(client: TestClient, db: Session) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    access = dang_nhap(client, "bientap").json()["access_token"]

    _refresh_khong_hop_le(goi_refresh(client, access))


def test_refresh_het_han_sau_8_gio(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    token = gia_tri_refresh(dang_nhap(client, "bientap"))

    dong_ho.tua(hours=8, seconds=-1)
    assert goi_refresh(client, token).status_code == 200
    dong_ho.tua(seconds=1)
    _refresh_khong_hop_le(goi_refresh(client, token))


def test_refresh_bi_thu_hoi_khi_token_version_tang(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    token = refresh_token(user, dong_ho.gio)
    user.token_version += 1
    db.flush()

    _refresh_khong_hop_le(goi_refresh(client, token))


@pytest.mark.parametrize("khoa", ["tai_khoan", "truong"])
def test_refresh_bi_tu_choi_khi_tai_khoan_hoac_truong_bi_khoa(
    client: TestClient, db: Session, dong_ho: DongHo, khoa: str
) -> None:
    truong = tao_truong(db)
    user = tao_tai_khoan(db, "truonga.gv001", "TEACHER", truong)
    token = refresh_token(user, dong_ho.gio)
    if khoa == "tai_khoan":
        user.is_active = False
    else:
        truong.is_active = False
    db.flush()

    _refresh_khong_hop_le(goi_refresh(client, token))


# ======================= Đăng xuất =======================


def test_dang_xuat_xoa_cookie(client: TestClient) -> None:
    res = client.post("/api/auth/logout")

    assert res.status_code == 204
    cookie = cookie_refresh(res).lower()
    assert "max-age=0" in cookie and "path=/api/auth" in cookie and "httponly" in cookie


# ======================= Thông tin tài khoản =======================


def test_me_tra_thong_tin(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    truong = tao_truong(db, "nguyendu")
    user = tao_tai_khoan(db, "nguyendu.admin", "SCHOOL_ADMIN", truong, must_change_password=True)

    res = client.get("/api/auth/me", headers=bearer(user, dong_ho.gio))

    # Đang phải đổi mật khẩu vẫn gọi được API nhóm /api/auth.
    assert res.status_code == 200
    assert res.json() == {
        "id": user.id,
        "username": "nguyendu.admin",
        "full_name": user.full_name,
        "role": "SCHOOL_ADMIN",
        "school": {"id": truong.id, "code": "nguyendu", "name": truong.name},
        "must_change_password": True,
    }


@pytest.mark.parametrize(
    ("headers", "ma_loi"),
    [
        ({}, "NOT_AUTHENTICATED"),
        ({"Authorization": "Basic YWJjOmRlZg=="}, "NOT_AUTHENTICATED"),
        ({"Authorization": "Bearer "}, "NOT_AUTHENTICATED"),
        ({"Authorization": "Bearer khong-phai-jwt"}, "TOKEN_INVALID"),
    ],
)
def test_me_khong_co_hoac_sai_token(client: TestClient, headers: dict, ma_loi: str) -> None:
    res = client.get("/api/auth/me", headers=headers)

    assert res.status_code == 401
    assert _loi(res)["code"] == ma_loi


def test_me_access_token_het_han(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    headers = bearer(user, dong_ho.gio)

    dong_ho.tua(minutes=15, seconds=-1)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    dong_ho.tua(seconds=1)
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
    assert _loi(res)["code"] == "TOKEN_EXPIRED"


def test_me_dung_refresh_token_lam_access_bi_tu_choi(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh_token(user, dong_ho.gio)}"})

    assert res.status_code == 401
    assert _loi(res)["code"] == "TOKEN_INVALID"


def test_khoa_tai_khoan_co_hieu_luc_ngay(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    truong = tao_truong(db)
    user = tao_tai_khoan(db, "truonga.gv001", "TEACHER", truong)
    headers = bearer(user, dong_ho.gio)

    user.is_active = False
    db.flush()
    assert _loi(client.get("/api/auth/me", headers=headers))["code"] == "ACCOUNT_DISABLED"

    user.is_active = True
    truong.is_active = False
    db.flush()
    assert _loi(client.get("/api/auth/me", headers=headers))["code"] == "SCHOOL_DISABLED"


def test_tai_khoan_da_xoa_token_khong_hop_le(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    headers = bearer(user, dong_ho.gio)
    db.delete(user)
    db.flush()

    assert _loi(client.get("/api/auth/me", headers=headers))["code"] == "TOKEN_INVALID"


# ======================= Đổi mật khẩu =======================

MAT_KHAU_MOI = "MatKhau-Moi-2"


def _doi(client: TestClient, headers: dict, **du_lieu: str):
    body = {"current_password": MAT_KHAU, "new_password": MAT_KHAU_MOI, "confirm_password": MAT_KHAU_MOI}
    body.update(du_lieu)
    return client.post("/api/auth/change-password", json=body, headers=headers)


def test_doi_mat_khau_thanh_cong(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    truong = tao_truong(db)
    user = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", truong, must_change_password=True)
    refresh_cu = gia_tri_refresh(dang_nhap(client, "truonga.admin"))
    headers = bearer(user, dong_ho.gio)
    phien_ban_cu = user.token_version

    res = _doi(client, headers)

    assert res.status_code == 200
    assert res.json()["must_change_password"] is False
    assert res.headers["cache-control"] == "no-store"
    refresh_moi = gia_tri_refresh(res)
    db.refresh(user)
    assert user.token_version == phien_ban_cu + 1
    assert user.must_change_password is False
    # Máy khác (refresh token cũ) bị đăng xuất; máy hiện tại dùng refresh token mới được.
    _refresh_khong_hop_le(goi_refresh(client, refresh_cu))
    assert goi_refresh(client, refresh_moi).status_code == 200
    # Mật khẩu cũ hết dùng được, mật khẩu mới đăng nhập được.
    assert dang_nhap(client, "truonga.admin").status_code == 401
    assert dang_nhap(client, "truonga.admin", MAT_KHAU_MOI).status_code == 200
    nhat_ky = [n for n in _nhat_ky(db, "truonga.admin") if n.action == "CHANGE_PASSWORD"]
    assert len(nhat_ky) == 1
    assert "MatKhau" not in str(nhat_ky[0].detail)
    assert set(nhat_ky[0].detail) == {"actor", "target_name", "ip"}


def test_doi_mat_khau_khi_dang_khoa_khong_tang_bo_dem_khong_ghi_nhat_ky(
    client: TestClient, db: Session, dong_ho: DongHo
) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR", locked_until=dong_ho.gio + timedelta(minutes=5))

    res = _doi(client, bearer(user, dong_ho.gio), current_password="sai")

    assert res.status_code == 423
    assert _loi(res)["details"] == {"retry_after_seconds": 300}
    db.refresh(user)
    assert (user.failed_login_count, user.locked_until) == (0, dong_ho.gio + timedelta(minutes=5))
    assert _nhat_ky(db, "bientap") == []


def test_doi_mat_khau_sai_mat_khau_hien_tai(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    res = _doi(client, bearer(user, dong_ho.gio), current_password="sai")

    assert res.status_code == 400
    assert _loi(res) == {"code": "INVALID_CURRENT_PASSWORD", "message": "Mật khẩu hiện tại không đúng", "details": None}
    db.refresh(user)
    assert user.token_version == 0


@pytest.mark.parametrize(
    ("du_lieu", "truong_loi", "thong_bao"),
    [
        ({"confirm_password": "Khac-Nhau-9"}, "confirm_password", "Mật khẩu nhập lại không khớp với mật khẩu mới"),
        ({"new_password": "ngan", "confirm_password": "ngan"}, "new_password", "Cần ít nhất 8 ký tự"),
        ({"new_password": MAT_KHAU, "confirm_password": MAT_KHAU}, "new_password", "Mật khẩu mới phải khác mật khẩu hiện tại"),
        (
            {"new_password": "ệ" * 25, "confirm_password": "ệ" * 25},
            "new_password",
            "Mật khẩu quá dài: tối đa 72 byte (chữ có dấu tính 2–3 byte), hãy rút ngắn",
        ),
    ],
)
def test_doi_mat_khau_du_lieu_sai_422(
    client: TestClient, db: Session, dong_ho: DongHo, du_lieu: dict, truong_loi: str, thong_bao: str
) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")

    res = _doi(client, bearer(user, dong_ho.gio), **du_lieu)

    assert res.status_code == 422
    assert {"field": truong_loi, "message": thong_bao} in _loi(res)["details"]


def test_mat_khau_dung_72_byte_hop_le(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    mat_khau_72_byte = "ệ" * 24  # 24 × 3 byte

    res = _doi(client, bearer(user, dong_ho.gio), new_password=mat_khau_72_byte, confirm_password=mat_khau_72_byte)

    assert res.status_code == 200
    assert dang_nhap(client, "bientap", mat_khau_72_byte).status_code == 200


def test_doi_mat_khau_chua_dang_nhap(client: TestClient) -> None:
    assert _loi(_doi(client, {}))["code"] == "NOT_AUTHENTICATED"


# ======================= Bổ sung theo review =======================


def _token_tu_ky(payload: dict, khoa: str | None, thuat_toan: str = "HS256") -> str:
    return jwt.encode(payload, khoa, algorithm=thuat_toan)


def _payload_access(user, dong_ho: DongHo) -> dict:
    iat = int(dong_ho.gio.replace(tzinfo=UTC).timestamp())
    return {"type": "access", "sub": str(user.id), "role": user.role, "school_id": None,
            "must_change_password": False, "iat": iat, "exp": iat + 900}  # fmt: skip


@pytest.mark.parametrize(("khoa", "thuat_toan"), [("khoa-gia-mao-" * 4, "HS256"), (None, "none")])
def test_me_access_token_sai_chu_ky_hoac_alg_none(
    client: TestClient, db: Session, dong_ho: DongHo, khoa: str | None, thuat_toan: str
) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    token = _token_tu_ky(_payload_access(user, dong_ho), khoa, thuat_toan)

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 401
    assert _loi(res)["code"] == "TOKEN_INVALID"


def test_refresh_token_thieu_ver_bi_tu_choi(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    iat = int(dong_ho.gio.replace(tzinfo=UTC).timestamp())
    token = _token_tu_ky(
        {"type": "refresh", "sub": str(user.id), "iat": iat, "exp": iat + 3600}, get_settings().jwt_secret
    )

    _refresh_khong_hop_le(goi_refresh(client, token))


@pytest.mark.parametrize(("khoa", "ly_do"), [("tai_khoan", "ACCOUNT_DISABLED"), ("truong", "SCHOOL_DISABLED")])
def test_nhat_ky_dang_nhap_tai_khoan_hoac_truong_bi_khoa(
    client: TestClient, db: Session, khoa: str, ly_do: str
) -> None:
    truong = tao_truong(db, is_active=khoa != "truong")
    tao_tai_khoan(db, "truonga.gv001", "TEACHER", truong, is_active=khoa != "tai_khoan")

    dang_nhap(client, "truonga.gv001")

    nhat_ky = _nhat_ky(db, "truonga.gv001")
    assert [(n.action, n.detail["reason"]) for n in nhat_ky] == [("LOGIN_FAILED", ly_do)]


def test_dang_khoa_tam_va_tai_khoan_bi_khoa_tra_423(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    # Khóa tạm được kiểm tra trước trạng thái tài khoản (UC1 bước 2 trước bước 4).
    tao_tai_khoan(
        db, "bientap", "CONTENT_EDITOR", is_active=False, locked_until=dong_ho.gio + timedelta(minutes=5)
    )

    res = dang_nhap(client, "bientap")

    assert res.status_code == 423
    assert _loi(res)["code"] == "ACCOUNT_LOCKED"


def test_truong_bi_khoa_sai_mat_khau_van_tra_401(client: TestClient, db: Session) -> None:
    tao_tai_khoan(db, "truonga.gv001", "TEACHER", tao_truong(db, is_active=False))

    assert _loi(dang_nhap(client, "truonga.gv001", "sai"))["code"] == "INVALID_CREDENTIALS"


def test_mat_khau_72_byte_them_ky_tu_khong_dang_nhap_duoc(client: TestClient, db: Session) -> None:
    mat_khau = "ệ" * 24  # đúng 72 byte
    tao_tai_khoan(db, "bientap", "CONTENT_EDITOR", mat_khau=mat_khau)

    assert dang_nhap(client, "bientap", mat_khau + "x").status_code == 401
    assert dang_nhap(client, "bientap", mat_khau).status_code == 200


# ---------- Sai mật khẩu hiện tại khi đổi mật khẩu: tính chung bộ đếm, khóa tạm ----------


def test_doi_mat_khau_sai_5_lan_bi_khoa_tam(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    headers = bearer(user, dong_ho.gio)

    for lan in range(1, 5):
        res = _doi(client, headers, current_password="sai")
        assert res.status_code == 400, lan
    lan_5 = _doi(client, headers, current_password="sai")

    assert lan_5.status_code == 423
    assert _loi(lan_5)["details"] == {"retry_after_seconds": 900}
    # Đang khóa: mật khẩu hiện tại đúng cũng bị từ chối, đăng nhập cũng bị khóa.
    assert _doi(client, headers).status_code == 423
    assert dang_nhap(client, "bientap").status_code == 423
    nhat_ky = _nhat_ky(db, "bientap")
    assert [n.action for n in nhat_ky[:5]] == ["CHANGE_PASSWORD_FAILED"] * 4 + ["LOGIN_LOCKED"]
    assert nhat_ky[4].detail["source"] == "CHANGE_PASSWORD_FAILED"
    # Nhật ký chỉ có các khóa được phép, không có mật khẩu.
    khoa_cho_phep = {"actor", "target_name", "ip", "failed_count", "source", "locked_seconds", "reason"}
    assert all(set(n.detail) <= khoa_cho_phep for n in nhat_ky)

    dong_ho.tua(minutes=15)
    headers = bearer(user, dong_ho.gio)
    assert _doi(client, headers).status_code == 200


def test_doi_mat_khau_va_dang_nhap_dung_chung_bo_dem(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    truong = tao_truong(db)
    user = tao_tai_khoan(db, "truonga.hs001", "STUDENT", truong)
    for _ in range(3):
        dang_nhap(client, "truonga.hs001", "sai")
    headers = bearer(user, dong_ho.gio)

    assert _doi(client, headers, current_password="sai").status_code == 400
    res = _doi(client, headers, current_password="sai")

    assert res.status_code == 423
    assert _loi(res)["details"] == {"retry_after_seconds": 60}


def test_doi_mat_khau_thanh_cong_dua_bo_dem_ve_0(client: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    headers = bearer(user, dong_ho.gio)
    _doi(client, headers, current_password="sai")
    _doi(client, headers, current_password="sai")

    assert _doi(client, headers).status_code == 200
    db.refresh(user)
    assert user.failed_login_count == 0
