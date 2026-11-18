"""Năm học hiện tại: từ 1/8 năm N đến 31/7 năm N+1 (theo giờ Việt Nam)."""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from pydantic import TypeAdapter, ValidationError

from app.core.clock import current_school_year
from app.schemas.common import UtcInputDatetime


@pytest.mark.parametrize(
    ("now_utc", "nam_hoc"),
    [
        (datetime(2026, 11, 18, 7, 0), "2026-2027"),
        (datetime(2027, 1, 15, 0, 0), "2026-2027"),
        # 31/7/2027 23:59:59 giờ VN = 16:59:59 UTC -> vẫn năm học cũ.
        (datetime(2027, 7, 31, 16, 59, 59), "2026-2027"),
        # 1/8/2027 00:00 giờ VN = 31/7 17:00 UTC -> năm học mới.
        (datetime(2027, 7, 31, 17, 0, 0), "2027-2028"),
        (datetime(2027, 8, 1, 0, 0), "2027-2028"),
        # 31/7 và 1/8 tính đúng cả khi chưa sang ngày theo UTC.
        (datetime(2026, 7, 31, 12, 0), "2025-2026"),
        (datetime(2026, 12, 31, 23, 0), "2026-2027"),
    ],
)
def test_nam_hoc_ngay_bien(now_utc: datetime, nam_hoc: str) -> None:
    assert current_school_year(now_utc) == nam_hoc


def test_nam_hoc_nhan_gio_co_mui_gio() -> None:
    gio_vn = timezone(timedelta(hours=7))
    assert current_school_year(datetime(2027, 8, 1, 0, 0, tzinfo=gio_vn)) == "2027-2028"
    assert current_school_year(datetime(2027, 7, 31, 23, 59, tzinfo=gio_vn)) == "2026-2027"
    assert current_school_year(datetime(2027, 7, 31, 17, 0, tzinfo=UTC)) == "2027-2028"


def test_gio_gui_len_phai_co_mui_gio_va_doi_ve_utc() -> None:
    kieu = TypeAdapter(UtcInputDatetime)

    assert kieu.validate_python("2026-11-18T14:00:00+07:00") == datetime(2026, 11, 18, 7, 0)
    assert kieu.validate_python("2026-11-18T07:00:00Z") == datetime(2026, 11, 18, 7, 0)
    with pytest.raises(ValidationError) as loi:
        kieu.validate_python("2026-11-18T14:00:00")
    assert loi.value.errors()[0]["type"] == "timezone_aware"
