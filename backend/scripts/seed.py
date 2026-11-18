"""Tạo dữ liệu mẫu tối thiểu cho máy phát triển.

Chạy: docker compose exec api python -m scripts.seed
- Mật khẩu mẫu đọc từ biến môi trường SEED_PASSWORD (file .env), không ghi trong code.
- Không chạy khi APP_ENV=prod.
- Chạy nhiều lần không tạo trùng: bản ghi đã có (theo mã môn, mã trường, tên đăng nhập) thì bỏ qua.
"""

import os
import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_sessionmaker
from app.core.security import hash_password
from app.models import School, StudentProfile, Subject, TeacherProfile, User

DO_DAI_MAT_KHAU_TOI_THIEU = 8

MON_HOC = [
    ("KHOA_HOC", "Khoa học", 4, 5),
    ("KHTN", "Khoa học tự nhiên", 6, 9),
    ("VAT_LI", "Vật lí", 10, 12),
    ("HOA_HOC", "Hóa học", 10, 12),
    ("SINH_HOC", "Sinh học", 10, 12),
]

TRUONG = {"code": "nguyendu", "name": "Trường THCS Nguyễn Du", "level": "LOWER_SECONDARY"}

# (tên đăng nhập, vai trò, họ tên, thuộc trường?, mã hồ sơ)
TAI_KHOAN = [
    ("admin", "SYSTEM_ADMIN", "Quản trị hệ thống", False, None),
    ("bientap", "CONTENT_EDITOR", "Nguyễn Thu Hà", False, None),
    ("nguyendu.admin", "SCHOOL_ADMIN", "Trần Văn Bình", True, None),
    ("nguyendu.gv001", "TEACHER", "Lê Thị Hoa", True, "GV001"),
    ("nguyendu.hs001", "STUDENT", "Phạm Minh Khôi", True, "HS001"),
]


def chay_seed(db: Session, mat_khau: str) -> dict[str, int]:
    """Thêm dữ liệu mẫu còn thiếu vào phiên db (chưa commit). Trả số bản ghi đã thêm theo loại."""
    da_them = {"subjects": 0, "schools": 0, "users": 0}

    for code, name, min_grade, max_grade in MON_HOC:
        if db.scalar(select(Subject.id).where(Subject.code == code)) is None:
            db.add(Subject(code=code, name=name, min_grade=min_grade, max_grade=max_grade))
            da_them["subjects"] += 1

    truong = db.scalars(select(School).where(School.code == TRUONG["code"])).one_or_none()
    if truong is None:
        truong = School(**TRUONG)
        db.add(truong)
        db.flush()
        da_them["schools"] += 1

    password_hash = hash_password(mat_khau)
    for username, role, full_name, thuoc_truong, ma_ho_so in TAI_KHOAN:
        if db.scalar(select(User.id).where(User.username == username)) is not None:
            continue
        school_id = truong.id if thuoc_truong else None
        user = User(
            username=username,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
            school_id=school_id,
            # Dữ liệu mẫu dev: đăng nhập được ngay. Tài khoản thật vẫn bắt đổi mật khẩu lần đầu.
            must_change_password=False,
        )
        db.add(user)
        db.flush()
        if role == "TEACHER":
            db.add(
                TeacherProfile(
                    user_id=user.id, school_id=school_id, teacher_code=ma_ho_so, department="Tổ Khoa học tự nhiên"
                )
            )
        elif role == "STUDENT":
            db.add(StudentProfile(user_id=user.id, school_id=school_id, student_code=ma_ho_so))
        da_them["users"] += 1

    db.flush()
    return da_them


def main() -> None:
    if get_settings().is_prod:
        sys.exit("Không chạy seed khi APP_ENV=prod: dữ liệu mẫu chỉ dùng cho máy phát triển")
    mat_khau = os.environ.get("SEED_PASSWORD", "")
    if len(mat_khau) < DO_DAI_MAT_KHAU_TOI_THIEU:
        sys.exit(
            f"Thiếu SEED_PASSWORD hoặc ngắn hơn {DO_DAI_MAT_KHAU_TOI_THIEU} ký tự. "
            "Thêm vào .env rồi chạy lại: docker compose up -d api"
        )

    with get_sessionmaker()() as db, db.begin():
        da_them = chay_seed(db, mat_khau)

    print(
        f"Đã thêm {da_them['subjects']} môn, {da_them['schools']} trường, {da_them['users']} tài khoản "
        "(bản ghi đã có thì bỏ qua)."
    )
    print("Tài khoản mẫu: " + ", ".join(t[0] for t in TAI_KHOAN) + " – mật khẩu là SEED_PASSWORD trong .env.")


if __name__ == "__main__":
    main()
