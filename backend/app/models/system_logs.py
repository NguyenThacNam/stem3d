from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SystemLog(Base):
    """Nhật ký thao tác quan trọng. Xóa user/trường thì nhật ký vẫn giữ; tên tài khoản lưu trong detail."""

    __tablename__ = "system_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(30))
    target_type: Mapped[str | None] = mapped_column(String(20))
    target_id: Mapped[int | None]
    detail: Mapped[Any | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
