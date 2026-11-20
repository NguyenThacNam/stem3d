"""Nghiệp vụ soạn câu hỏi kiểm tra nhanh (UC 23; API 57–59). Biên tập viên, quản trị hệ thống.

Quyết định đã chốt với người dùng (TIEN_DO.md mục 5, ND04):
- Chỉ bài NHÁP mới thêm / sửa / xóa câu hỏi được (UC 23: tiền điều kiện) → bài đã xuất bản trả 409 LESSON_PUBLISHED.
- Khuôn dạng theo loại câu (đặc tả không quy định):
  - CHOICE: `options` = 2–6 phương án, `answer` = `{"index": i}`; chưa chọn đáp án đúng thì không cho lưu (UC 23, 3.1).
  - PICK_PART: `options` = null, `answer` = `{"part_id": id}` – bộ phận của chính bài (API 56 giữ id bộ phận).
  - NUMERIC: `options` = `{"unit": "..."}` hoặc null, `answer` = `{"value": số}`, `tolerance` ≥ 0 bắt buộc.
- Câu mới thêm vào cuối; API 58 nhận `sort_order` (vị trí mới) để sắp lại thứ tự cả bài.
- Nhật ký chỉ ghi tên trường đã đổi, không ghi đáp án, phương án, sai số.
"""

import math
import unicodedata
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Lesson, Question
from app.repositories import editor_lessons as repo
from app.schemas.editor_lessons import SO_CAU_HOI_TOI_DA, QuestionIn, QuestionOut, QuestionUpdate
from app.services import nhat_ky
from app.services.auth import CurrentUser

SO_PHUONG_AN = (2, 6)
PHUONG_AN_TOI_DA = 500
DON_VI_TOI_DA = 30
GIA_TRI_TOI_DA = 1e12
TRUONG_SUA = ("question_type", "content", "options", "answer", "tolerance", "sort_order")


def _khong_thay_bai() -> AppError:
    return AppError(404, "LESSON_NOT_FOUND", "Không tìm thấy bài học, có thể bài đã bị xóa")


def _khong_thay_cau() -> AppError:
    return AppError(404, "QUESTION_NOT_FOUND", "Không tìm thấy câu hỏi, có thể câu hỏi đã bị xóa")


def _cau_cua_bai_nhap(db: Session, question_id: int) -> tuple[Question, Lesson]:
    """API 58, 59: tìm câu, khóa bài của câu, rồi ĐỌC LẠI câu sau khi có khóa – người khác vừa xóa / sửa câu đó trong
    lúc chờ khóa thì trả 404 / dùng dữ liệu mới, không ghi nhật ký cho câu đã mất hay lỗi 500 khi cập nhật 0 dòng."""
    q = repo.get_question(db, question_id)
    if q is None:
        raise _khong_thay_cau()
    lesson = _bai_nhap(db, q.lesson_id)
    q = repo.get_question(db, question_id, doc_lai=True)
    if q is None or q.lesson_id != lesson.id:
        raise _khong_thay_cau()
    return q, lesson


def _bai_nhap(db: Session, lesson_id: int) -> Lesson:
    """Khóa dòng bài (xuất bản không chạy chen) và bắt buộc bài đang nháp (UC 23)."""
    lesson = repo.get(db, lesson_id, for_update=True)
    if lesson is None:
        raise _khong_thay_bai()
    if lesson.status == "PUBLISHED":
        raise AppError(
            409,
            "LESSON_PUBLISHED",
            "Bài đã xuất bản nên không sửa được câu hỏi. Hãy gỡ xuất bản trước rồi soạn câu hỏi",
        )
    return lesson


def _out(q: Question) -> QuestionOut:
    return QuestionOut(
        id=q.id,
        question_type=q.question_type,
        content=q.content,
        options=q.options,
        answer=q.answer,
        tolerance=q.tolerance,
        sort_order=q.sort_order,
    )


def _ten(lesson: Lesson, content: str) -> str:
    """Tên câu hỏi trong nhật ký: tên bài + đầu nội dung (nội dung câu hỏi học sinh vốn thấy, không phải đáp án)."""
    return f"{lesson.title}: {content[:80]}"


def _la_so(x: Any) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) and abs(x) <= GIA_TRI_TOI_DA


def _chuan_hoa(db: Session, lesson: Lesson, data: QuestionIn) -> tuple[Any, Any, Decimal | None]:
    """Kiểm tra `options`, `answer`, `tolerance` theo loại câu; trả về giá trị sẽ lưu. Lỗi → 422 theo từng trường.

    Câu báo lỗi không vọng lại giá trị gửi lên."""
    loi: list[dict[str, str]] = []

    def them(truong: str, cau: str) -> None:
        loi.append({"field": truong, "message": cau})

    options: Any = None
    answer: Any = None
    tolerance: Decimal | None = None
    t = data.question_type
    if t == "CHOICE":
        ds = data.options
        if not isinstance(ds, list) or not all(isinstance(x, str) for x in ds):
            them("options", "Hãy nhập các phương án trả lời")
        else:
            ds = [unicodedata.normalize("NFC", x.strip()) for x in ds]
            if not SO_PHUONG_AN[0] <= len(ds) <= SO_PHUONG_AN[1]:
                them("options", f"Câu trắc nghiệm cần từ {SO_PHUONG_AN[0]} đến {SO_PHUONG_AN[1]} phương án")
            da_gap: set[str] = set()
            for i, x in enumerate(ds):
                if not x:
                    them(f"options.{i}", f"Phương án thứ {i + 1} đang trống, hãy nhập hoặc bỏ phương án này")
                elif len(x) > PHUONG_AN_TOI_DA:
                    them(f"options.{i}", f"Phương án thứ {i + 1} dài quá {PHUONG_AN_TOI_DA} ký tự, hãy rút gọn")
                elif x.casefold() in da_gap:
                    them(f"options.{i}", f"Phương án thứ {i + 1} trùng với phương án khác")
                da_gap.add(x.casefold())
            options = ds
        a = data.answer
        chi_so = a.get("index") if isinstance(a, dict) and set(a) == {"index"} else None
        if not (isinstance(chi_so, int) and not isinstance(chi_so, bool)):
            them("answer", "Hãy chọn đáp án đúng")
        elif isinstance(options, list) and not 0 <= chi_so < len(options):
            them("answer", "Đáp án đúng không nằm trong các phương án, hãy chọn lại")
        else:
            answer = {"index": chi_so}
        if data.tolerance is not None:
            them("tolerance", "Câu trắc nghiệm không có sai số cho phép")
    elif t == "PICK_PART":
        if data.options is not None:
            them("options", "Câu chọn bộ phận không có phương án")
        a = data.answer
        pid = a.get("part_id") if isinstance(a, dict) and set(a) == {"part_id"} else None
        id_bo_phan = {p.id for p in repo.parts_of(db, lesson.id)}
        if not id_bo_phan:
            them("answer", "Bài chưa gắn nhãn bộ phận nào. Hãy gắn nhãn ở thẻ Bộ phận trước")
        elif not (isinstance(pid, int) and not isinstance(pid, bool)):
            them("answer", "Hãy chọn bộ phận đúng")
        elif pid not in id_bo_phan:
            them("answer", "Bộ phận đúng không thuộc bài này, hãy tải lại trang rồi chọn lại")
        else:
            answer = {"part_id": pid}
        if data.tolerance is not None:
            them("tolerance", "Câu chọn bộ phận không có sai số cho phép")
    else:  # NUMERIC
        o = data.options
        if o is not None:
            don_vi = o.get("unit") if isinstance(o, dict) and set(o) <= {"unit"} else 0
            if don_vi is not None and not isinstance(don_vi, str):
                them("options", "Đơn vị không hợp lệ")
            elif don_vi and len(don_vi.strip()) > DON_VI_TOI_DA:
                them("options", f"Đơn vị dài quá {DON_VI_TOI_DA} ký tự")
            elif don_vi and don_vi.strip():
                options = {"unit": unicodedata.normalize("NFC", don_vi.strip())}
        a = data.answer
        gia_tri = a.get("value") if isinstance(a, dict) and set(a) == {"value"} else None
        if not _la_so(gia_tri):
            them("answer", "Hãy nhập đáp án là một số")
        else:
            answer = {"value": gia_tri}
        if data.tolerance is None:
            them("tolerance", "Hãy nhập sai số cho phép (nhập 0 nếu phải đúng tuyệt đối)")
        else:
            tolerance = data.tolerance
    if loi:
        raise AppError(422, "VALIDATION_ERROR", "Câu hỏi chưa hợp lệ, hãy kiểm tra các ô được đánh dấu", loi)
    return options, answer, tolerance


def _danh_so_lai(ds: list[Question]) -> None:
    for i, q in enumerate(ds):
        if q.sort_order != i:
            q.sort_order = i


# ---------------------------------------------------------------- API 57
def create_question(db: Session, actor: CurrentUser, lesson_id: int, data: QuestionIn) -> QuestionOut:
    lesson = _bai_nhap(db, lesson_id)
    ds = repo.questions_of(db, lesson.id)
    if len(ds) >= SO_CAU_HOI_TOI_DA:
        raise AppError(400, "QUESTION_LIMIT", f"Mỗi bài có tối đa {SO_CAU_HOI_TOI_DA} câu hỏi, hãy bỏ bớt câu cũ")
    options, answer, tolerance = _chuan_hoa(db, lesson, data)
    _danh_so_lai(ds)  # dữ liệu cũ có thể lệch thứ tự: đưa về 0..n-1 rồi thêm câu mới ở cuối
    q = repo.add_question(
        db,
        Question(
            lesson_id=lesson.id,
            question_type=data.question_type,
            content=data.content,
            options=options,
            answer=answer,
            tolerance=tolerance,
            sort_order=len(ds),
        ),
    )
    nhat_ky.ghi(
        db,
        "CREATE_QUESTION",
        nguoi_lam=actor,
        doi_tuong="question",
        doi_tuong_id=q.id,
        ten_doi_tuong=_ten(lesson, q.content),
        chi_tiet={"lesson_id": lesson.id, "question_type": q.question_type},
    )
    db.commit()
    return _out(q)


# ---------------------------------------------------------------- API 58
def update_question(db: Session, actor: CurrentUser, question_id: int, data: QuestionUpdate) -> QuestionOut:
    q, lesson = _cau_cua_bai_nhap(db, question_id)
    options, answer, tolerance = _chuan_hoa(db, lesson, data)
    cu: dict[str, Any] = {k: getattr(q, k) for k in TRUONG_SUA}
    q.question_type = data.question_type
    q.content = data.content
    q.options = options
    q.answer = answer
    q.tolerance = tolerance
    ds = repo.questions_of(db, lesson.id)
    if data.sort_order is not None:
        ds.remove(q)
        ds.insert(min(data.sort_order, len(ds)), q)
    _danh_so_lai(ds)
    doi = [k for k in TRUONG_SUA if getattr(q, k) != cu[k]]
    if doi:
        nhat_ky.ghi(
            db,
            "UPDATE_QUESTION",
            nguoi_lam=actor,
            doi_tuong="question",
            doi_tuong_id=q.id,
            ten_doi_tuong=_ten(lesson, q.content),
            # Chỉ tên trường, không ghi giá trị (đáp án, phương án, sai số).
            chi_tiet={"lesson_id": lesson.id, "changed_fields": doi},
        )
    db.commit()
    return _out(q)


# ---------------------------------------------------------------- API 59
def delete_question(db: Session, actor: CurrentUser, question_id: int) -> None:
    q, lesson = _cau_cua_bai_nhap(db, question_id)
    nhat_ky.ghi(
        db,
        "DELETE_QUESTION",
        nguoi_lam=actor,
        doi_tuong="question",
        doi_tuong_id=q.id,
        ten_doi_tuong=_ten(lesson, q.content),
        chi_tiet={"lesson_id": lesson.id, "question_type": q.question_type},
    )
    repo.delete_question(db, q)
    _danh_so_lai(repo.questions_of(db, lesson.id))
    db.commit()
