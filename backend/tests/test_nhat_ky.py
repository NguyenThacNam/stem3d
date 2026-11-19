"""Khung ghi nhật ký (app/services/nhat_ky.py, NT06): mã cố định, khóa cấm, IP, nhập Excel, school_id, giao dịch."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SystemLog
from app.services import nhat_ky
from app.services.nhat_ky import HANH_DONG, LoiGhiNhatKy, ghi
from tests.du_lieu import kiem_tra_nhat_ky, tao_tai_khoan, tao_truong


def _dem(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(SystemLog)) or 0


# ---------- Danh sách mã ----------


def test_ma_va_doi_tuong_vua_cot_csdl() -> None:
    assert all(len(ma) <= 30 for ma in HANH_DONG)  # action VARCHAR(30)
    assert all(nhan.strip() for nhan in HANH_DONG.values())
    assert all(len(d) <= 20 for d in nhat_ky.DOI_TUONG)  # target_type VARCHAR(20)
    assert nhat_ky.HANH_DONG_GHI_IP <= set(HANH_DONG)
    assert nhat_ky.HANH_DONG_NHAP_EXCEL <= set(HANH_DONG)


def test_thao_tac_that_bai_chi_co_dang_nhap_va_doi_mat_khau() -> None:
    assert {ma for ma in HANH_DONG if "FAILED" in ma} == {"LOGIN_FAILED", "CHANGE_PASSWORD_FAILED"}


def test_co_ma_bai_giao() -> None:
    assert {"CREATE_ASSIGNMENT", "DELETE_ASSIGNMENT"} <= set(HANH_DONG)


def test_ma_la_bi_tu_choi(db: Session) -> None:
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    with pytest.raises(LoiGhiNhatKy, match="HANH_DONG"):
        ghi(db, "TAO_HOC_SINH", nguoi_lam=qtt)
    with pytest.raises(LoiGhiNhatKy, match="Loại đối tượng"):
        ghi(db, "CREATE_STUDENT", nguoi_lam=qtt, doi_tuong="student", doi_tuong_id=1)
    with pytest.raises(LoiGhiNhatKy, match="doi_tuong"):
        ghi(db, "CREATE_STUDENT", nguoi_lam=qtt, doi_tuong_id=1)
    assert _dem(db) == 0


# ---------- Nội dung một dòng ----------


def test_ghi_day_du_thong_tin(db: Session) -> None:
    truong = tao_truong(db)
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", truong)
    hs = tao_tai_khoan(db, "truonga.hs01", "STUDENT", truong)

    ghi(
        db,
        "CREATE_STUDENT",
        nguoi_lam=qtt,
        doi_tuong="user",
        doi_tuong_id=hs.id,
        ten_doi_tuong=hs.username,
        truong_doi_tuong=truong.id,
        chi_tiet={"class_id": 7},
    )
    db.flush()

    dong = kiem_tra_nhat_ky(db, "CREATE_STUDENT", user_id=qtt.id, school_id=truong.id, target_id=hs.id)
    assert dong.target_type == "user"
    assert dong.detail == {"actor": "truonga.admin", "target_name": "truonga.hs01", "class_id": 7}


def test_school_id_lay_truong_doi_tuong_roi_moi_den_truong_nguoi_lam(db: Session) -> None:
    a, b = tao_truong(db, "truonga"), tao_truong(db, "truongb")
    sys_admin = tao_tai_khoan(db, "admin", "SYSTEM_ADMIN")
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", a)

    # QTHT khóa trường B: nhật ký thuộc trường B, không phải trường của người làm (không có).
    ghi(db, "LOCK_SCHOOL", nguoi_lam=sys_admin, doi_tuong="school", doi_tuong_id=b.id, truong_doi_tuong=b.id)
    # QTT tạo lớp, không truyền trường: lấy trường của người làm.
    ghi(db, "CREATE_CLASS", nguoi_lam=qtt, doi_tuong="class", doi_tuong_id=1, ten_doi_tuong="7A1")
    # QTHT tạo bài học (không thuộc trường nào): school_id NULL.
    ghi(db, "CREATE_LESSON", nguoi_lam=sys_admin, doi_tuong="lesson", doi_tuong_id=1)
    db.flush()

    assert kiem_tra_nhat_ky(db, "LOCK_SCHOOL").school_id == b.id
    assert kiem_tra_nhat_ky(db, "CREATE_CLASS").school_id == a.id
    assert kiem_tra_nhat_ky(db, "CREATE_LESSON").school_id is None


def test_chi_tiet_khong_duoc_ghi_de_khoa_tu_dien(db: Session) -> None:
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    for khoa in ("actor", "target_name", "ip"):
        with pytest.raises(LoiGhiNhatKy, match="tự điền"):
            ghi(db, "CREATE_CLASS", nguoi_lam=qtt, chi_tiet={khoa: "gia"})


def test_khong_co_nguoi_lam_phai_co_ten(db: Session) -> None:
    with pytest.raises(LoiGhiNhatKy, match="ten_nguoi_lam"):
        ghi(db, "LOGIN_FAILED", nguoi_lam=None)
    # Có người làm thì không được đè tên bằng ten_nguoi_lam.
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    with pytest.raises(LoiGhiNhatKy, match="ten_nguoi_lam"):
        ghi(db, "LOGIN", nguoi_lam=qtt, ten_nguoi_lam="nguoi.khac")
    ghi(db, "LOGIN_FAILED", nguoi_lam=None, ten_nguoi_lam="abc***", ip="10.0.0.1")
    db.flush()
    dong = kiem_tra_nhat_ky(db, "LOGIN_FAILED")
    assert (dong.user_id, dong.school_id, dong.detail) == (None, None, {"actor": "abc***", "ip": "10.0.0.1"})


# ---------- Không ghi thông tin nhạy cảm ----------


@pytest.mark.parametrize(
    "chi_tiet",
    [
        {"password": "x"},
        {"new_password": "x"},
        {"Initial_Password": "x"},
        {"mat_khau_tam": "x"},
        {"password_hash": "x"},
        {"refresh_token": "x"},
        {"secret": "x"},
        {"answers": [1]},
        {"correct_answer": 1},
        {"dap_an": 1},
        {"formula": "a*b"},
        {"tolerance": 0.05},
        {"sai_so": 0.05},
        # Lồng bên trong danh sách / dict cũng bị chặn.
        {"accounts": [{"username": "hs01", "password": "x"}]},
        {"config": {"scoring": {"formula": "a*b"}}},
        # Cấu hình bài học / câu hỏi: không ghi cả khối, dù tên khóa bên trong vô hại.
        {"config": {"expr": "a*b", "tol": 0.05}},
        {"new_config": "{\"expr\": \"a*b\"}"},
        {"options": [{"text": "A", "ok": True}]},
        {"is_correct": True},
        {"expected": 9.8},
    ],
)
def test_chan_khoa_nhay_cam(db: Session, chi_tiet: dict) -> None:
    btv = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    with pytest.raises(LoiGhiNhatKy, match="nhạy cảm"):
        ghi(db, "UPDATE_LESSON", nguoi_lam=btv, doi_tuong="lesson", doi_tuong_id=1, chi_tiet=chi_tiet)
    assert _dem(db) == 0


# ---------- IP ----------


def test_ip_chi_ghi_cho_dang_nhap_va_mat_khau(db: Session) -> None:
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    with pytest.raises(LoiGhiNhatKy, match="IP"):
        ghi(db, "CREATE_CLASS", nguoi_lam=qtt, ip="10.0.0.1")
    for ma in sorted(nhat_ky.HANH_DONG_GHI_IP):
        ghi(db, ma, nguoi_lam=qtt, ip="10.0.0.1")
    db.flush()
    assert _dem(db) == len(nhat_ky.HANH_DONG_GHI_IP)


# ---------- Xóa ----------


def test_xoa_phai_ghi_ten_doi_tuong(db: Session) -> None:
    sys_admin = tao_tai_khoan(db, "admin", "SYSTEM_ADMIN")
    for ma in sorted(m for m in HANH_DONG if m.startswith("DELETE_")):
        with pytest.raises(LoiGhiNhatKy, match="ten_doi_tuong"):
            ghi(db, ma, nguoi_lam=sys_admin, doi_tuong="user", doi_tuong_id=1)


def test_sua_chi_ghi_ten_truong_da_doi(db: Session) -> None:
    btv = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR")
    ghi(db, "UPDATE_LESSON", nguoi_lam=btv, doi_tuong="lesson", doi_tuong_id=1, ten_doi_tuong="Con lắc đơn",
        chi_tiet={"changed_fields": ["title", "config"]})  # fmt: skip
    db.flush()
    assert kiem_tra_nhat_ky(db, "UPDATE_LESSON").detail["changed_fields"] == ["title", "config"]


@pytest.mark.parametrize("ma", sorted(nhat_ky.HANH_DONG_XOA_TAI_KHOAN))
def test_xoa_tai_khoan_phai_ghi_ho_ten(db: Session, ma: str) -> None:
    """UC14: nhật ký giữ tên đăng nhập và họ tên của tài khoản đã xóa."""
    truong = tao_truong(db)
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", truong)
    hs = tao_tai_khoan(db, "truonga.hs01", "STUDENT", truong)
    for chi_tiet in (None, {"full_name": ""}, {"full_name": 1}):
        with pytest.raises(LoiGhiNhatKy, match="full_name"):
            ghi(db, ma, nguoi_lam=qtt, doi_tuong="user", doi_tuong_id=hs.id, ten_doi_tuong=hs.username,
                chi_tiet=chi_tiet)  # fmt: skip
    ghi(db, ma, nguoi_lam=qtt, doi_tuong="user", doi_tuong_id=hs.id, ten_doi_tuong=hs.username,
        chi_tiet={"full_name": hs.full_name})  # fmt: skip
    db.delete(hs)
    db.flush()
    db.expire_all()
    dong = kiem_tra_nhat_ky(db, ma)
    assert dong.detail == {"actor": "truonga.admin", "target_name": "truonga.hs01", "full_name": "Người dùng truonga.hs01"}


def test_xoa_truong_va_nguoi_lam_nhat_ky_van_con_ten(db: Session) -> None:
    """Ghi nhật ký rồi xóa trong cùng giao dịch: dòng vẫn lưu, school_id / user_id thành NULL, tên còn trong detail."""
    truong = tao_truong(db, "truongxoa")
    sys_admin = tao_tai_khoan(db, "xoa.admin", "SYSTEM_ADMIN")
    ghi(
        db,
        "DELETE_SCHOOL",
        nguoi_lam=sys_admin,
        doi_tuong="school",
        doi_tuong_id=truong.id,
        ten_doi_tuong=truong.code,
        truong_doi_tuong=truong.id,
    )
    db.delete(truong)
    db.flush()
    db.delete(sys_admin)
    db.flush()
    db.expire_all()

    dong = kiem_tra_nhat_ky(db, "DELETE_SCHOOL")
    assert (dong.school_id, dong.user_id) == (None, None)
    assert dong.detail == {"actor": "xoa.admin", "target_name": "truongxoa"}


# ---------- Nhập Excel ----------


def test_nhap_excel_chi_ghi_so_luong_so_dong_loi_ten_file(db: Session) -> None:
    truong = tao_truong(db)
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", truong)
    for ma in ("IMPORT_STUDENTS", "IMPORT_TEACHERS"):
        ghi(db, ma, nguoi_lam=qtt, chi_tiet={"created_count": 40, "error_count": 0, "file_name": "7A1.xlsx"})
    db.flush()
    for ma in ("IMPORT_STUDENTS", "IMPORT_TEACHERS"):
        dong = kiem_tra_nhat_ky(db, ma, school_id=truong.id)
        assert dong.detail == {"actor": "truonga.admin", "created_count": 40, "error_count": 0, "file_name": "7A1.xlsx"}


@pytest.mark.parametrize("ma", ["IMPORT_STUDENTS", "IMPORT_TEACHERS"])
@pytest.mark.parametrize(
    ("chi_tiet", "thong_bao"),
    [
        # Danh sách tài khoản vừa tạo (kèm mật khẩu ban đầu) không được ghi, dù tên khóa vô hại.
        ({"created_count": 2, "error_count": 0, "file_name": "a.xlsx", "accounts": ["hs01", "hs02"]}, "không ghi"),
        ({"created_count": 2, "error_count": 0, "file_name": "a.xlsx", "usernames": ["hs01"]}, "không ghi"),
        ({"error_count": 0, "file_name": "a.xlsx"}, "created_count"),
        ({"created_count": 2, "file_name": "a.xlsx"}, "error_count"),
        ({"created_count": 2, "error_count": 0}, "file_name"),
        ({"created_count": ["hs01", "hs02"], "error_count": 0, "file_name": "a.xlsx"}, "kiểu int"),
        ({"created_count": True, "error_count": 0, "file_name": "a.xlsx"}, "kiểu int"),
        ({"created_count": 2, "error_count": 0, "file_name": ["hs01"]}, "kiểu str"),
    ],
)
def test_nhap_excel_tu_choi_noi_dung_khac(db: Session, ma: str, chi_tiet: dict, thong_bao: str) -> None:
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    with pytest.raises(LoiGhiNhatKy, match=thong_bao):
        ghi(db, ma, nguoi_lam=qtt, chi_tiet=chi_tiet)
    assert _dem(db) == 0


# ---------- Giao dịch ----------


def test_khong_tu_commit_hoan_tac_thi_mat_nhat_ky(db: Session) -> None:
    qtt = tao_tai_khoan(db, "truonga.admin", "SCHOOL_ADMIN", tao_truong(db))
    diem_luu = db.begin_nested()
    ghi(db, "CREATE_CLASS", nguoi_lam=qtt, doi_tuong="class", doi_tuong_id=1)
    db.flush()
    assert _dem(db) == 1
    diem_luu.rollback()
    assert _dem(db) == 0
