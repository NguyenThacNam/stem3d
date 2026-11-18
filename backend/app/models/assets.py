from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Asset(Base):
    """Mô hình 3D đã nạp."""

    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('SELF_BUILT','COMMISSIONED','CC0','CC_BY','CC_BY_SA')", name="source_type"
        ),
        # Mô hình CC BY / CC BY-SA bắt buộc có dòng ghi công.
        CheckConstraint("source_type NOT IN ('CC_BY','CC_BY_SA') OR attribution IS NOT NULL", name="attribution"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str] = mapped_column(Text)
    file_size: Mapped[int | None]
    triangle_count: Mapped[int | None]
    max_texture_px: Mapped[int | None]
    mesh_names: Mapped[Any | None] = mapped_column(JSONB)
    source_type: Mapped[str] = mapped_column(String(20))
    attribution: Mapped[str | None] = mapped_column(Text)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
