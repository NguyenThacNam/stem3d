from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Assignment(Base):
    """Bài giáo viên giao cho lớp."""

    __tablename__ = "assignments"
    __table_args__ = (
        CheckConstraint("requirement IN ('EXPERIMENT','QUIZ','BOTH')", name="requirement"),
        CheckConstraint("due_at IS NULL OR due_at > open_at", name="due_after_open"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"))
    # Không ON DELETE: không xóa được bài đang được giao.
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"))
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("teacher_profiles.user_id", ondelete="SET NULL")
    )
    requirement: Mapped[str | None] = mapped_column(String(12))
    open_at: Mapped[datetime]
    due_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
