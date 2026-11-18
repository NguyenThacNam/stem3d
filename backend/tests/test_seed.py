"""Script seed: đủ dữ liệu, đúng quy tắc tên đăng nhập, chạy lại không tạo trùng."""

from types import SimpleNamespace

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models import School, StudentProfile, Subject, TeacherProfile, User
from scripts import seed
from scripts.seed import MON_HOC, TAI_KHOAN, chay_seed

MAT_KHAU = "mat-khau-thu-seed"


def test_seed_tao_du_du_lieu(db: Session) -> None:
    da_them = chay_seed(db, MAT_KHAU)

    assert da_them == {"subjects": 5, "schools": 1, "users": 5}
    truong = db.scalars(select(School).where(School.code == "nguyendu")).one()
    assert (truong.name, truong.level) == ("Trường THCS Nguyễn Du", "LOWER_SECONDARY")

    tai_khoan = {u.username: u for u in db.scalars(select(User).where(User.username.in_([t[0] for t in TAI_KHOAN])))}
    assert {u.role for u in tai_khoan.values()} == {
        "SYSTEM_ADMIN", "CONTENT_EDITOR", "SCHOOL_ADMIN", "TEACHER", "STUDENT",
    }  # fmt: skip
    # Biên tập viên, quản trị hệ thống không thuộc trường; quản trị trường có school_id.
    assert tai_khoan["admin"].school_id is None
    assert tai_khoan["bientap"].school_id is None
    assert tai_khoan["nguyendu.admin"].school_id == truong.id

    gv = db.get(TeacherProfile, tai_khoan["nguyendu.gv001"].id)
    hs = db.get(StudentProfile, tai_khoan["nguyendu.hs001"].id)
    assert (gv.school_id, gv.teacher_code) == (truong.id, "GV001")
    assert (hs.school_id, hs.student_code) == (truong.id, "HS001")

    # Mật khẩu chỉ lưu dạng băm.
    assert tai_khoan["admin"].password_hash != MAT_KHAU
    assert verify_password(MAT_KHAU, tai_khoan["admin"].password_hash)


def test_seed_chay_lai_khong_trung(db: Session) -> None:
    chay_seed(db, MAT_KHAU)
    lan_2 = chay_seed(db, MAT_KHAU)

    assert lan_2 == {"subjects": 0, "schools": 0, "users": 0}
    ma_mon = [m[0] for m in MON_HOC]
    ten_dang_nhap = [t[0] for t in TAI_KHOAN]
    assert db.scalar(select(func.count()).select_from(Subject).where(Subject.code.in_(ma_mon))) == 5
    assert db.scalar(select(func.count()).select_from(User).where(User.username.in_(ten_dang_nhap))) == 5


def test_seed_khong_chay_khi_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(seed, "get_settings", lambda: SimpleNamespace(is_prod=True))
    monkeypatch.setenv("SEED_PASSWORD", MAT_KHAU)

    with pytest.raises(SystemExit, match="APP_ENV=prod"):
        seed.main()


@pytest.mark.parametrize("mat_khau", [None, "", "ngan"])
def test_seed_thieu_hoac_mat_khau_ngan(monkeypatch: pytest.MonkeyPatch, mat_khau: str | None) -> None:
    monkeypatch.setattr(seed, "get_settings", lambda: SimpleNamespace(is_prod=False))
    if mat_khau is None:
        monkeypatch.delenv("SEED_PASSWORD", raising=False)
    else:
        monkeypatch.setenv("SEED_PASSWORD", mat_khau)

    with pytest.raises(SystemExit, match="SEED_PASSWORD"):
        seed.main()
