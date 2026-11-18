"""Kiểu dùng chung cho schema."""

from datetime import UTC, datetime
from typing import Annotated

from pydantic import AfterValidator


def _gan_utc(gia_tri: datetime) -> datetime:
    # CSDL lưu TIMESTAMP không múi giờ nhưng luôn là giờ UTC (phiên kết nối ép timezone=UTC).
    if gia_tri.tzinfo is None:
        return gia_tri.replace(tzinfo=UTC)
    return gia_tri.astimezone(UTC)


# Dùng cho mọi trường thời gian trong schema ...Out: trả ISO 8601 có múi giờ, ví dụ 2026-11-18T07:53:12Z.
UtcDatetime = Annotated[datetime, AfterValidator(_gan_utc)]
