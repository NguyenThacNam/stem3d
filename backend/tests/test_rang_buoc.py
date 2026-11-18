"""Ràng buộc quan trọng của CSDL theo docs/phu-luc-csdl.md."""

import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Asset,
    Assignment,
    Attempt,
    ClassStudent,
    ClassTeacher,
    Lesson,
    School,
    SchoolClass,
    StudentProfile,
    Subject,
    SystemLog,
    TeacherProfile,
    User,
)

# ---------- Dữ liệu dựng nhanh ----------


def _truong(db: Session, code: str = "thu") -> School:
    truong = School(code=code, name=f"Trường {code}", level="LOWER_SECONDARY")
    db.add(truong)
    db.flush()
    return truong


def _tai_khoan(db: Session, username: str, role: str, school_id: int | None) -> User:
    user = User(username=username, password_hash="x", full_name=username, role=role, school_id=school_id)
    db.add(user)
    db.flush()
    return user


def _giao_vien(db: Session, truong: School, ma: str = "GV001") -> TeacherProfile:
    user = _tai_khoan(db, f"{truong.code}.{ma.lower()}", "TEACHER", truong.id)
    gv = TeacherProfile(user_id=user.id, school_id=truong.id, teacher_code=ma)
    db.add(gv)
    db.flush()
    return gv


def _hoc_sinh(db: Session, truong: School, ma: str = "HS001") -> StudentProfile:
    user = _tai_khoan(db, f"{truong.code}.{ma.lower()}", "STUDENT", truong.id)
    hs = StudentProfile(user_id=user.id, school_id=truong.id, student_code=ma)
    db.add(hs)
    db.flush()
    return hs


def _mon(db: Session, code: str = "KHTN_THU") -> Subject:
    mon = Subject(code=code, name="Khoa học tự nhiên", min_grade=6, max_grade=9)
    db.add(mon)
    db.flush()
    return mon


def _lop(db: Session, truong: School, ten: str = "7A1") -> SchoolClass:
    lop = SchoolClass(school_id=truong.id, name=ten, grade=7, school_year="2026-2027")
    db.add(lop)
    db.flush()
    return lop


def _bai_hoc(db: Session, mon: Subject) -> Lesson:
    bai = Lesson(subject_id=mon.id, grade=7, title="Cấu tạo tim", lesson_type="STRUCTURE")
    db.add(bai)
    db.flush()
    return bai


def _vi_pham(db: Session, ten_rang_buoc: str, *doi_tuong: object) -> None:
    """Thêm bản ghi trong savepoint, khẳng định CSDL từ chối đúng ràng buộc."""
    with pytest.raises(IntegrityError) as loi:
        with db.begin_nested():
            db.add_all(doi_tuong)
            db.flush()
    assert loi.value.orig.diag.constraint_name == ten_rang_buoc


# ---------- CHECK ghi công ở assets ----------


@pytest.mark.parametrize("nguon", ["CC_BY", "CC_BY_SA"])
def test_asset_cc_by_thieu_ghi_cong_bi_chan(db: Session, nguon: str) -> None:
    _vi_pham(db, "ck_assets_attribution", Asset(name="Tim", file_path="tim.v1.glb", source_type=nguon))


@pytest.mark.parametrize("nguon", ["CC_BY", "CC_BY_SA"])
def test_asset_cc_by_co_ghi_cong_hop_le(db: Session, nguon: str) -> None:
    db.add(Asset(name="Tim", file_path="tim.v1.glb", source_type=nguon, attribution="Tác giả A, CC BY 4.0"))
    db.flush()


@pytest.mark.parametrize("nguon", ["SELF_BUILT", "COMMISSIONED", "CC0"])
def test_asset_nguon_khac_khong_can_ghi_cong(db: Session, nguon: str) -> None:
    db.add(Asset(name="Tim", file_path="tim.v1.glb", source_type=nguon))
    db.flush()


# ---------- Chủ nhiệm duy nhất mỗi lớp ----------


def test_lop_chi_co_mot_chu_nhiem(db: Session) -> None:
    truong, mon = _truong(db), _mon(db)
    lop = _lop(db, truong)
    gv1, gv2 = _giao_vien(db, truong, "GV001"), _giao_vien(db, truong, "GV002")
    db.add(ClassTeacher(class_id=lop.id, teacher_id=gv1.user_id, subject_id=mon.id, is_homeroom=True))
    db.flush()

    _vi_pham(
        db,
        "uq_class_homeroom",
        ClassTeacher(class_id=lop.id, teacher_id=gv2.user_id, subject_id=mon.id, is_homeroom=True),
    )


def test_chu_nhiem_lop_khac_va_nhieu_gv_khong_chu_nhiem_hop_le(db: Session) -> None:
    truong, mon = _truong(db), _mon(db)
    lop1, lop2 = _lop(db, truong, "7A1"), _lop(db, truong, "7A2")
    gv1, gv2, gv3 = (_giao_vien(db, truong, f"GV00{i}") for i in (1, 2, 3))
    db.add_all(
        [
            ClassTeacher(class_id=lop1.id, teacher_id=gv1.user_id, subject_id=mon.id, is_homeroom=True),
            ClassTeacher(class_id=lop2.id, teacher_id=gv2.user_id, subject_id=mon.id, is_homeroom=True),
            ClassTeacher(class_id=lop1.id, teacher_id=gv2.user_id, subject_id=mon.id),
            ClassTeacher(class_id=lop1.id, teacher_id=gv3.user_id, subject_id=mon.id),
        ]
    )
    db.flush()


# ---------- attempts.client_id UNIQUE ----------


def _du_lieu_nop(hs: StudentProfile, bai: Lesson, client_id: uuid.UUID) -> dict:
    return {
        "client_id": client_id,
        "student_id": hs.user_id,
        "lesson_id": bai.id,
        "attempt_type": "QUIZ",
        "submitted_at": datetime(2026, 11, 18, 7, 0),
    }


def test_client_id_trung_bi_chan(db: Session) -> None:
    truong = _truong(db)
    hs, bai = _hoc_sinh(db, truong), _bai_hoc(db, _mon(db))
    ma = uuid.uuid4()
    db.add(Attempt(**_du_lieu_nop(hs, bai, ma)))
    db.flush()

    _vi_pham(db, "uq_attempts_client_id", Attempt(**_du_lieu_nop(hs, bai, ma)))


def test_nop_lai_on_conflict_do_nothing_khong_ghi_trung(db: Session) -> None:
    truong = _truong(db)
    hs, bai = _hoc_sinh(db, truong), _bai_hoc(db, _mon(db))
    ma = uuid.uuid4()
    lenh = (
        insert(Attempt)
        .values(**_du_lieu_nop(hs, bai, ma))
        .on_conflict_do_nothing(index_elements=["client_id"])
        .returning(Attempt.id)
    )

    lan_1 = db.execute(lenh).all()
    lan_2 = db.execute(lenh).all()

    assert (len(lan_1), len(lan_2)) == (1, 0)
    assert db.scalar(select(func.count()).select_from(Attempt).where(Attempt.client_id == ma)) == 1


# ---------- Xóa trường: xóa theo toàn bộ, nhật ký vẫn giữ ----------


def _dem(db: Session, model: type, *dieu_kien: object) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*dieu_kien))


def test_xoa_truong_xoa_theo_moi_du_lieu_cua_truong(db: Session) -> None:
    truong, mon = _truong(db, "xoa"), _mon(db)
    truong_khac = _truong(db, "giu")
    quan_tri = _tai_khoan(db, "xoa.admin", "SCHOOL_ADMIN", truong.id)
    gv, hs = _giao_vien(db, truong), _hoc_sinh(db, truong)
    hs_khac = _hoc_sinh(db, truong_khac)
    lop, bai = _lop(db, truong), _bai_hoc(db, mon)
    db.add_all(
        [
            ClassStudent(class_id=lop.id, student_id=hs.user_id),
            ClassTeacher(class_id=lop.id, teacher_id=gv.user_id, subject_id=mon.id, is_homeroom=True),
        ]
    )
    bai_giao = Assignment(class_id=lop.id, lesson_id=bai.id, assigned_by=gv.user_id, open_at=datetime(2026, 11, 1))
    db.add(bai_giao)
    db.flush()
    db.add_all(
        [
            Attempt(**_du_lieu_nop(hs, bai, uuid.uuid4()), assignment_id=bai_giao.id),
            # Bài nộp còn lại sau khi xóa trường (học sinh trường khác) phải mất liên kết bài giao.
            Attempt(**_du_lieu_nop(hs_khac, bai, uuid.uuid4()), assignment_id=bai_giao.id),
            SystemLog(user_id=quan_tri.id, school_id=truong.id, action="LOCK_SCHOOL", detail={"username": "xoa.admin"}),
        ]
    )
    db.flush()

    # Lấy mã trước khi xóa: sau expire_all, đọc thuộc tính của bản ghi đã xóa sẽ lỗi.
    ma_truong, ma_lop, ma_bai_giao, ma_hs = truong.id, lop.id, bai_giao.id, hs.user_id
    ma_hs_khac, ma_bai = hs_khac.user_id, bai.id
    tai_khoan_truong = [quan_tri.id, gv.user_id, hs.user_id]

    db.execute(delete(School).where(School.id == ma_truong))
    db.expire_all()

    assert _dem(db, User, User.id.in_(tai_khoan_truong)) == 0
    assert _dem(db, StudentProfile, StudentProfile.school_id == ma_truong) == 0
    assert _dem(db, TeacherProfile, TeacherProfile.school_id == ma_truong) == 0
    assert _dem(db, SchoolClass, SchoolClass.school_id == ma_truong) == 0
    assert _dem(db, ClassStudent, ClassStudent.class_id == ma_lop) == 0
    assert _dem(db, ClassTeacher, ClassTeacher.class_id == ma_lop) == 0
    assert _dem(db, Assignment, Assignment.id == ma_bai_giao) == 0
    assert _dem(db, Attempt, Attempt.student_id == ma_hs) == 0
    # Nhật ký giữ, bỏ liên kết trường và người dùng; tên tài khoản còn trong detail.
    nhat_ky = db.scalars(select(SystemLog).where(SystemLog.action == "LOCK_SCHOOL")).one()
    assert (nhat_ky.school_id, nhat_ky.user_id) == (None, None)
    assert nhat_ky.detail == {"username": "xoa.admin"}
    # Trường khác, môn, bài học không bị ảnh hưởng.
    bai_nop_con_lai = db.scalars(select(Attempt).where(Attempt.student_id == ma_hs_khac)).one()
    assert bai_nop_con_lai.assignment_id is None
    assert _dem(db, Lesson, Lesson.id == ma_bai) == 1


# ---------- Xóa giáo viên: bài giao giữ, người giao thành NULL ----------


def test_xoa_giao_vien_giu_bai_giao(db: Session) -> None:
    truong, mon = _truong(db), _mon(db)
    gv = _giao_vien(db, truong)
    lop, bai = _lop(db, truong), _bai_hoc(db, mon)
    db.add(ClassTeacher(class_id=lop.id, teacher_id=gv.user_id, subject_id=mon.id))
    bai_giao = Assignment(
        class_id=lop.id,
        lesson_id=bai.id,
        assigned_by=gv.user_id,
        requirement="BOTH",
        open_at=datetime(2026, 11, 1),
        due_at=datetime(2026, 11, 1) + timedelta(days=7),
    )
    db.add(bai_giao)
    db.flush()

    ma_gv, ma_bai_giao = gv.user_id, bai_giao.id

    db.execute(delete(User).where(User.id == ma_gv))
    db.expire_all()

    assert _dem(db, TeacherProfile, TeacherProfile.user_id == ma_gv) == 0
    assert _dem(db, ClassTeacher, ClassTeacher.teacher_id == ma_gv) == 0
    con_lai = db.get(Assignment, ma_bai_giao)
    assert con_lai is not None
    assert con_lai.assigned_by is None


# ---------- Xóa học sinh: hồ sơ, xếp lớp, bài nộp mất theo ----------


def test_xoa_hoc_sinh_xoa_theo_ho_so_xep_lop_bai_nop(db: Session) -> None:
    truong = _truong(db)
    hs, lop, bai = _hoc_sinh(db, truong), _lop(db, truong), _bai_hoc(db, _mon(db))
    db.add_all([ClassStudent(class_id=lop.id, student_id=hs.user_id), Attempt(**_du_lieu_nop(hs, bai, uuid.uuid4()))])
    db.flush()
    ma_hs, ma_lop, ma_bai = hs.user_id, lop.id, bai.id

    db.execute(delete(User).where(User.id == ma_hs))
    db.expire_all()

    assert _dem(db, StudentProfile, StudentProfile.user_id == ma_hs) == 0
    assert _dem(db, ClassStudent, ClassStudent.student_id == ma_hs) == 0
    assert _dem(db, Attempt, Attempt.student_id == ma_hs) == 0
    assert _dem(db, SchoolClass, SchoolClass.id == ma_lop) == 1
    assert _dem(db, Lesson, Lesson.id == ma_bai) == 1


# ---------- Xóa biên tập viên: bài học, mô hình giữ, người tạo thành NULL ----------


def test_xoa_bien_tap_vien_giu_bai_hoc_va_mo_hinh(db: Session) -> None:
    bien_tap = _tai_khoan(db, "bientap_thu", "CONTENT_EDITOR", None)
    mo_hinh = Asset(name="Tim", file_path="tim.v1.glb", source_type="SELF_BUILT", uploaded_by=bien_tap.id)
    db.add(mo_hinh)
    db.flush()
    bai = Lesson(
        subject_id=_mon(db).id,
        title="Cấu tạo tim",
        asset_id=mo_hinh.id,
        status="PUBLISHED",
        created_by=bien_tap.id,
        published_by=bien_tap.id,
    )
    db.add(bai)
    db.flush()
    ma_bien_tap, ma_mo_hinh, ma_bai = bien_tap.id, mo_hinh.id, bai.id

    db.execute(delete(User).where(User.id == ma_bien_tap))
    db.expire_all()

    mo_hinh_con, bai_con = db.get(Asset, ma_mo_hinh), db.get(Lesson, ma_bai)
    assert mo_hinh_con is not None and mo_hinh_con.uploaded_by is None
    assert bai_con is not None
    assert (bai_con.created_by, bai_con.published_by, bai_con.asset_id) == (None, None, ma_mo_hinh)


# ---------- Chặn xóa (khóa ngoại không ON DELETE) ----------


def _bi_chan_xoa(db: Session, ten_rang_buoc: str, lenh_xoa: object) -> None:
    with pytest.raises(IntegrityError) as loi:
        with db.begin_nested():
            db.execute(lenh_xoa)
    assert loi.value.orig.diag.constraint_name == ten_rang_buoc


def test_khong_xoa_duoc_bai_hoc_dang_duoc_giao(db: Session) -> None:
    truong = _truong(db)
    bai = _bai_hoc(db, _mon(db))
    db.add(Assignment(class_id=_lop(db, truong).id, lesson_id=bai.id, open_at=datetime(2026, 11, 1)))
    db.flush()

    _bi_chan_xoa(db, "fk_assignments_lesson_id_lessons", delete(Lesson).where(Lesson.id == bai.id))


def test_khong_xoa_duoc_bai_hoc_da_co_bai_nop(db: Session) -> None:
    bai = _bai_hoc(db, _mon(db))
    db.add(Attempt(**_du_lieu_nop(_hoc_sinh(db, _truong(db)), bai, uuid.uuid4())))
    db.flush()

    _bi_chan_xoa(db, "fk_attempts_lesson_id_lessons", delete(Lesson).where(Lesson.id == bai.id))


def test_khong_xoa_duoc_mon_con_bai_hoc(db: Session) -> None:
    mon = _mon(db)
    _bai_hoc(db, mon)

    _bi_chan_xoa(db, "fk_lessons_subject_id_subjects", delete(Subject).where(Subject.id == mon.id))


def test_khong_xoa_duoc_mon_con_phan_cong(db: Session) -> None:
    truong, mon = _truong(db), _mon(db)
    db.add(ClassTeacher(class_id=_lop(db, truong).id, teacher_id=_giao_vien(db, truong).user_id, subject_id=mon.id))
    db.flush()

    _bi_chan_xoa(db, "fk_class_teachers_subject_id_subjects", delete(Subject).where(Subject.id == mon.id))


def test_khong_xoa_duoc_mo_hinh_dang_dung(db: Session) -> None:
    mo_hinh = Asset(name="Tim", file_path="tim.v1.glb", source_type="CC0")
    db.add(mo_hinh)
    db.flush()
    db.add(Lesson(subject_id=_mon(db).id, title="Cấu tạo tim", asset_id=mo_hinh.id))
    db.flush()

    _bi_chan_xoa(db, "fk_lessons_asset_id_assets", delete(Asset).where(Asset.id == mo_hinh.id))


# ---------- CHECK hạn nộp ----------


@pytest.mark.parametrize("lech", [timedelta(0), timedelta(hours=-1)])
def test_han_nop_phai_sau_gio_mo(db: Session, lech: timedelta) -> None:
    truong = _truong(db)
    lop, bai = _lop(db, truong), _bai_hoc(db, _mon(db))
    mo = datetime(2026, 11, 1, 7, 0)

    _vi_pham(
        db,
        "ck_assignments_due_after_open",
        Assignment(class_id=lop.id, lesson_id=bai.id, open_at=mo, due_at=mo + lech),
    )


def test_han_nop_de_trong_hop_le(db: Session) -> None:
    truong = _truong(db)
    db.add(Assignment(class_id=_lop(db, truong).id, lesson_id=_bai_hoc(db, _mon(db)).id, open_at=datetime(2026, 11, 1)))
    db.flush()


# ---------- UNIQUE mã học sinh theo trường, tên lớp theo năm học ----------


def test_ma_hoc_sinh_trung_trong_mot_truong_bi_chan(db: Session) -> None:
    truong = _truong(db)
    _hoc_sinh(db, truong, "HS001")
    user_khac = _tai_khoan(db, "thu.khac", "STUDENT", truong.id)

    _vi_pham(
        db,
        "uq_student_profiles_school_id_student_code",
        StudentProfile(user_id=user_khac.id, school_id=truong.id, student_code="HS001"),
    )


def test_ma_hoc_sinh_trung_o_hai_truong_hop_le(db: Session) -> None:
    _hoc_sinh(db, _truong(db, "truonga"), "HS001")
    _hoc_sinh(db, _truong(db, "truongb"), "HS001")


def test_ten_lop_trung_trong_nam_hoc_bi_chan(db: Session) -> None:
    truong = _truong(db)
    _lop(db, truong, "7A1")

    _vi_pham(
        db,
        "uq_classes_school_id_name_school_year",
        SchoolClass(school_id=truong.id, name="7A1", grade=7, school_year="2026-2027"),
    )


def test_ten_lop_trung_khac_nam_hoc_hop_le(db: Session) -> None:
    truong = _truong(db)
    _lop(db, truong, "7A1")
    db.add(SchoolClass(school_id=truong.id, name="7A1", grade=7, school_year="2027-2028"))
    db.flush()
