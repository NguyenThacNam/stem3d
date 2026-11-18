"""Băm và kiểm tra mật khẩu (bcrypt). Phần JWT thêm ở phần xác thực."""

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    # Bản băm hỏng (không phải bcrypt) coi như sai mật khẩu, không để thành lỗi 500.
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:
        return False
