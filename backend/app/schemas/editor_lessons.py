"""Schema soạn bài học – /api/editor/lessons (Bảng 3-6, API 49–55; UC 20) và môn học – /api/subjects (API 7).

API soạn bài trả đầy đủ cấu hình, công thức đáp án, câu hỏi kèm đáp án (chương 3 mục 3.1.3: tách /api/editor để API
học tập 8, 9 không bao giờ trả các trường này). KHÔNG dùng lại schema này cho API học tập.
"""

from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, StringConstraints

from app.schemas.common import ID_TOI_DA, UtcDatetime

LessonType = Literal["STRUCTURE", "EXPERIMENT"]
LessonStatus = Literal["DRAFT", "PUBLISHED"]

# SMALLINT của PostgreSQL: số bài ngoài khoảng trả 422, không để CSDL báo tràn số (500).
SO_BAI_TOI_DA = 32767

TieuDe = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
BoSach = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=30)]
Chuong = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


# ---------------------------------------------------------------- API 7
class SubjectOut(BaseModel):
    id: int
    code: str
    name: str
    min_grade: int | None
    max_grade: int | None


# ---------------------------------------------------------------- đầu vào API 50, 52
class LessonIn(BaseModel):
    """Toàn bộ thông tin bài (API 52 thay cả bản ghi, không vá từng trường).

    Không nhận `status`, `created_by`, `published_by`, `published_at`: máy chủ tự đặt. `config` chỉ cần là JSON
    object; cấu trúc bên trong chờ thống nhất với Dev Bài học (TIEN_DO.md mục 10, "Cấu hình bài học").
    """

    subject_id: int = Field(ge=1, le=ID_TOI_DA)
    grade: int = Field(ge=1, le=12)
    book_series: BoSach = "KNTT"
    chapter: Chuong | None = None
    lesson_no: int | None = Field(default=None, ge=1, le=SO_BAI_TOI_DA)
    title: TieuDe
    lesson_type: LessonType
    asset_id: int | None = Field(default=None, ge=1, le=ID_TOI_DA)
    config: dict[str, Any] = Field(default_factory=dict)
    # Trùng môn + lớp + bộ sách + số bài với bài khác: lần đầu trả 409 DUPLICATE_LESSON, gửi lại với true để lưu.
    confirm_duplicate: bool = False


class LessonUpdate(LessonIn):
    """Đầu vào API 52: thay cả bản ghi nên các trường có giá trị mặc định ở API 50 ở đây BẮT BUỘC gửi (được gửi
    null) – gửi thiếu `config` hay `asset_id` sẽ là 422 chứ không âm thầm xóa công thức chấm, bỏ mô hình."""

    book_series: BoSach
    chapter: Chuong | None
    lesson_no: int | None = Field(ge=1, le=SO_BAI_TOI_DA)
    asset_id: int | None = Field(ge=1, le=ID_TOI_DA)
    config: dict[str, Any]


class UnpublishIn(BaseModel):
    # Bài đang được giao cho lớp còn hạn: lần đầu trả 409 LESSON_ASSIGNED, gửi lại với true để gỡ.
    confirm: bool = False


# ---------------------------------------------------------------- đầu ra
class SubjectBrief(BaseModel):
    id: int
    code: str
    name: str


class AssetBrief(BaseModel):
    id: int
    name: str
    file_url: str
    source_type: str
    attribution: str | None
    mesh_names: list[str]


class LessonListItem(BaseModel):
    """Một dòng của API 49 – không có `config`."""

    id: int
    title: str
    subject: SubjectBrief
    grade: int | None
    book_series: str | None
    chapter: str | None
    lesson_no: int | None
    lesson_type: LessonType | None
    status: LessonStatus
    asset_id: int | None
    asset_name: str | None
    part_count: int
    question_count: int
    created_by_name: str | None
    updated_at: UtcDatetime
    published_at: UtcDatetime | None


class LessonListOut(BaseModel):
    items: list[LessonListItem]
    total: int
    page: int
    page_size: int


class LessonPartOut(BaseModel):
    id: int
    mesh_names: list[str]
    label: str
    description: str | None
    camera_view: Any | None
    sort_order: int


class QuestionOut(BaseModel):
    """Câu hỏi KÈM đáp án và sai số – chỉ dùng trong API soạn bài."""

    id: int
    question_type: str
    content: str
    options: Any | None
    answer: Any
    tolerance: Decimal | None
    sort_order: int


class LessonDetailOut(BaseModel):
    """Đầu ra API 50–52, 54, 55: bài đầy đủ cho màn soạn bài."""

    id: int
    title: str
    subject: SubjectBrief
    grade: int | None
    book_series: str | None
    chapter: str | None
    lesson_no: int | None
    lesson_type: LessonType | None
    status: LessonStatus
    asset: AssetBrief | None
    config: dict[str, Any]
    parts: list[LessonPartOut]
    questions: list[QuestionOut]
    created_by_name: str | None
    published_by_name: str | None
    updated_at: UtcDatetime
    published_at: UtcDatetime | None
    # Phần còn thiếu để xuất bản (rỗng: đủ điều kiện). Giao diện hiện sẵn, không phải bấm Xuất bản mới biết.
    missing_for_publish: list[str]
