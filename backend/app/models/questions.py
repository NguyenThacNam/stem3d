from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, SmallInteger, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("question_type IN ('CHOICE','PICK_PART','NUMERIC')", name="question_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    question_type: Mapped[str] = mapped_column(String(12))
    content: Mapped[str] = mapped_column(Text)
    options: Mapped[Any | None] = mapped_column(JSONB)
    # Đáp án và sai số: không bao giờ gửi xuống máy học sinh trước khi nộp.
    answer: Mapped[Any] = mapped_column(JSONB)
    tolerance: Mapped[Decimal | None] = mapped_column(Numeric)
    sort_order: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
