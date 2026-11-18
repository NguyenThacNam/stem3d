from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("grade BETWEEN 1 AND 12", name="grade"),
        CheckConstraint("lesson_type IN ('STRUCTURE','EXPERIMENT')", name="lesson_type"),
        CheckConstraint("status IN ('DRAFT','PUBLISHED')", name="status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # Không ON DELETE: không xóa được môn còn bài, mô hình đang được dùng.
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    grade: Mapped[int | None] = mapped_column(SmallInteger)
    book_series: Mapped[str | None] = mapped_column(String(30), server_default=text("'KNTT'"))
    chapter: Mapped[str | None] = mapped_column(Text)
    lesson_no: Mapped[int | None] = mapped_column(SmallInteger)
    title: Mapped[str] = mapped_column(Text)
    lesson_type: Mapped[str | None] = mapped_column(String(12))
    asset_id: Mapped[int | None] = mapped_column(ForeignKey("assets.id"))
    # Chứa công thức đáp án, sai số cho phép: không bao giờ trả nguyên văn trong API học tập.
    config: Mapped[Any | None] = mapped_column(JSONB)
    thumbnail_path: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10), server_default=text("'DRAFT'"))
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    published_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    published_at: Mapped[datetime | None]
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now())
