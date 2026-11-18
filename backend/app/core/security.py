"""Mật khẩu (bcrypt) và token (JWT HS256)."""

import secrets
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import get_settings

MAT_KHAU_TOI_DA_BYTE = 72  # giới hạn của bcrypt: phần sau byte 72 bị bỏ qua
ACCESS_TOKEN_SECONDS = 15 * 60
REFRESH_TOKEN_SECONDS = 8 * 60 * 60
THUAT_TOAN_JWT = "HS256"

# Mật khẩu ngẫu nhiên: bỏ ký tự dễ nhầm (0/O, 1/l/I) vì người dùng chép tay.
BANG_KY_TU_MAT_KHAU = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
DO_DAI_MAT_KHAU_NGAU_NHIEN = 8

LoaiToken = Literal["access", "refresh"]


# ---------- Mật khẩu ----------


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    # bcrypt bỏ qua phần sau byte 72: không có mật khẩu hợp lệ nào dài hơn (NewPassword chặn khi đặt),
    # nên mật khẩu dài hơn luôn sai – tránh "P + chuỗi bất kỳ" vẫn đăng nhập được.
    if len(password.encode("utf-8")) > MAT_KHAU_TOI_DA_BYTE:
        return False
    # Bản băm hỏng (không phải bcrypt) coi như sai mật khẩu, không để thành lỗi 500.
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False


@lru_cache
def dummy_password_hash() -> str:
    """Bản băm giả: so mật khẩu cả khi tên đăng nhập không tồn tại, để thời gian phản hồi không lộ tài khoản."""
    return hash_password(secrets.token_urlsafe(16))


def generate_password(length: int = DO_DAI_MAT_KHAU_NGAU_NHIEN) -> str:
    return "".join(secrets.choice(BANG_KY_TU_MAT_KHAU) for _ in range(length))


# ---------- Token ----------


class TokenError(Exception):
    def __init__(self, expired: bool = False) -> None:
        super().__init__("Token hết hạn" if expired else "Token không hợp lệ")
        self.expired = expired


def _giay(now: datetime) -> int:
    return int((now.replace(tzinfo=UTC) if now.tzinfo is None else now).timestamp())


def _ky(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=THUAT_TOAN_JWT)


def create_access_token(
    user_id: int, role: str, school_id: int | None, must_change_password: bool, now: datetime
) -> str:
    iat = _giay(now)
    return _ky(
        {
            "type": "access",
            "sub": str(user_id),
            "role": role,
            "school_id": school_id,
            "must_change_password": must_change_password,
            "iat": iat,
            "exp": iat + ACCESS_TOKEN_SECONDS,
        }
    )


def create_refresh_token(user_id: int, token_version: int, now: datetime) -> str:
    iat = _giay(now)
    return _ky(
        {
            "type": "refresh",
            "sub": str(user_id),
            "ver": token_version,
            "jti": secrets.token_urlsafe(12),
            "iat": iat,
            "exp": iat + REFRESH_TOKEN_SECONDS,
        }
    )


def decode_token(token: str, expected_type: LoaiToken, now: datetime) -> dict[str, Any]:
    """Kiểm tra chữ ký, loại token và hạn (theo `now`, để test tua giờ được)."""
    try:
        payload = jwt.decode(
            token,
            get_settings().jwt_secret,
            algorithms=[THUAT_TOAN_JWT],
            # Hạn kiểm tra bên dưới theo `now`, không theo đồng hồ máy.
            options={"verify_exp": False, "verify_iat": False, "require": ["type", "sub", "iat", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError() from exc
    if payload.get("type") != expected_type or not str(payload.get("sub", "")).isdigit():
        raise TokenError()
    if not isinstance(payload.get("exp"), int) or payload["exp"] <= _giay(now):
        raise TokenError(expired=True)
    return payload
