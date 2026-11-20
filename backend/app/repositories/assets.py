"""Truy vấn bảng assets (mô hình 3D) – không chứa nghiệp vụ."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Asset, Lesson, User


def add(db: Session, asset: Asset) -> Asset:
    """Thêm bản ghi và flush để có id (chưa commit)."""
    db.add(asset)
    db.flush()
    return asset


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_page(
    db: Session, *, q: str | None, offset: int, limit: int
) -> tuple[list[tuple[Asset, str | None, int]], int]:
    """Danh sách mới nạp trước, kèm tên người nạp và số bài đang dùng."""
    dieu_kien: list[Any] = []
    if q:
        dieu_kien.append(Asset.name.ilike(f"%{_escape_like(q)}%", escape="\\"))
    total = db.scalar(select(func.count()).select_from(Asset).where(*dieu_kien)) or 0
    so_bai = select(func.count()).where(Lesson.asset_id == Asset.id).correlate(Asset).scalar_subquery()
    rows = db.execute(
        select(Asset, User.full_name, so_bai)
        .outerjoin(User, User.id == Asset.uploaded_by)
        .where(*dieu_kien)
        .order_by(Asset.created_at.desc(), Asset.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [(a, ten, so) for a, ten, so in rows], total


def get_with_uploader(db: Session, asset_id: int) -> tuple[Asset, str | None] | None:
    row = db.execute(
        select(Asset, User.full_name).outerjoin(User, User.id == Asset.uploaded_by).where(Asset.id == asset_id)
    ).first()
    return (row[0], row[1]) if row else None


def get_for_update(db: Session, asset_id: int) -> Asset | None:
    """Khóa dòng: bài học mới gắn mô hình này (khóa ngoại cần KEY SHARE) phải chờ đến khi xóa xong."""
    return db.scalar(select(Asset).where(Asset.id == asset_id).with_for_update())


def lessons_using(db: Session, asset_id: int) -> list[Lesson]:
    return list(db.scalars(select(Lesson).where(Lesson.asset_id == asset_id).order_by(Lesson.title, Lesson.id)))


def delete(db: Session, asset: Asset) -> None:
    db.delete(asset)
    db.flush()
