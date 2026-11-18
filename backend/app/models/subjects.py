from sqlalchemy import SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(Text)
    min_grade: Mapped[int | None] = mapped_column(SmallInteger)
    max_grade: Mapped[int | None] = mapped_column(SmallInteger)
