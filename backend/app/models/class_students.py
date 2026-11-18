from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ClassStudent(Base):
    """Học sinh thuộc lớp. Mỗi học sinh một lớp trong một năm học – service đảm bảo."""

    __tablename__ = "class_students"

    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.user_id", ondelete="CASCADE"), primary_key=True
    )
