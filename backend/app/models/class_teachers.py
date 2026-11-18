from sqlalchemy import ForeignKey, Index, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ClassTeacher(Base):
    """Phân công giảng dạy: giáo viên dạy môn gì ở lớp nào, ai chủ nhiệm."""

    __tablename__ = "class_teachers"
    __table_args__ = (
        # Mỗi lớp tối đa một giáo viên chủ nhiệm (chỉ mục duy nhất một phần).
        Index("uq_class_homeroom", "class_id", unique=True, postgresql_where=text("is_homeroom")),
    )

    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), primary_key=True)
    teacher_id: Mapped[int] = mapped_column(
        ForeignKey("teacher_profiles.user_id", ondelete="CASCADE"), primary_key=True
    )
    # Không ON DELETE: không xóa được môn đang có phân công.
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), primary_key=True)
    is_homeroom: Mapped[bool] = mapped_column(server_default=text("false"))
