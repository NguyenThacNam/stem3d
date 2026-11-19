"""Ghi nhật ký thao tác (bảng system_logs) – mọi service gọi `ghi(...)`, không gọi thẳng repository.

Quy tắc (TIEN_DO.md mục 5, NT06; hướng dẫn cho dev: backend/CLAUDE.md mục Nhật ký):
- Chỉ dùng mã có trong HANH_DONG. Thêm mã mới thì thêm vào đây kèm nhãn tiếng Việt (dùng cho bộ lọc VH01).
- `detail` luôn có `actor` (tên tài khoản người làm) và `target_name` (tên đối tượng, nếu có): xóa tài khoản,
  xóa trường thì user_id / school_id thành NULL nhưng vẫn tra được tên. Xóa tài khoản ghi thêm `full_name` (UC14).
- Xóa: gọi ghi() TRƯỚC db.delete(), khi đối tượng còn đọc được tên và khóa ngoại còn hợp lệ.
- Không bao giờ ghi mật khẩu, token, mã băm, đáp án, công thức chấm, sai số (kiểm tra cả khóa lồng bên trong).
  Sửa (UPDATE_*) chỉ ghi tên các trường đã đổi (`changed_fields`), không ghi giá trị cấu hình / câu hỏi.
- IP chỉ ghi cho đăng nhập và mật khẩu. Thao tác thất bại chỉ ghi cho đăng nhập và đổi mật khẩu.
- Nhập Excel (IMPORT_*) chỉ ghi số lượng, số dòng lỗi, tên file – không ghi danh sách tài khoản vừa tạo.
- school_id = trường của đối tượng bị tác động; đối tượng không thuộc trường nào thì lấy trường của người làm.
- Không commit: nhật ký nằm cùng giao dịch với thao tác, thao tác hỏng thì nhật ký cũng không lưu.

Ghi sai quy tắc thì ném LoiGhiNhatKy (lỗi lập trình, test sẽ bắt được).
"""

from typing import Any, Protocol

from sqlalchemy.orm import Session

from app.repositories import system_logs as logs_repo


class LoiGhiNhatKy(Exception):
    """Gọi ghi() sai quy tắc. Là lỗi lập trình, không phải lỗi người dùng."""


class NguoiLam(Protocol):
    """User (model) hoặc CurrentUser đều dùng được."""

    @property
    def id(self) -> int: ...
    @property
    def username(self) -> str: ...
    @property
    def school_id(self) -> int | None: ...


# Mã hành động -> nhãn tiếng Việt. Mã tối đa 30 ký tự (cột action VARCHAR(30)).
HANH_DONG: dict[str, str] = {
    # Đăng nhập, mật khẩu (API 1, 5, 6)
    "LOGIN": "Đăng nhập",
    "LOGIN_FAILED": "Đăng nhập thất bại",
    "LOGIN_LOCKED": "Khóa tạm do sai mật khẩu",
    "CHANGE_PASSWORD": "Đổi mật khẩu",
    "CHANGE_PASSWORD_FAILED": "Đổi mật khẩu thất bại",
    "RESET_PASSWORD": "Đặt lại mật khẩu",
    # Bài giao (API 17, 18)
    "CREATE_ASSIGNMENT": "Giao bài",
    "DELETE_ASSIGNMENT": "Hủy bài giao",
    # Học sinh (API 23–28)
    "CREATE_STUDENT": "Thêm học sinh",
    "UPDATE_STUDENT": "Sửa học sinh",
    "DELETE_STUDENT": "Xóa học sinh",
    "IMPORT_STUDENTS": "Nhập học sinh từ Excel",
    # Giáo viên (API 30–35)
    "CREATE_TEACHER": "Thêm giáo viên",
    "UPDATE_TEACHER": "Sửa giáo viên",
    "DELETE_TEACHER": "Xóa giáo viên",
    "IMPORT_TEACHERS": "Nhập giáo viên từ Excel",
    # Lớp, phân công (API 37–42)
    "CREATE_CLASS": "Tạo lớp",
    "UPDATE_CLASS": "Sửa lớp",
    "DELETE_CLASS": "Xóa lớp",
    "ASSIGN_TEACHER": "Phân công giáo viên",
    "UNASSIGN_TEACHER": "Gỡ phân công giáo viên",
    # Mô hình 3D (API 46, 48)
    "UPLOAD_ASSET": "Nạp mô hình 3D",
    "DELETE_ASSET": "Xóa mô hình 3D",
    # Bài học, nhãn, câu hỏi (API 50–59)
    "CREATE_LESSON": "Tạo bài học",
    "UPDATE_LESSON": "Sửa bài học",
    "DELETE_LESSON": "Xóa bài học",
    "PUBLISH_LESSON": "Xuất bản bài học",
    "UNPUBLISH_LESSON": "Gỡ xuất bản bài học",
    "UPDATE_LESSON_PARTS": "Sửa nhãn bộ phận",
    "CREATE_QUESTION": "Thêm câu hỏi",
    "UPDATE_QUESTION": "Sửa câu hỏi",
    "DELETE_QUESTION": "Xóa câu hỏi",
    # Trường, quản trị trường (API 61–69)
    "CREATE_SCHOOL": "Thêm trường",
    "UPDATE_SCHOOL": "Sửa trường",
    "LOCK_SCHOOL": "Khóa trường",
    "UNLOCK_SCHOOL": "Mở khóa trường",
    "DELETE_SCHOOL": "Xóa trường",
    "CREATE_SCHOOL_ADMIN": "Thêm quản trị trường",
    "UPDATE_SCHOOL_ADMIN": "Sửa quản trị trường",
    "DELETE_SCHOOL_ADMIN": "Xóa quản trị trường",
    # Biên tập viên (API 71–73)
    "CREATE_EDITOR": "Thêm biên tập viên",
    "UPDATE_EDITOR": "Sửa biên tập viên",
    "DELETE_EDITOR": "Xóa biên tập viên",
    # Khóa / mở khóa tài khoản (API 68, 72)
    "LOCK_ACCOUNT": "Khóa tài khoản",
    "UNLOCK_ACCOUNT": "Mở khóa tài khoản",
}

# Giá trị cột target_type (VARCHAR(20)).
DOI_TUONG = {"user", "school", "class", "assignment", "asset", "lesson", "question"}

# Chỉ các mã này được ghi IP (quyết định NT06).
HANH_DONG_GHI_IP = {
    "LOGIN",
    "LOGIN_FAILED",
    "LOGIN_LOCKED",
    "CHANGE_PASSWORD",
    "CHANGE_PASSWORD_FAILED",
    "RESET_PASSWORD",
}

# Nhập Excel: chỉ được ghi đúng các khóa này, giá trị là số hoặc chuỗi.
KHOA_NHAP_EXCEL = {"created_count": int, "error_count": int, "file_name": str}
HANH_DONG_NHAP_EXCEL = {"IMPORT_STUDENTS", "IMPORT_TEACHERS"}

# Khóa trong detail chứa một trong các chuỗi này (không phân biệt hoa thường) thì bị chặn.
CHUOI_CAM = (
    "password",
    "mat_khau",
    "token",
    "hash",
    "secret",
    "answer",
    "dap_an",
    "formula",
    "cong_thuc",
    "tolerance",
    "sai_so",
    # Cấu hình bài học / câu hỏi chứa công thức, sai số, đáp án dưới tên khóa chưa chốt: không ghi cả khối.
    "config",
    "options",
    "correct",
    "expected",
)

KHOA_TU_DIEN = {"actor", "target_name", "ip"}

# Xóa tài khoản: nhật ký giữ cả tên đăng nhập và họ tên (chương 2, UC14).
HANH_DONG_XOA_TAI_KHOAN = {"DELETE_STUDENT", "DELETE_TEACHER", "DELETE_SCHOOL_ADMIN", "DELETE_EDITOR"}


def tim_khoa_cam(gia_tri: Any, duong_dan: str = "detail") -> str | None:
    """Trả đường dẫn của khóa bị cấm đầu tiên (tìm cả trong dict / list lồng nhau), None nếu không có."""
    if isinstance(gia_tri, dict):
        for khoa, con in gia_tri.items():
            ten = str(khoa)
            if any(c in ten.lower() for c in CHUOI_CAM):
                return f"{duong_dan}.{ten}"
            tim = tim_khoa_cam(con, f"{duong_dan}.{ten}")
            if tim:
                return tim
    elif isinstance(gia_tri, (list, tuple)):
        for i, con in enumerate(gia_tri):
            tim = tim_khoa_cam(con, f"{duong_dan}[{i}]")
            if tim:
                return tim
    return None


def _kiem_tra_nhap_excel(chi_tiet: dict[str, Any]) -> None:
    thua = set(chi_tiet) - set(KHOA_NHAP_EXCEL)
    if thua:
        raise LoiGhiNhatKy(f"Nhập Excel chỉ ghi {sorted(KHOA_NHAP_EXCEL)}, không ghi: {sorted(thua)}")
    for khoa, kieu in KHOA_NHAP_EXCEL.items():
        if khoa not in chi_tiet:
            raise LoiGhiNhatKy(f"Nhập Excel phải ghi '{khoa}'")
        gia_tri = chi_tiet[khoa]
        # bool là lớp con của int: không nhận True / False làm số lượng.
        if not isinstance(gia_tri, kieu) or isinstance(gia_tri, bool):
            raise LoiGhiNhatKy(f"'{khoa}' phải có kiểu {kieu.__name__}")


def ghi(
    db: Session,
    ma: str,
    *,
    nguoi_lam: NguoiLam | None,
    doi_tuong: str | None = None,
    doi_tuong_id: int | None = None,
    ten_doi_tuong: str | None = None,
    truong_doi_tuong: int | None = None,
    chi_tiet: dict[str, Any] | None = None,
    ip: str | None = None,
    ten_nguoi_lam: str | None = None,
) -> None:
    """Thêm một dòng nhật ký vào phiên hiện tại (không commit).

    - nguoi_lam: người thực hiện; None chỉ khi đăng nhập bằng tên không tồn tại (truyền ten_nguoi_lam đã che).
    - doi_tuong / doi_tuong_id / ten_doi_tuong: đối tượng bị tác động (target_type / target_id / target_name).
      Thao tác xóa bắt buộc có ten_doi_tuong (sau khi xóa không tra lại được); gọi ghi() trước db.delete().
    - truong_doi_tuong: trường của đối tượng; None thì lấy trường của người làm.
    - chi_tiet: thông tin thêm; không được trùng actor / target_name / ip, không chứa khóa bị cấm.
    """
    if ma not in HANH_DONG:
        raise LoiGhiNhatKy(f"Mã hành động '{ma}' chưa có trong HANH_DONG (app/services/nhat_ky.py)")
    if doi_tuong is not None and doi_tuong not in DOI_TUONG:
        raise LoiGhiNhatKy(f"Loại đối tượng '{doi_tuong}' không thuộc {sorted(DOI_TUONG)}")
    if doi_tuong_id is not None and doi_tuong is None:
        raise LoiGhiNhatKy("Có doi_tuong_id thì phải có doi_tuong")
    if ma.startswith("DELETE_") and not ten_doi_tuong:
        raise LoiGhiNhatKy(f"{ma}: thao tác xóa phải ghi ten_doi_tuong")
    if ip is not None and ma not in HANH_DONG_GHI_IP:
        raise LoiGhiNhatKy(f"{ma}: chỉ ghi IP cho đăng nhập và mật khẩu")

    if nguoi_lam is None and not ten_nguoi_lam:
        raise LoiGhiNhatKy("Không có nguoi_lam thì phải truyền ten_nguoi_lam")
    if nguoi_lam is not None and ten_nguoi_lam is not None:
        raise LoiGhiNhatKy("Chỉ truyền ten_nguoi_lam khi không có nguoi_lam")

    chi_tiet = dict(chi_tiet or {})
    trung = KHOA_TU_DIEN & set(chi_tiet)
    if trung:
        raise LoiGhiNhatKy(f"chi_tiet không được có {sorted(trung)} (ghi() tự điền)")
    khoa_cam = tim_khoa_cam(chi_tiet)
    if khoa_cam:
        raise LoiGhiNhatKy(f"Không ghi thông tin nhạy cảm vào nhật ký: {khoa_cam}")
    if ma in HANH_DONG_NHAP_EXCEL:
        _kiem_tra_nhap_excel(chi_tiet)
    if ma in HANH_DONG_XOA_TAI_KHOAN and not (isinstance(chi_tiet.get("full_name"), str) and chi_tiet["full_name"]):
        raise LoiGhiNhatKy(f"{ma}: xóa tài khoản phải ghi chi_tiet['full_name']")

    detail: dict[str, Any] = {"actor": ten_nguoi_lam or nguoi_lam.username}  # type: ignore[union-attr]
    if ten_doi_tuong:
        detail["target_name"] = ten_doi_tuong
    if ip is not None:
        detail["ip"] = ip
    detail.update(chi_tiet)

    logs_repo.add(
        db,
        ma,
        user_id=nguoi_lam.id if nguoi_lam else None,
        school_id=truong_doi_tuong if truong_doi_tuong is not None else (nguoi_lam.school_id if nguoi_lam else None),
        target_type=doi_tuong,
        target_id=doi_tuong_id,
        detail=detail,
    )
