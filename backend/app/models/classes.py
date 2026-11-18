from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SchoolClass(Base):
    """Lớp học (bảng classes). Tên lớp Python tránh trùng từ khóa `class`."""

    __tablename__ = "classes"
    __table_args__ = (
        CheckConstraint("grade BETWEEN 1 AND 12", name="grade"),
        UniqueConstraint("school_id", "name", "school_year"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(20))
    grade: Mapped[int | None] = mapped_column(SmallInteger)
    school_year: Mapped[str] = mapped_column(String(9))
