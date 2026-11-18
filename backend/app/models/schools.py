from datetime import datetime

from sqlalchemy import CheckConstraint, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class School(Base):
    __tablename__ = "schools"
    __table_args__ = (
        CheckConstraint("level IN ('PRIMARY','LOWER_SECONDARY','UPPER_SECONDARY','MULTI')", name="level"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(Text)
    level: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
