"""Nhóm 1 – đặt lại mật khẩu: POST /api/users/{id}/reset-password (Bảng 3-2, API 6)."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.clock import get_now
from app.core.database import get_db
from app.core.deps import require_role
from app.schemas.common import IdPath
from app.schemas.users import ResetPasswordOut
from app.services import users as users_service
from app.services.auth import CurrentUser

router = APIRouter(prefix="/api/users", tags=["Tài khoản"])


@router.post("/{user_id}/reset-password", response_model=ResetPasswordOut)
def reset_password(
    user_id: IdPath,
    request: Request,
    response: Response,
    # TEACHER: chỉ giáo viên chủ nhiệm mới qua được kiểm tra phạm vi ở service.
    actor: CurrentUser = Depends(require_role("SYSTEM_ADMIN", "SCHOOL_ADMIN", "TEACHER")),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> ResetPasswordOut:
    response.headers["Cache-Control"] = "no-store"
    ip = request.client.host if request.client else None
    return users_service.reset_password(db, actor, user_id, now, ip)
