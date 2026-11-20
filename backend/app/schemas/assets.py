"""Schema nhóm mô hình 3D – /api/assets (Bảng 3-6, API 45–48; Bảng 3-11)."""

from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

SourceType = Literal["SELF_BUILT", "COMMISSIONED", "CC0", "CC_BY", "CC_BY_SA"]
# Giấy phép bắt buộc ghi công tác giả (phụ lục CSDL: CHECK attribution).
NGUON_CAN_GHI_CONG = {"CC_BY", "CC_BY_SA"}

ChiSo = Literal["file_size", "triangle_count", "max_texture_px"]


class AssetCheckItem(BaseModel):
    """Một chỉ số vượt ngưỡng: dùng cho `warnings` (vượt mức cảnh báo) và `details` của LIMIT_EXCEEDED."""

    field: ChiSo
    value: int
    limit: int
    message: str


class AssetUploadOut(BaseModel):
    """Đầu ra API 46 (201)."""

    id: int
    file_size: int
    triangle_count: int
    max_texture_px: int | None
    mesh_names: list[str]
    unnamed_meshes: int
    warnings: list[AssetCheckItem]


class AssetLessonRef(BaseModel):
    """Bài học đang dùng mô hình (chỉ tên, trạng thái – không trả cấu hình bài)."""

    id: int
    title: str
    status: str


class AssetListItem(BaseModel):
    """Một dòng của API 45."""

    id: int
    name: str
    file_url: str
    source_type: SourceType
    attribution: str | None
    file_size: int | None
    triangle_count: int | None
    max_texture_px: int | None
    mesh_count: int
    uploaded_by_name: str | None
    created_at: UtcDatetime
    lesson_count: int
    # Các chỉ số vượt mức cảnh báo (giao diện tô vàng).
    warning_fields: list[ChiSo]


class AssetListOut(BaseModel):
    """Đầu ra API 45 (phân trang theo quy ước chung)."""

    items: list[AssetListItem]
    total: int
    page: int
    page_size: int


class AssetDetailOut(AssetListItem):
    """Đầu ra API 47: báo cáo kiểm tra và danh sách mesh."""

    mesh_names: list[str]
    warnings: list[AssetCheckItem]
    lessons: list[AssetLessonRef]
