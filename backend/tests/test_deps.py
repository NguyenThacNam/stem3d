"""get_current_user, require_role: SYSTEM_ADMIN kế thừa CONTENT_EDITOR; chặn PASSWORD_CHANGE_REQUIRED."""

from collections.abc import Iterator

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.clock import get_now
from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.main import create_app
from app.services.auth import CurrentUser
from tests.conftest import DongHo
from tests.du_lieu import bearer, tao_tai_khoan, tao_truong


@pytest.fixture
def client_thu(db: Session, dong_ho: DongHo) -> Iterator[TestClient]:
    app = create_app()

    @app.get("/api/thu/bien-tap")
    def chi_bien_tap(user: CurrentUser = Depends(require_role("CONTENT_EDITOR"))) -> dict:
        return {"role": user.role}

    @app.get("/api/thu/quan-tri-truong")
    def chi_quan_tri_truong(user: CurrentUser = Depends(require_role("SCHOOL_ADMIN"))) -> dict:
        return {"role": user.role}

    @app.get("/api/thu/dang-nhap")
    def moi_vai_tro(user: CurrentUser = Depends(get_current_user)) -> dict:
        return {"id": user.id}

    def _get_db() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_now] = lambda: dong_ho.gio
    with TestClient(app) as c:
        yield c


@pytest.mark.parametrize(
    ("role", "status"),
    [("CONTENT_EDITOR", 200), ("SYSTEM_ADMIN", 200), ("SCHOOL_ADMIN", 403), ("TEACHER", 403), ("STUDENT", 403)],
)
def test_system_admin_ke_thua_bien_tap_vien(
    client_thu: TestClient, db: Session, dong_ho: DongHo, role: str, status: int
) -> None:
    truong = tao_truong(db) if role in {"SCHOOL_ADMIN", "TEACHER", "STUDENT"} else None
    user = tao_tai_khoan(db, "nguoi.thu", role, truong)

    res = client_thu.get("/api/thu/bien-tap", headers=bearer(user, dong_ho.gio))

    assert res.status_code == status
    if status == 403:
        assert res.json()["error"]["code"] == "FORBIDDEN"


def test_system_admin_khong_tu_dong_co_quyen_quan_tri_truong(
    client_thu: TestClient, db: Session, dong_ho: DongHo
) -> None:
    user = tao_tai_khoan(db, "admin", "SYSTEM_ADMIN")

    res = client_thu.get("/api/thu/quan-tri-truong", headers=bearer(user, dong_ho.gio))

    assert res.status_code == 403


def test_phai_doi_mat_khau_bi_chan_ngoai_nhom_auth(client_thu: TestClient, db: Session, dong_ho: DongHo) -> None:
    user = tao_tai_khoan(db, "bientap", "CONTENT_EDITOR", must_change_password=True)

    for duong_dan in ("/api/thu/dang-nhap", "/api/thu/bien-tap"):
        res = client_thu.get(duong_dan, headers=bearer(user, dong_ho.gio))
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "PASSWORD_CHANGE_REQUIRED"


def test_chua_dang_nhap_401(client_thu: TestClient) -> None:
    res = client_thu.get("/api/thu/dang-nhap")

    assert res.status_code == 401
    assert res.json()["error"]["code"] == "NOT_AUTHENTICATED"
