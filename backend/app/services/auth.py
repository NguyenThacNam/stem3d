"""Nghiệp vụ xác thực: đăng nhập, làm mới token, đổi mật khẩu, xác thực access token.

Nhật ký (system_logs): LOGIN, LOGIN_FAILED, LOGIN_LOCKED, CHANGE_PASSWORD, CHANGE_PASSWORD_FAILED.
Không bao giờ ghi mật khẩu; tên đăng nhập không tồn tại chỉ ghi 3 ký tự đầu.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import (
    ACCESS_TOKEN_SECONDS,
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    dummy_password_hash,
    hash_password,
    verify_password,
)
from app.models import School, User
from app.repositories import system_logs as logs_repo
from app.repositories import users as users_repo
from app.schemas.auth import MeOut, SchoolBriefOut, TokenOut, UserBriefOut

SO_LAN_SAI_TOI_DA = 5
VAI_TRO_KHOA_LAU = {"SYSTEM_ADMIN", "CONTENT_EDITOR", "SCHOOL_ADMIN"}
THOI_GIAN_KHOA_LAU = timedelta(minutes=15)
THOI_GIAN_KHOA_NGAN = timedelta(minutes=1)


@dataclass(frozen=True)
class CurrentUser:
    id: int
    username: str
    role: str
    school_id: int | None
    must_change_password: bool


@dataclass(frozen=True)
class KetQuaCapToken:
    token: TokenOut
    refresh_token: str


# ---------- Lỗi ----------


def _loi_sai_thong_tin() -> AppError:
    # Cùng một lỗi cho sai tên đăng nhập và sai mật khẩu.
    return AppError(401, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng")


def _loi_dang_khoa(con_lai: timedelta) -> AppError:
    giay = max(1, math.ceil(con_lai.total_seconds()))
    phut = math.ceil(giay / 60)
    return AppError(
        423,
        "ACCOUNT_LOCKED",
        f"Tài khoản đang tạm khóa, vui lòng thử lại sau {phut} phút",
        {"retry_after_seconds": giay},
    )


def _loi_tai_khoan_khoa() -> AppError:
    return AppError(403, "ACCOUNT_DISABLED", "Tài khoản đã bị khóa, hãy liên hệ quản trị")


def _loi_truong_khoa() -> AppError:
    return AppError(403, "SCHOOL_DISABLED", "Trường đang tạm ngừng sử dụng hệ thống, hãy liên hệ quản trị trường")


def _loi_refresh() -> AppError:
    return AppError(401, "REFRESH_INVALID", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại")


# ---------- Dùng chung ----------


def _cap_token(user: User, school: School | None, now: datetime) -> KetQuaCapToken:
    access = create_access_token(user.id, user.role, user.school_id, user.must_change_password, now)
    return KetQuaCapToken(
        token=TokenOut(
            access_token=access,
            expires_in=ACCESS_TOKEN_SECONDS,
            must_change_password=user.must_change_password,
            user=UserBriefOut(id=user.id, full_name=user.full_name, role=user.role, school=_truong_out(school)),
        ),
        refresh_token=create_refresh_token(user.id, user.token_version, now),
    )


def _truong_out(school: School | None) -> SchoolBriefOut | None:
    return SchoolBriefOut(id=school.id, code=school.code, name=school.name) if school else None


def _che_ten_dang_nhap(username: str) -> str:
    # Tên không tồn tại có thể là mật khẩu gõ nhầm ô: chỉ giữ 3 ký tự đầu.
    return username[:3] + "***"


def _ghi_lan_sai(
    db: Session, user: User, now: datetime, action_sai: str, ip: str | None, **them: object
) -> AppError | None:
    """Tăng bộ đếm sai (dùng chung cho đăng nhập và đổi mật khẩu); đủ 5 lần thì khóa tạm theo vai trò.

    Trả lỗi 423 nếu vừa bị khóa, None nếu chưa. Đã ghi nhật ký và commit.
    """
    user.failed_login_count += 1
    if user.failed_login_count >= SO_LAN_SAI_TOI_DA:
        thoi_gian = THOI_GIAN_KHOA_LAU if user.role in VAI_TRO_KHOA_LAU else THOI_GIAN_KHOA_NGAN
        user.locked_until = now + thoi_gian
        # Bắt đầu đếm lại từ 0: hết khóa phải sai thêm 5 lần nữa mới bị khóa lại.
        user.failed_login_count = 0
        _ghi_dang_nhap(
            db,
            "LOGIN_LOCKED",
            user,
            user.username,
            ip,
            source=action_sai,
            locked_seconds=int(thoi_gian.total_seconds()),
        )
        db.commit()
        return _loi_dang_khoa(thoi_gian)
    _ghi_dang_nhap(db, action_sai, user, user.username, ip, failed_count=user.failed_login_count, **them)
    db.commit()
    return None


def _ghi_dang_nhap(
    db: Session, action: str, user: User | None, username: str, ip: str | None, **them: object
) -> None:
    logs_repo.add(
        db,
        action,
        user_id=user.id if user else None,
        school_id=user.school_id if user else None,
        target_type="user" if user else None,
        target_id=user.id if user else None,
        detail={"username": username, "ip": ip, **them},
    )


# ---------- Đăng nhập ----------


def login(db: Session, username: str, password: str, now: datetime, ip: str | None) -> KetQuaCapToken:
    """Thứ tự theo UC1: khóa tạm -> mật khẩu -> tài khoản/trường còn hoạt động -> cấp token."""
    user = users_repo.get_by_username(db, username, for_update=True)

    if user is None:
        verify_password(password, dummy_password_hash())
        _ghi_dang_nhap(
            db,
            "LOGIN_FAILED",
            None,
            _che_ten_dang_nhap(username),
            ip,
            reason="UNKNOWN_USER",
            username_length=len(username),
        )
        db.commit()
        raise _loi_sai_thong_tin()

    if user.locked_until is not None and user.locked_until > now:
        _ghi_dang_nhap(db, "LOGIN_FAILED", user, username, ip, reason="LOCKED")
        db.commit()
        raise _loi_dang_khoa(user.locked_until - now)

    if not verify_password(password, user.password_hash):
        loi_khoa = _ghi_lan_sai(db, user, now, "LOGIN_FAILED", ip, reason="WRONG_PASSWORD")
        raise loi_khoa or _loi_sai_thong_tin()

    school = users_repo.get_school(db, user.school_id)
    if not user.is_active:
        _ghi_dang_nhap(db, "LOGIN_FAILED", user, username, ip, reason="ACCOUNT_DISABLED")
        db.commit()
        raise _loi_tai_khoan_khoa()
    if school is not None and not school.is_active:
        _ghi_dang_nhap(db, "LOGIN_FAILED", user, username, ip, reason="SCHOOL_DISABLED")
        db.commit()
        raise _loi_truong_khoa()

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now
    _ghi_dang_nhap(db, "LOGIN", user, username, ip)
    db.commit()
    return _cap_token(user, school, now)


# ---------- Làm mới token ----------


def refresh(db: Session, refresh_token: str | None, now: datetime) -> KetQuaCapToken:
    if not refresh_token:
        raise _loi_refresh()
    try:
        payload = decode_token(refresh_token, "refresh", now)
    except TokenError as exc:
        raise _loi_refresh() from exc

    user = users_repo.get_by_id(db, int(payload["sub"]))
    if user is None or payload.get("ver") != user.token_version or not user.is_active:
        raise _loi_refresh()
    school = users_repo.get_school(db, user.school_id)
    if school is not None and not school.is_active:
        raise _loi_refresh()
    return _cap_token(user, school, now)


# ---------- Xác thực access token (dùng trong deps) ----------


def authenticate_access_token(db: Session, token: str, now: datetime) -> CurrentUser:
    """Kiểm tra token rồi đọc lại tài khoản trong CSDL: khóa tài khoản/trường có hiệu lực ngay."""
    try:
        payload = decode_token(token, "access", now)
    except TokenError as exc:
        if exc.expired:
            raise AppError(401, "TOKEN_EXPIRED", "Phiên đăng nhập đã hết hạn, hãy làm mới phiên") from exc
        raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại") from exc

    user = users_repo.get_by_id(db, int(payload["sub"]))
    if user is None:
        raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại")
    if not user.is_active:
        raise _loi_tai_khoan_khoa()
    school = users_repo.get_school(db, user.school_id)
    if school is not None and not school.is_active:
        raise _loi_truong_khoa()
    return CurrentUser(
        id=user.id,
        username=user.username,
        role=user.role,
        school_id=user.school_id,
        must_change_password=user.must_change_password,
    )


def me(db: Session, current: CurrentUser) -> MeOut:
    user = users_repo.get_by_id(db, current.id)
    if user is None:
        raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại")
    return MeOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        school=_truong_out(users_repo.get_school(db, user.school_id)),
        must_change_password=user.must_change_password,
    )


# ---------- Đổi mật khẩu ----------


def change_password(
    db: Session,
    current: CurrentUser,
    current_password: str,
    new_password: str,
    now: datetime,
    ip: str | None = None,
) -> KetQuaCapToken:
    """Đổi mật khẩu, thu hồi phiên trên máy khác (tăng token_version), cấp token mới cho máy hiện tại.

    Sai mật khẩu hiện tại tính chung bộ đếm với đăng nhập: đủ 5 lần thì khóa tạm, trả 423.
    """
    user = users_repo.get_by_id(db, current.id, for_update=True)
    if user is None:
        raise AppError(401, "TOKEN_INVALID", "Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại")
    if user.locked_until is not None and user.locked_until > now:
        raise _loi_dang_khoa(user.locked_until - now)
    if not verify_password(current_password, user.password_hash):
        loi_khoa = _ghi_lan_sai(db, user, now, "CHANGE_PASSWORD_FAILED", ip)
        raise loi_khoa or AppError(400, "INVALID_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng")

    user.password_hash = hash_password(new_password)
    user.token_version += 1
    user.must_change_password = False
    user.failed_login_count = 0
    user.locked_until = None
    logs_repo.add(
        db,
        "CHANGE_PASSWORD",
        user_id=user.id,
        school_id=user.school_id,
        target_type="user",
        target_id=user.id,
        detail={"username": user.username},
    )
    db.commit()
    return _cap_token(user, users_repo.get_school(db, user.school_id), now)
