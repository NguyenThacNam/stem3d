"""Nghiệp vụ tài khoản: đặt lại mật khẩu theo phạm vi (mục 2.5, chương 3 dòng 75).

- SYSTEM_ADMIN -> SCHOOL_ADMIN, CONTENT_EDITOR.
- SCHOOL_ADMIN -> TEACHER, STUDENT cùng trường.
- TEACHER (chủ nhiệm) -> STUDENT lớp mình chủ nhiệm trong NĂM HỌC HIỆN TẠI.
Khác trường -> 404; cùng trường (hoặc không thuộc trường) nhưng ngoài phạm vi -> 403.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.clock import current_school_year
from app.core.errors import AppError
from app.core.security import generate_password, hash_password
from app.models import User
from app.repositories import system_logs as logs_repo
from app.repositories import users as users_repo
from app.schemas.users import ResetPasswordOut
from app.services.auth import CurrentUser

# Người được đặt lại thuộc nhóm này thì phải đổi mật khẩu ở lần đăng nhập sau.
VAI_TRO_BAT_DOI_MAT_KHAU = {"SCHOOL_ADMIN", "CONTENT_EDITOR"}


def _khong_tim_thay() -> AppError:
    return AppError(404, "USER_NOT_FOUND", "Không tìm thấy tài khoản")


def _ngoai_pham_vi() -> AppError:
    return AppError(403, "FORBIDDEN", "Bạn không có quyền đặt lại mật khẩu cho tài khoản này")


def _kiem_tra_pham_vi(db: Session, actor: CurrentUser, target: User, now: datetime) -> None:
    if actor.role == "SYSTEM_ADMIN":
        if target.role not in {"SCHOOL_ADMIN", "CONTENT_EDITOR"}:
            raise _ngoai_pham_vi()
        return

    # Vai trò thuộc trường: tài khoản ngoài trường mình (kể cả không thuộc trường nào) coi như không tồn tại.
    if actor.school_id is None or target.school_id != actor.school_id:
        raise _khong_tim_thay()

    if actor.role == "SCHOOL_ADMIN":
        if target.role not in {"TEACHER", "STUDENT"}:
            raise _ngoai_pham_vi()
        return

    if actor.role == "TEACHER":
        nam_hoc = current_school_year(now)
        if target.role != "STUDENT" or not users_repo.is_homeroom_student(db, actor.id, target.id, nam_hoc):
            raise _ngoai_pham_vi()
        return

    raise _ngoai_pham_vi()


def reset_password(db: Session, actor: CurrentUser, target_id: int, now: datetime) -> ResetPasswordOut:
    # Kiểm tra phạm vi trên bản đọc thường, chỉ khóa dòng khi đã chắc chắn có quyền.
    target = users_repo.get_by_id(db, target_id)
    if target is None:
        raise _khong_tim_thay()
    _kiem_tra_pham_vi(db, actor, target, now)
    db.refresh(target, with_for_update=True)
    # Kiểm tra lại trên bản đã khóa: vai trò / trường có thể vừa đổi giữa hai lần đọc.
    _kiem_tra_pham_vi(db, actor, target, now)

    mat_khau_moi = generate_password()
    target.password_hash = hash_password(mat_khau_moi)
    # Thu hồi mọi phiên cũ, gỡ khóa tạm.
    target.token_version += 1
    target.failed_login_count = 0
    target.locked_until = None
    if target.role in VAI_TRO_BAT_DOI_MAT_KHAU:
        target.must_change_password = True
    logs_repo.add(
        db,
        "RESET_PASSWORD",
        user_id=actor.id,
        school_id=target.school_id,
        target_type="user",
        target_id=target.id,
        detail={"actor": actor.username, "username": target.username},
    )
    db.commit()
    return ResetPasswordOut(user_id=target.id, username=target.username, new_password=mat_khau_moi)
