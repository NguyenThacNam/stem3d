from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.database import get_db
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health_ok(client: TestClient) -> None:
    res = client.get("/api/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok", "database": "ok"}


def test_health_csdl_loi_tra_503(client: TestClient) -> None:
    class PhienLoi:
        def execute(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("mất kết nối"))

    def get_db_loi():
        yield PhienLoi()

    app.dependency_overrides[get_db] = get_db_loi

    res = client.get("/api/health")

    assert res.status_code == 503
    assert res.json() == {
        "error": {
            "code": "DATABASE_UNAVAILABLE",
            "message": "Không kết nối được cơ sở dữ liệu",
            "details": None,
        }
    }
