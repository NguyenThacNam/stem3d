from datetime import date

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint("gender IN ('MALE','FEMALE')", name="gender"),
        UniqueConstraint("school_id", "student_code"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # Phải khớp users.school_id – service đảm bảo.
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"))
    student_code: Mapped[str] = mapped_column(String(20))
    date_of_birth: Mapped[date | None]
    gender: Mapped[str | None] = mapped_column(String(6))
    parent_name: Mapped[str | None] = mapped_column(Text)
    parent_phone: Mapped[str | None] = mapped_column(String(15))
