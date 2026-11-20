"""Truy vấn bài học cho màn soạn bài (lessons, lesson_parts, questions) và môn học – không chứa nghiệp vụ."""

from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, aliased

from app.models import Asset, Assignment, Attempt, Lesson, LessonPart, Question, SchoolClass, Subject, User


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


# ---------------------------------------------------------------- môn học
def list_subjects(db: Session) -> list[Subject]:
    return list(db.scalars(select(Subject).order_by(Subject.min_grade.nulls_last(), Subject.id)))


def get_subject(db: Session, subject_id: int) -> Subject | None:
    return db.get(Subject, subject_id)


def get_asset(db: Session, asset_id: int) -> Asset | None:
    return db.get(Asset, asset_id)


# ---------------------------------------------------------------- bài học
def list_page(
    db: Session,
    *,
    status: str | None,
    subject_id: int | None,
    grade: int | None,
    q: str | None,
    offset: int,
    limit: int,
) -> tuple[list[tuple[Lesson, Subject, str | None, str | None, int, int]], int]:
    """Mới sửa trước; kèm môn, tên mô hình, tên người tạo, số bộ phận, số câu hỏi."""
    dieu_kien: list[Any] = []
    if status:
        dieu_kien.append(Lesson.status == status)
    if subject_id:
        dieu_kien.append(Lesson.subject_id == subject_id)
    if grade:
        dieu_kien.append(Lesson.grade == grade)
    if q:
        mau = f"%{_escape_like(q)}%"
        dieu_kien.append(or_(Lesson.title.ilike(mau, escape="\\"), Lesson.chapter.ilike(mau, escape="\\")))
    total = db.scalar(select(func.count()).select_from(Lesson).where(*dieu_kien)) or 0
    so_phan = (
        select(func.count()).where(LessonPart.lesson_id == Lesson.id).correlate(Lesson).scalar_subquery()
    )
    so_cau = select(func.count()).where(Question.lesson_id == Lesson.id).correlate(Lesson).scalar_subquery()
    rows = db.execute(
        select(Lesson, Subject, Asset.name, User.full_name, so_phan, so_cau)
        .join(Subject, Subject.id == Lesson.subject_id)
        .outerjoin(Asset, Asset.id == Lesson.asset_id)
        .outerjoin(User, User.id == Lesson.created_by)
        .where(*dieu_kien)
        .order_by(Lesson.updated_at.desc(), Lesson.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [(l, s, a, u, p, c) for l, s, a, u, p, c in rows], total


def get(db: Session, lesson_id: int, *, for_update: bool = False) -> Lesson | None:
    cau = select(Lesson).where(Lesson.id == lesson_id)
    if for_update:
        # Khóa dòng: xuất bản / gỡ / xóa không chạy chen với nhau hay với việc giao bài (khóa ngoại cần KEY SHARE).
        cau = cau.with_for_update()
    return db.scalar(cau)


def user_names(db: Session, ids: list[int | None]) -> dict[int, str]:
    ids_ = [i for i in ids if i is not None]
    if not ids_:
        return {}
    return dict(db.execute(select(User.id, User.full_name).where(User.id.in_(ids_))).tuples().all())


def parts_of(db: Session, lesson_id: int) -> list[LessonPart]:
    return list(
        db.scalars(select(LessonPart).where(LessonPart.lesson_id == lesson_id).order_by(LessonPart.sort_order, LessonPart.id))
    )


def questions_of(db: Session, lesson_id: int) -> list[Question]:
    return list(
        db.scalars(select(Question).where(Question.lesson_id == lesson_id).order_by(Question.sort_order, Question.id))
    )


def count_parts(db: Session, lesson_id: int) -> int:
    return db.scalar(select(func.count()).where(LessonPart.lesson_id == lesson_id)) or 0


def duplicates(
    db: Session, *, subject_id: int, grade: int, book_series: str, lesson_no: int, exclude_id: int | None
) -> list[Lesson]:
    cau = select(Lesson).where(
        Lesson.subject_id == subject_id,
        Lesson.grade == grade,
        Lesson.book_series == book_series,
        Lesson.lesson_no == lesson_no,
    )
    if exclude_id is not None:
        cau = cau.where(Lesson.id != exclude_id)
    return list(db.scalars(cau.order_by(Lesson.id)))


def active_assignments(db: Session, lesson_id: int, now: datetime) -> list[tuple[Assignment, str]]:
    """Bài giao còn hạn (chưa có hạn hoặc hạn sau `now`), kèm tên lớp."""
    lop = aliased(SchoolClass)
    rows = db.execute(
        select(Assignment, lop.name)
        .join(lop, lop.id == Assignment.class_id)
        .where(Assignment.lesson_id == lesson_id, or_(Assignment.due_at.is_(None), Assignment.due_at > now))
        .order_by(Assignment.due_at.nulls_last(), Assignment.id)
    ).all()
    return [(a, ten) for a, ten in rows]


def usage_counts(db: Session, lesson_id: int) -> tuple[int, int]:
    """Số bài giao, số bài nộp của bài học."""
    so_giao = db.scalar(select(func.count()).where(Assignment.lesson_id == lesson_id)) or 0
    so_nop = db.scalar(select(func.count()).where(Attempt.lesson_id == lesson_id)) or 0
    return so_giao, so_nop


def add(db: Session, lesson: Lesson) -> Lesson:
    db.add(lesson)
    db.flush()
    return lesson


def delete(db: Session, lesson: Lesson) -> None:
    """lesson_parts, questions xóa theo (ON DELETE CASCADE)."""
    db.delete(lesson)
    db.flush()


# ---------------------------------------------------------------- nhãn bộ phận (API 56)
def add_part(db: Session, part: LessonPart) -> None:
    db.add(part)


def delete_parts(db: Session, parts: list[LessonPart]) -> None:
    for p in parts:
        db.delete(p)
