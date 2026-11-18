from sqlalchemy import CheckConstraint, ForeignKey, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"
    __table_args__ = (CheckConstraint("position IN ('TEACHER','HEAD','DEPUTY_HEAD')", name="position"),)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    # Phải khớp users.school_id – service đảm bảo.
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id", ondelete="CASCADE"))
    teacher_code: Mapped[str | None] = mapped_column(String(20))
    department: Mapped[str | None] = mapped_column(Text)
    position: Mapped[str] = mapped_column(String(12), server_default=text("'TEACHER'"))
