"""Kiểm tra cấu hình CSDL: đang chạy trên CSDL test, đủ 15 bảng, phiên kết nối giờ UTC, kiểu UtcDatetime."""

from datetime import UTC, datetime, timedelta, timezone

from pydantic import TypeAdapter
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.schemas.common import UtcDatetime

BANG = {
    "schools", "users", "student_profiles", "teacher_profiles", "classes", "class_students",
    "class_teachers", "subjects", "assets", "lessons", "lesson_parts", "questions",
    "assignments", "attempts", "system_logs",
}  # fmt: skip


def test_dang_dung_csdl_test(db: Session) -> None:
    assert db.scalar(text("SELECT current_database()")).endswith("_test")


def test_du_15_bang(db: Session) -> None:
    bang = set(inspect(db.connection()).get_table_names()) - {"alembic_version"}
    assert bang == BANG


def test_phien_ket_noi_gio_utc(db: Session) -> None:
    assert db.scalar(text("SELECT current_setting('TimeZone')")) == "UTC"


def test_utc_datetime_gan_mui_gio() -> None:
    kieu = TypeAdapter(UtcDatetime)

    assert kieu.validate_python(datetime(2026, 11, 18, 7, 0)).isoformat() == "2026-11-18T07:00:00+00:00"
    gio_vn = datetime(2026, 11, 18, 14, 0, tzinfo=timezone(timedelta(hours=7)))
    assert kieu.validate_python(gio_vn) == datetime(2026, 11, 18, 7, 0, tzinfo=UTC)
