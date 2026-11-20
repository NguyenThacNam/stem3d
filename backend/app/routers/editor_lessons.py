"""Soạn bài học – /api/editor/lessons (Bảng 3-6, API 49–56). Biên tập viên, quản trị hệ thống (kế thừa).

Tách khỏi /api/lessons (API học tập 8, 9): các API ở đây trả đầy đủ cấu hình, công thức đáp án, câu hỏi kèm đáp án.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.clock import get_now
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.schemas.common import ID_TOI_DA, IdPath
from app.schemas.editor_lessons import (
    LessonDetailOut,
    LessonIn,
    LessonListOut,
    LessonPartsIn,
    LessonUpdate,
    LessonStatus,
    SubjectOut,
    UnpublishIn,
)
from app.services import editor_lessons as service
from app.services.auth import CurrentUser

router = APIRouter(prefix="/api/editor/lessons", tags=["Soạn bài học"])
subjects_router = APIRouter(prefix="/api/subjects", tags=["Môn học"])

BienTap = require_role("CONTENT_EDITOR")


@subjects_router.get("", response_model=list[SubjectOut])
def list_subjects(
    _actor: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SubjectOut]:
    """API 7 – danh sách môn học và khoảng lớp có môn (mọi vai trò đã đăng nhập)."""
    return service.list_subjects(db)


@router.get("", response_model=LessonListOut)
def list_lessons(
    status: LessonStatus | None = None,
    subject_id: Annotated[int | None, Query(ge=1, le=ID_TOI_DA)] = None,
    grade: Annotated[int | None, Query(ge=1, le=12)] = None,
    q: Annotated[str | None, Query(max_length=200)] = None,
    page: Annotated[int, Query(ge=1, le=100_000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    _actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
) -> LessonListOut:
    """API 49 – mọi bài, cả nháp và đã xuất bản; lọc theo trạng thái, môn, lớp, từ khóa (tên bài, chương)."""
    return service.list_lessons(
        db, status=status, subject_id=subject_id, grade=grade, q=q, page=page, page_size=page_size
    )


@router.post("", response_model=LessonDetailOut, status_code=201)
def create_lesson(
    data: LessonIn,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> LessonDetailOut:
    """API 50 – tạo bài (trạng thái nháp)."""
    return service.create_lesson(db, actor, data, now)


@router.get("/{lesson_id}", response_model=LessonDetailOut)
def get_lesson(
    lesson_id: IdPath,
    _actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
) -> LessonDetailOut:
    """API 51 – bài đầy đủ: cấu hình, nhãn bộ phận, câu hỏi kèm đáp án."""
    return service.get_lesson(db, lesson_id)


@router.put("/{lesson_id}", response_model=LessonDetailOut)
def update_lesson(
    lesson_id: IdPath,
    data: LessonUpdate,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> LessonDetailOut:
    """API 52 – sửa thông tin và cấu hình bài (gửi đủ mọi trường)."""
    return service.update_lesson(db, actor, lesson_id, data, now)


@router.delete("/{lesson_id}", status_code=204)
def delete_lesson(
    lesson_id: IdPath,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
) -> Response:
    """API 53 – xóa bài chưa từng được giao, chưa có bài nộp (xóa cả nhãn bộ phận, câu hỏi)."""
    service.delete_lesson(db, actor, lesson_id)
    return Response(status_code=204)


@router.post("/{lesson_id}/publish", response_model=LessonDetailOut)
def publish_lesson(
    lesson_id: IdPath,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> LessonDetailOut:
    """API 54 – xuất bản; kiểm tra đủ mô hình, nhãn bộ phận, ghi công."""
    return service.publish_lesson(db, actor, lesson_id, now)


@router.post("/{lesson_id}/unpublish", response_model=LessonDetailOut)
def unpublish_lesson(
    lesson_id: IdPath,
    data: Annotated[UnpublishIn | None, Body()] = None,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> LessonDetailOut:
    """API 55 – gỡ xuất bản, chuyển về nháp; bài đang giao còn hạn thì hỏi xác nhận (`{"confirm": true}`)."""
    return service.unpublish_lesson(db, actor, lesson_id, bool(data and data.confirm), now)


@router.put("/{lesson_id}/parts", response_model=LessonDetailOut)
def replace_parts(
    lesson_id: IdPath,
    data: LessonPartsIn,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> LessonDetailOut:
    """API 56 – lưu toàn bộ danh sách nhãn bộ phận (thay cả danh sách; bộ phận gửi kèm id giữ nguyên id)."""
    return service.replace_parts(db, actor, lesson_id, data, now)
