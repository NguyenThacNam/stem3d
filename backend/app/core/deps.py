"""Phụ thuộc xác thực, phân quyền dùng cho mọi router.

- `get_current_user_for_auth`: chỉ dùng cho API nhóm /api/auth (me, change-password) – cho qua cả khi
  tài khoản đang phải đổi mật khẩu.
- `get_current_user`: mọi API khác – chặn 403 PASSWORD_CHANGE_REQUIRED.
- `require_role(...)`: kiểm tra vai trò; khai báo CONTENT_EDITOR thì SYSTEM_ADMIN tự được dùng.

Không dùng fastapi.security.HTTPBearer / HTTPException: lỗi phải qua AppError để đúng mã của chương 3.
"""

from collections.abc import Callable
from datetime import datetime

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.clock import get_now
from app.core.database import get_db
from app.core.errors import AppError
from app.services import auth as auth_service
from app.services.auth import CurrentUser


def _lay_bearer_token(request: Request) -> str:
    kieu, _, token = request.headers.get("authorization", "").partition(" ")
    if kieu.lower() != "bearer" or not token.strip():
        raise AppError(401, "NOT_AUTHENTICATED", "Bạn cần đăng nhập để dùng chức năng này")
    return token.strip()


def get_current_user_for_auth(
    request: Request, db: Session = Depends(get_db), now: datetime = Depends(get_now)
) -> CurrentUser:
    return auth_service.authenticate_access_token(db, _lay_bearer_token(request), now)


def get_current_user(user: CurrentUser = Depends(get_current_user_for_auth)) -> CurrentUser:
    if user.must_change_password:
        raise AppError(403, "PASSWORD_CHANGE_REQUIRED", "Bạn cần đổi mật khẩu trước khi tiếp tục")
    return user


def require_role(*roles: str) -> Callable[[CurrentUser], CurrentUser]:
    cho_phep = set(roles)
    # SYSTEM_ADMIN kế thừa CONTENT_EDITOR (docs/quyet-dinh.md).
    if "CONTENT_EDITOR" in cho_phep:
        cho_phep.add("SYSTEM_ADMIN")

    def _kiem_tra(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in cho_phep:
            raise AppError(403, "FORBIDDEN", "Bạn không có quyền dùng chức năng này")
        return user

    return _kiem_tra
