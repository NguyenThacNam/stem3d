"""Truy vấn tài khoản, trường – không chứa nghiệp vụ."""

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.models import ClassStudent, ClassTeacher, School, SchoolClass, User


def get_by_username(db: Session, username: str, *, for_update: bool = False) -> User | None:
    lenh = select(User).where(User.username == username)
    if for_update:
        lenh = lenh.with_for_update()
    return db.scalars(lenh).one_or_none()


def get_by_id(db: Session, user_id: int, *, for_update: bool = False) -> User | None:
    lenh = select(User).where(User.id == user_id)
    if for_update:
        lenh = lenh.with_for_update()
    return db.scalars(lenh).one_or_none()


def get_school(db: Session, school_id: int | None) -> School | None:
    return db.get(School, school_id) if school_id is not None else None


def is_homeroom_student(db: Session, teacher_id: int, student_id: int, school_year: str) -> bool:
    """Học sinh có thuộc một lớp năm học `school_year` mà giáo viên này chủ nhiệm không."""
    lenh = select(
        exists()
        .where(ClassStudent.student_id == student_id)
        .where(ClassTeacher.class_id == ClassStudent.class_id)
        .where(ClassTeacher.teacher_id == teacher_id)
        .where(ClassTeacher.is_homeroom.is_(True))
        .where(SchoolClass.id == ClassStudent.class_id)
        .where(SchoolClass.school_year == school_year)
    )
    return bool(db.scalar(lenh))
