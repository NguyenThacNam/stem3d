import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Attempt(Base):
    """Mỗi lần học sinh nộp thí nghiệm hoặc bài kiểm tra."""

    __tablename__ = "attempts"
    __table_args__ = (CheckConstraint("attempt_type IN ('EXPERIMENT','QUIZ')", name="attempt_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    # Do máy học sinh sinh; UNIQUE để nộp bằng INSERT ... ON CONFLICT (client_id) DO NOTHING.
    client_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.user_id", ondelete="CASCADE"))
    # Không ON DELETE: không xóa được bài đã có người nộp.
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"))
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("assignments.id", ondelete="SET NULL"))
    attempt_type: Mapped[str | None] = mapped_column(String(12))
    experiment_data: Mapped[Any | None] = mapped_column(JSONB)
    answers: Mapped[Any | None] = mapped_column(JSONB)
    # Điểm do máy chủ tự chấm lại, không lấy từ máy học sinh.
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    submitted_at: Mapped[datetime]
    synced_at: Mapped[datetime] = mapped_column(server_default=func.now())
