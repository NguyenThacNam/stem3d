"""Kiểu dùng chung cho schema."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Path
from pydantic import AfterValidator, AwareDatetime, Field

from app.core.security import MAT_KHAU_TOI_DA_BYTE

# Khóa chính SERIAL là INT 4 byte: id ngoài khoảng trả 422 thay vì để CSDL báo tràn số (500).
ID_TOI_DA = 2_147_483_647
IdPath = Annotated[int, Path(ge=1, le=ID_TOI_DA)]


def _gan_utc(gia_tri: datetime) -> datetime:
    # CSDL lưu TIMESTAMP không múi giờ nhưng luôn là giờ UTC (phiên kết nối ép timezone=UTC).
    if gia_tri.tzinfo is None:
        return gia_tri.replace(tzinfo=UTC)
    return gia_tri.astimezone(UTC)


def _ve_utc_khong_mui_gio(gia_tri: datetime) -> datetime:
    return gia_tri.astimezone(UTC).replace(tzinfo=None)


def _kiem_tra_do_dai_byte(mat_khau: str) -> str:
    if len(mat_khau.encode("utf-8")) > MAT_KHAU_TOI_DA_BYTE:
        raise ValueError("Mật khẩu quá dài: tối đa 72 byte (chữ có dấu tính 2–3 byte), hãy rút ngắn")
    return mat_khau


# Trường thời gian trong schema ...Out: trả ISO 8601 có múi giờ, ví dụ 2026-11-18T07:53:12Z.
UtcDatetime = Annotated[datetime, AfterValidator(_gan_utc)]

# Trường thời gian gửi lên: bắt buộc có múi giờ, đổi sang UTC không múi giờ để ghi CSDL.
UtcInputDatetime = Annotated[AwareDatetime, AfterValidator(_ve_utc_khong_mui_gio)]

# Mật khẩu mới (đổi mật khẩu, đặt mật khẩu): tối thiểu 8 ký tự, tối đa 72 byte UTF-8.
NewPassword = Annotated[str, Field(min_length=8), AfterValidator(_kiem_tra_do_dai_byte)]
