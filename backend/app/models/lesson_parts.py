from typing import Any

from sqlalchemy import ForeignKey, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LessonPart(Base):
    """Bộ phận được gắn nhãn, chú thích trong bài học."""

    __tablename__ = "lesson_parts"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"))
    mesh_names: Mapped[Any] = mapped_column(JSONB)
    label: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    # none_as_null: None ghi thành NULL của SQL (không phải JSON 'null').
    camera_view: Mapped[Any | None] = mapped_column(JSONB(none_as_null=True))
    sort_order: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))
