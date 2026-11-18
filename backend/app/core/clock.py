"""Giờ hệ thống và năm học.

Mọi nghiệp vụ phụ thuộc giờ (khóa tạm, hạn token, năm học) nhận `now` từ dependency `get_now`,
test ghi đè `get_now` để tua giờ, không phải chờ thật.
"""

from datetime import UTC, datetime, timedelta, timezone

# Việt Nam không đổi giờ mùa hè: cố định UTC+7.
GIO_VIET_NAM = timezone(timedelta(hours=7))
THANG_BAT_DAU_NAM_HOC = 8


def utc_now() -> datetime:
    """Giờ UTC không kèm múi giờ – cùng dạng với cột TIMESTAMP trong CSDL."""
    return datetime.now(UTC).replace(tzinfo=None)


def get_now() -> datetime:
    """Dependency lấy giờ hiện tại (UTC, không múi giờ). Test ghi đè để tua giờ."""
    return utc_now()


def current_school_year(now: datetime) -> str:
    """Năm học chứa thời điểm `now`, dạng "N-(N+1)": từ 1/8 năm N đến hết 31/7 năm N+1.

    Ngày biên tính theo giờ Việt Nam. `now` không kèm múi giờ được hiểu là UTC.
    """
    gio_utc = now.replace(tzinfo=UTC) if now.tzinfo is None else now
    gio_vn = gio_utc.astimezone(GIO_VIET_NAM)
    nam = gio_vn.year if gio_vn.month >= THANG_BAT_DAU_NAM_HOC else gio_vn.year - 1
    return f"{nam}-{nam + 1}"
