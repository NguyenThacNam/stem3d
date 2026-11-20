"""Nghiệp vụ soạn bài học (UC 20; API 49–55), gắn nhãn bộ phận (UC 22; API 56) và danh sách môn (API 7).

Bài học không thuộc trường nào: biên tập viên, quản trị hệ thống sửa được mọi bài (không có quy tắc sở hữu).

Quyết định đã chốt với người dùng (TIEN_DO.md mục 5, ND02):
- Thiếu điều kiện xuất bản (mô hình, ít nhất một nhãn bộ phận, ghi công với CC BY / CC BY-SA) → 400 LESSON_INCOMPLETE,
  `details` = danh sách phần thiếu.
- Xóa bài đã từng được giao hoặc đã có bài nộp → 409 LESSON_IN_USE (gợi ý gỡ xuất bản).
- Trùng môn + lớp + bộ sách + số bài → 409 DUPLICATE_LESSON; gửi lại với `confirm_duplicate` để lưu (chỉ cảnh báo).
- Gỡ bài đang giao cho lớp còn hạn → 409 LESSON_ASSIGNED; gửi lại với `confirm` để gỡ.
- Sửa bài đã xuất bản được (UC 20 bước 7), trừ khi làm bài mất điều kiện xuất bản → 400 LESSON_INCOMPLETE.
- Gỡ xuất bản giữ `published_by` / `published_at` ("xuất bản lần gần nhất").
- `config` nhận nguyên JSON object, chưa kiểm tra cấu trúc bên trong (chờ thống nhất với Dev Bài học).
"""

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Asset, Lesson, LessonPart
from app.repositories import editor_lessons as repo
from app.schemas.assets import NGUON_CAN_GHI_CONG
from app.schemas.editor_lessons import (
    AssetBrief,
    LessonDetailOut,
    LessonIn,
    LessonListItem,
    LessonListOut,
    LessonPartOut,
    LessonPartsIn,
    QuestionOut,
    SubjectBrief,
    SubjectOut,
)
from app.services import nhat_ky
from app.services.auth import CurrentUser

# Các trường của bài người dùng sửa được (API 52) – dùng để ghi `changed_fields` vào nhật ký.
# Cấu hình (JSONB) tối đa 1 MB khi viết ra JSON: Nginx nhận thân yêu cầu tới 151 MB (dành cho nạp mô hình).
CONFIG_TOI_DA = 1024 * 1024

TRUONG_SUA = ("subject_id", "grade", "book_series", "chapter", "lesson_no", "title", "lesson_type", "asset_id", "config")


def _khong_tim_thay() -> AppError:
    return AppError(404, "LESSON_NOT_FOUND", "Không tìm thấy bài học, có thể bài đã bị xóa")


# ---------------------------------------------------------------- API 7
def list_subjects(db: Session) -> list[SubjectOut]:
    return [
        SubjectOut(id=s.id, code=s.code, name=s.name, min_grade=s.min_grade, max_grade=s.max_grade)
        for s in repo.list_subjects(db)
    ]


# ---------------------------------------------------------------- dựng đầu ra
def _thieu_de_xuat_ban(asset: Asset | None, so_phan: int) -> list[str]:
    thieu: list[str] = []
    if asset is None:
        thieu.append("Chưa chọn mô hình 3D")
    elif asset.source_type in NGUON_CAN_GHI_CONG and not (asset.attribution or "").strip():
        thieu.append("Mô hình theo giấy phép CC BY / CC BY-SA chưa có dòng ghi công tác giả")
    if so_phan == 0:
        thieu.append("Chưa gắn nhãn bộ phận nào")
    return thieu


def _chi_tiet(db: Session, lesson: Lesson) -> LessonDetailOut:
    mon = repo.get_subject(db, lesson.subject_id)
    assert mon is not None  # khóa ngoại NOT NULL
    asset = repo.get_asset(db, lesson.asset_id) if lesson.asset_id else None
    phan = repo.parts_of(db, lesson.id)
    cau_hoi = repo.questions_of(db, lesson.id)
    ten = repo.user_names(db, [lesson.created_by, lesson.published_by])
    return LessonDetailOut(
        id=lesson.id,
        title=lesson.title,
        subject=SubjectBrief(id=mon.id, code=mon.code, name=mon.name),
        grade=lesson.grade,
        book_series=lesson.book_series,
        chapter=lesson.chapter,
        lesson_no=lesson.lesson_no,
        lesson_type=lesson.lesson_type,  # type: ignore[arg-type]
        status=lesson.status,  # type: ignore[arg-type]
        asset=(
            AssetBrief(
                id=asset.id,
                name=asset.name,
                file_url=f"/content/{asset.file_path}",
                source_type=asset.source_type,
                attribution=asset.attribution,
                mesh_names=list(asset.mesh_names or []),
            )
            if asset
            else None
        ),
        config=lesson.config if isinstance(lesson.config, dict) else {},
        parts=[
            LessonPartOut(
                id=p.id,
                mesh_names=list(p.mesh_names or []),
                label=p.label,
                description=p.description,
                camera_view=p.camera_view,
                sort_order=p.sort_order,
            )
            for p in phan
        ],
        questions=[
            QuestionOut(
                id=c.id,
                question_type=c.question_type,
                content=c.content,
                options=c.options,
                answer=c.answer,
                tolerance=c.tolerance,
                sort_order=c.sort_order,
            )
            for c in cau_hoi
        ],
        created_by_name=ten.get(lesson.created_by) if lesson.created_by else None,
        published_by_name=ten.get(lesson.published_by) if lesson.published_by else None,
        updated_at=lesson.updated_at,
        published_at=lesson.published_at,
        missing_for_publish=_thieu_de_xuat_ban(asset, len(phan)),
    )


# ---------------------------------------------------------------- API 49
def list_lessons(
    db: Session,
    *,
    status: str | None,
    subject_id: int | None,
    grade: int | None,
    q: str | None,
    page: int,
    page_size: int,
) -> LessonListOut:
    q = (q or "").strip() or None
    rows, total = repo.list_page(
        db, status=status, subject_id=subject_id, grade=grade, q=q, offset=(page - 1) * page_size, limit=page_size
    )
    return LessonListOut(
        items=[
            LessonListItem(
                id=l.id,
                title=l.title,
                subject=SubjectBrief(id=s.id, code=s.code, name=s.name),
                grade=l.grade,
                book_series=l.book_series,
                chapter=l.chapter,
                lesson_no=l.lesson_no,
                lesson_type=l.lesson_type,  # type: ignore[arg-type]
                status=l.status,  # type: ignore[arg-type]
                asset_id=l.asset_id,
                asset_name=ten_mo_hinh,
                part_count=so_phan,
                question_count=so_cau,
                created_by_name=ten_nguoi_tao,
                updated_at=l.updated_at,
                published_at=l.published_at,
            )
            for l, s, ten_mo_hinh, ten_nguoi_tao, so_phan, so_cau in rows
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------- API 51
def get_lesson(db: Session, lesson_id: int) -> LessonDetailOut:
    lesson = repo.get(db, lesson_id)
    if lesson is None:
        raise _khong_tim_thay()
    return _chi_tiet(db, lesson)


# ---------------------------------------------------------------- API 50, 52
def _kiem_tra_dau_vao(
    db: Session, data: LessonIn, exclude_id: int | None, *, kiem_tra_trung: bool = True
) -> Asset | None:
    """Môn, lớp trong khoảng của môn, mô hình tồn tại; trùng bài thì hỏi lại (trừ khi đã xác nhận)."""
    loi: list[dict[str, str]] = []
    mon = repo.get_subject(db, data.subject_id)
    if mon is None:
        loi.append({"field": "subject_id", "message": "Môn học không tồn tại, hãy chọn lại môn"})
    elif (mon.min_grade and data.grade < mon.min_grade) or (mon.max_grade and data.grade > mon.max_grade):
        if mon.min_grade and mon.max_grade:
            khoang = f"từ lớp {mon.min_grade} đến lớp {mon.max_grade}"
        elif mon.min_grade:
            khoang = f"từ lớp {mon.min_grade}"
        else:
            khoang = f"đến lớp {mon.max_grade}"
        loi.append({"field": "grade", "message": f"Môn {mon.name} chỉ có {khoang}, hãy chọn lại lớp"})
    if len(json.dumps(data.config, ensure_ascii=False).encode("utf-8")) > CONFIG_TOI_DA:
        loi.append({"field": "config", "message": "Cấu hình bài quá lớn (tối đa 1 MB), hãy rút gọn"})
    asset = None
    if data.asset_id is not None:
        asset = repo.get_asset(db, data.asset_id)
        if asset is None:
            loi.append({"field": "asset_id", "message": "Mô hình 3D không tồn tại, hãy chọn mô hình khác"})
    if loi:
        raise AppError(422, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ, hãy kiểm tra các ô được đánh dấu", loi)

    if kiem_tra_trung and data.lesson_no is not None and not data.confirm_duplicate:
        trung = repo.duplicates(
            db,
            subject_id=data.subject_id,
            grade=data.grade,
            book_series=data.book_series,
            lesson_no=data.lesson_no,
            exclude_id=exclude_id,
        )
        if trung:
            raise AppError(
                409,
                "DUPLICATE_LESSON",
                f"Đã có bài số {data.lesson_no} của môn này ở lớp {data.grade}, hãy kiểm tra lại số bài "
                "hoặc xác nhận nếu vẫn muốn lưu",
                [{"id": b.id, "title": b.title, "status": b.status} for b in trung],
            )
    return asset


def _gan(lesson: Lesson, data: LessonIn) -> None:
    lesson.subject_id = data.subject_id
    lesson.grade = data.grade
    lesson.book_series = data.book_series
    lesson.chapter = data.chapter or None
    lesson.lesson_no = data.lesson_no
    lesson.title = data.title
    lesson.lesson_type = data.lesson_type
    lesson.asset_id = data.asset_id
    lesson.config = data.config


def create_lesson(db: Session, actor: CurrentUser, data: LessonIn, now: datetime) -> LessonDetailOut:
    _kiem_tra_dau_vao(db, data, exclude_id=None)
    lesson = Lesson(status="DRAFT", created_by=actor.id, updated_at=now)
    _gan(lesson, data)
    repo.add(db, lesson)
    nhat_ky.ghi(
        db, "CREATE_LESSON", nguoi_lam=actor, doi_tuong="lesson", doi_tuong_id=lesson.id, ten_doi_tuong=lesson.title
    )
    db.commit()
    return _chi_tiet(db, lesson)


def update_lesson(db: Session, actor: CurrentUser, lesson_id: int, data: LessonIn, now: datetime) -> LessonDetailOut:
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_tim_thay()
    # Chỉ hỏi trùng khi đổi môn / lớp / bộ sách / số bài: bài đã xác nhận trùng thì lưu lại không bị hỏi nữa.
    khoa_cu = (lesson.subject_id, lesson.grade, lesson.book_series, lesson.lesson_no)
    khoa_moi = (data.subject_id, data.grade, data.book_series, data.lesson_no)
    asset = _kiem_tra_dau_vao(db, data, exclude_id=lesson.id, kiem_tra_trung=khoa_cu != khoa_moi)

    if lesson.status == "PUBLISHED":
        # Sửa trực tiếp được (UC 20 bước 7) nhưng bài đang xuất bản phải giữ đủ điều kiện.
        thieu = _thieu_de_xuat_ban(asset, repo.count_parts(db, lesson.id))
        if thieu:
            raise AppError(
                400,
                "LESSON_INCOMPLETE",
                "Bài đã xuất bản phải giữ đủ mô hình, nhãn và ghi công. Hãy gỡ xuất bản trước khi sửa lớn",
                thieu,
            )

    cu: dict[str, Any] = {k: getattr(lesson, k) for k in TRUONG_SUA}
    _gan(lesson, data)
    doi = [k for k in TRUONG_SUA if getattr(lesson, k) != cu[k]]
    if doi:
        lesson.updated_at = now
        # Chỉ ghi tên trường đã đổi, không ghi giá trị (cấu hình có công thức đáp án).
        nhat_ky.ghi(
            db,
            "UPDATE_LESSON",
            nguoi_lam=actor,
            doi_tuong="lesson",
            doi_tuong_id=lesson.id,
            ten_doi_tuong=lesson.title,
            chi_tiet={"changed_fields": doi},
        )
    db.commit()
    return _chi_tiet(db, lesson)


# ---------------------------------------------------------------- API 53
def delete_lesson(db: Session, actor: CurrentUser, lesson_id: int) -> None:
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_tim_thay()
    so_giao, so_nop = repo.usage_counts(db, lesson.id)
    if so_giao or so_nop:
        raise AppError(
            409,
            "LESSON_IN_USE",
            "Bài học đã được giao hoặc đã có bài nộp nên không xóa được. Hãy gỡ xuất bản nếu không muốn dùng nữa",
            {"assignment_count": so_giao, "attempt_count": so_nop},
        )
    nhat_ky.ghi(
        db,
        "DELETE_LESSON",
        nguoi_lam=actor,
        doi_tuong="lesson",
        doi_tuong_id=lesson.id,
        ten_doi_tuong=lesson.title,
        chi_tiet={"status": lesson.status},
    )
    repo.delete(db, lesson)
    db.commit()


# ---------------------------------------------------------------- API 54
def publish_lesson(db: Session, actor: CurrentUser, lesson_id: int, now: datetime) -> LessonDetailOut:
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_tim_thay()
    if lesson.status == "PUBLISHED":
        # Bấm hai lần: không đổi gì, không ghi nhật ký.
        return _chi_tiet(db, lesson)
    asset = repo.get_asset(db, lesson.asset_id) if lesson.asset_id else None
    thieu = _thieu_de_xuat_ban(asset, repo.count_parts(db, lesson.id))
    if thieu:
        raise AppError(400, "LESSON_INCOMPLETE", "Bài học còn thiếu nên chưa xuất bản được, hãy bổ sung các phần sau", thieu)
    lesson.status = "PUBLISHED"
    lesson.published_by = actor.id
    lesson.published_at = now
    lesson.updated_at = now
    nhat_ky.ghi(
        db, "PUBLISH_LESSON", nguoi_lam=actor, doi_tuong="lesson", doi_tuong_id=lesson.id, ten_doi_tuong=lesson.title
    )
    db.commit()
    return _chi_tiet(db, lesson)


# ---------------------------------------------------------------- API 55
def unpublish_lesson(
    db: Session, actor: CurrentUser, lesson_id: int, confirm: bool, now: datetime
) -> LessonDetailOut:
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_tim_thay()
    if lesson.status == "DRAFT":
        return _chi_tiet(db, lesson)
    dang_giao = repo.active_assignments(db, lesson.id, now)
    if not confirm:
        if dang_giao:
            raise AppError(
                409,
                "LESSON_ASSIGNED",
                f"Bài đang được giao cho {len(dang_giao)} lớp còn hạn, học sinh sẽ không mở được bài. "
                "Hãy xác nhận nếu vẫn muốn gỡ",
                [
                    {"assignment_id": a.id, "class_name": ten_lop, "due_at": a.due_at.isoformat() + "Z" if a.due_at else None}
                    for a, ten_lop in dang_giao
                ],
            )
    lesson.status = "DRAFT"
    lesson.updated_at = now
    nhat_ky.ghi(
        db,
        "UNPUBLISH_LESSON",
        nguoi_lam=actor,
        doi_tuong="lesson",
        doi_tuong_id=lesson.id,
        ten_doi_tuong=lesson.title,
        # Gỡ dù đang giao (đã xác nhận): ghi số bài giao bị ảnh hưởng để tra cứu sau.
        chi_tiet={"active_assignment_count": len(dang_giao)} if dang_giao else None,
    )
    db.commit()
    return _chi_tiet(db, lesson)


# ---------------------------------------------------------------- API 56
TRUONG_BO_PHAN = ("mesh_names", "label", "description", "camera_view", "sort_order")


def _kiem_tra_bo_phan(asset: Asset | None, cu: dict[int, LessonPart], data: LessonPartsIn) -> None:
    """Id thuộc bài và không lặp; mesh có trong mô hình, mỗi mesh thuộc một bộ phận; nhãn không trùng.

    Câu báo lỗi chỉ nói vị trí (bộ phận thứ mấy, phần thứ mấy), không vọng lại tên gửi lên."""
    loi: list[dict[str, str]] = []
    mesh_co = set(asset.mesh_names or []) if asset else set()
    id_da_gap: set[int] = set()
    mesh_da_gap: set[str] = set()
    nhan_da_gap: set[str] = set()
    for i, p in enumerate(data.parts):
        thu = i + 1
        if p.id is not None:
            if p.id not in cu:
                loi.append({"field": f"parts.{i}.id", "message": f"Bộ phận thứ {thu} không thuộc bài này, hãy tải lại trang"})
            elif p.id in id_da_gap:
                loi.append({"field": f"parts.{i}.id", "message": f"Bộ phận thứ {thu} bị gửi lặp, hãy tải lại trang"})
            id_da_gap.add(p.id)
        for j, ten in enumerate(p.mesh_names):
            if ten not in mesh_co:
                loi.append({
                    "field": f"parts.{i}.mesh_names.{j}",
                    "message": f"Phần thứ {j + 1} của bộ phận thứ {thu} không có trong mô hình, hãy bỏ phần này",
                })
            elif ten in mesh_da_gap:
                loi.append({
                    "field": f"parts.{i}.mesh_names.{j}",
                    "message": f"Phần thứ {j + 1} của bộ phận thứ {thu} đã thuộc bộ phận khác, mỗi phần chỉ gắn một nhãn",
                })
            mesh_da_gap.add(ten)
        khoa_nhan = p.label.casefold()
        if khoa_nhan in nhan_da_gap:
            loi.append({"field": f"parts.{i}.label", "message": f"Nhãn của bộ phận thứ {thu} trùng với bộ phận khác"})
        nhan_da_gap.add(khoa_nhan)
    if loi:
        raise AppError(422, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ, hãy kiểm tra các bộ phận được đánh dấu", loi)


def replace_parts(
    db: Session, actor: CurrentUser, lesson_id: int, data: LessonPartsIn, now: datetime
) -> LessonDetailOut:
    """Thay toàn bộ danh sách bộ phận trong một giao dịch. Bộ phận gửi kèm id thì sửa tại chỗ (giữ id để câu hỏi
    "chọn bộ phận" của ND04 không mất liên kết), không id thì thêm mới, bộ phận cũ không gửi lên thì xóa."""
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_tim_thay()
    asset = repo.get_asset(db, lesson.asset_id) if lesson.asset_id else None
    if asset is None and data.parts:
        raise AppError(400, "LESSON_NO_ASSET", "Bài chưa chọn mô hình 3D, hãy chọn mô hình ở thẻ Mô hình trước khi gắn nhãn")
    if lesson.status == "PUBLISHED" and not data.parts:
        raise AppError(
            400,
            "LESSON_INCOMPLETE",
            "Bài đã xuất bản phải có ít nhất một nhãn bộ phận. Hãy gỡ xuất bản trước nếu muốn xóa hết nhãn",
            ["Chưa gắn nhãn bộ phận nào"],
        )
    cu = {p.id: p for p in repo.parts_of(db, lesson.id)}
    _kiem_tra_bo_phan(asset, cu, data)

    giu = {p.id for p in data.parts if p.id is not None}
    bo = [p for pid, p in cu.items() if pid not in giu]
    # Bộ phận đang là đáp án của câu "chọn bộ phận" (ND04) thì không xóa được: sửa / xóa câu hỏi đó trước.
    id_bo = {p.id for p in bo}
    dang_dung = [
        c
        for c in repo.questions_of(db, lesson.id)
        if c.question_type == "PICK_PART" and isinstance(c.answer, dict) and c.answer.get("part_id") in id_bo
    ]
    if dang_dung:
        raise AppError(
            409,
            "PART_IN_USE",
            "Có bộ phận đang là đáp án của câu hỏi nên chưa xóa được. Hãy sửa hoặc xóa các câu hỏi đó trước",
            # Không trả đáp án: chỉ id, thứ tự, nội dung câu hỏi và nhãn bộ phận bị xóa (biên tập viên vốn thấy).
            [
                {
                    "question_id": c.id,
                    "question_no": c.sort_order + 1,
                    "content": c.content,
                    "part_label": cu[c.answer["part_id"]].label,
                }
                for c in dang_dung
            ],
        )
    repo.delete_parts(db, bo)
    doi: set[str] = set()
    so_them = 0
    for i, p in enumerate(data.parts):
        moi = {
            "mesh_names": list(p.mesh_names),
            "label": p.label,
            "description": p.description or None,
            "camera_view": p.camera_view.model_dump(mode="json") if p.camera_view else None,
            "sort_order": i,
        }
        if p.id is None:
            repo.add_part(db, LessonPart(lesson_id=lesson.id, **moi))
            so_them += 1
            continue
        dong = cu[p.id]
        for k, v in moi.items():
            if getattr(dong, k) != v:
                setattr(dong, k, v)
                doi.add(k)

    if bo or so_them or doi:
        lesson.updated_at = now
        # Chỉ ghi tên trường đã đổi và số bộ phận, không ghi nhãn / chú thích.
        nhat_ky.ghi(
            db,
            "UPDATE_LESSON_PARTS",
            nguoi_lam=actor,
            doi_tuong="lesson",
            doi_tuong_id=lesson.id,
            ten_doi_tuong=lesson.title,
            chi_tiet={
                "changed_fields": [k for k in TRUONG_BO_PHAN if k in doi],
                "part_count": len(data.parts),
                "added_count": so_them,
                "removed_count": len(bo),
            },
        )
    db.commit()
    return _chi_tiet(db, lesson)
