"""Dựng nhanh dữ liệu cho test API (không phải dữ liệu mẫu của seed)."""

from datetime import datetime
from functools import lru_cache

from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, hash_password
from app.models import (
    ClassStudent,
    ClassTeacher,
    School,
    SchoolClass,
    StudentProfile,
    Subject,
    SystemLog,
    TeacherProfile,
    User,
)
from app.services.nhat_ky import tim_khoa_cam

MAT_KHAU = "MatKhau-Thu-1"


@lru_cache
def _bam(mat_khau: str) -> str:
    return hash_password(mat_khau)


def tao_truong(db: Session, code: str = "truonga", *, is_active: bool = True) -> School:
    truong = School(code=code, name=f"Trường {code}", level="LOWER_SECONDARY", is_active=is_active)
    db.add(truong)
    db.flush()
    return truong


def tao_tai_khoan(
    db: Session,
    username: str,
    role: str,
    truong: School | None = None,
    *,
    mat_khau: str = MAT_KHAU,
    ma: str | None = None,
    **thuoc_tinh: object,
) -> User:
    user = User(
        username=username,
        password_hash=_bam(mat_khau),
        full_name=f"Người dùng {username}",
        role=role,
        school_id=truong.id if truong else None,
        **thuoc_tinh,
    )
    db.add(user)
    db.flush()
    if role == "TEACHER":
        db.add(TeacherProfile(user_id=user.id, school_id=truong.id, teacher_code=ma))
    elif role == "STUDENT":
        db.add(StudentProfile(user_id=user.id, school_id=truong.id, student_code=ma or username[-20:]))
    db.flush()
    return user


def tao_mon(db: Session, code: str = "KHTN_THU") -> Subject:
    mon = Subject(code=code, name="Khoa học tự nhiên", min_grade=6, max_grade=9)
    db.add(mon)
    db.flush()
    return mon


def tao_lop(db: Session, truong: School, ten: str, nam_hoc: str = "2026-2027") -> SchoolClass:
    lop = SchoolClass(school_id=truong.id, name=ten, grade=7, school_year=nam_hoc)
    db.add(lop)
    db.flush()
    return lop


def xep_lop(db: Session, lop: SchoolClass, hoc_sinh: User) -> None:
    db.add(ClassStudent(class_id=lop.id, student_id=hoc_sinh.id))
    db.flush()


def phan_cong(db: Session, lop: SchoolClass, giao_vien: User, mon: Subject, *, chu_nhiem: bool = False) -> None:
    db.add(ClassTeacher(class_id=lop.id, teacher_id=giao_vien.id, subject_id=mon.id, is_homeroom=chu_nhiem))
    db.flush()


def access_token(user: User, now: datetime) -> str:
    return create_access_token(user.id, user.role, user.school_id, user.must_change_password, now)


def refresh_token(user: User, now: datetime) -> str:
    return create_refresh_token(user.id, user.token_version, now)


def bearer(user: User, now: datetime) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token(user, now)}"}


def dang_nhap(client: TestClient, username: str, mat_khau: str = MAT_KHAU) -> Response:
    client.cookies.clear()
    return client.post("/api/auth/login", json={"username": username, "password": mat_khau})


def goi_refresh(client: TestClient, token: str | None) -> Response:
    client.cookies.clear()
    headers = {"Cookie": f"refresh_token={token}"} if token is not None else {}
    return client.post("/api/auth/refresh", headers=headers)


def cookie_refresh(res: Response) -> str:
    """Chuỗi Set-Cookie của refresh_token trong phản hồi."""
    dong = [c for c in res.headers.get_list("set-cookie") if c.startswith("refresh_token=")]
    assert len(dong) == 1, res.headers.get_list("set-cookie")
    return dong[0]


def gia_tri_refresh(res: Response) -> str:
    return cookie_refresh(res).split(";", 1)[0].split("=", 1)[1].strip('"')


def kiem_tra_nhat_ky(db: Session, ma: str, **dieu_kien: object) -> SystemLog:
    """Khẳng định có ĐÚNG MỘT dòng nhật ký mã `ma` khớp điều kiện (user_id, school_id, target_type, target_id…),
    không chứa khóa nhạy cảm; trả dòng đó để kiểm tra thêm detail.

    Ví dụ: kiem_tra_nhat_ky(db, "CREATE_STUDENT", target_id=hs_id, school_id=truong.id)
    """
    cau = select(SystemLog).where(SystemLog.action == ma)
    for cot, gia_tri in dieu_kien.items():
        cau = cau.where(getattr(SystemLog, cot) == gia_tri)
    dong = list(db.scalars(cau))
    assert len(dong) == 1, f"Cần đúng 1 dòng nhật ký {ma} {dieu_kien}, có {len(dong)}"
    assert tim_khoa_cam(dong[0].detail) is None, dong[0].detail
    assert dong[0].detail and dong[0].detail.get("actor"), "Nhật ký thiếu tên người làm (actor)"
    return dong[0]
