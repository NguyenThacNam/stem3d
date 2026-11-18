from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

# Một nguồn duy nhất cho danh sách vai trò: CHECK của bảng dựng từ đây (require_role sau này cũng dùng).
ROLES = ("SYSTEM_ADMIN", "CONTENT_EDITOR", "SCHOOL_ADMIN", "TEACHER", "STUDENT")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN (" + ",".join(f"'{r}'" for r in ROLES) + ")", name="role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # NULL với CONTENT_EDITOR, SYSTEM_ADMIN; vai trò thuộc trường (kể cả SCHOOL_ADMIN) bắt buộc có – service kiểm tra.
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"))
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(15))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(15))
    is_active: Mapped[bool] = mapped_column(server_default=text("true"))
    last_login_at: Mapped[datetime | None]
    must_change_password: Mapped[bool] = mapped_column(server_default=text("false"))
    failed_login_count: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
    locked_until: Mapped[datetime | None]
    token_version: Mapped[int] = mapped_column(server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
