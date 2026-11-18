"""Cấu hình chung cho test: CSDL riêng, mỗi test một giao dịch rồi hoàn tác.

Phải đổi DATABASE_URL sang CSDL test TRƯỚC khi import bất cứ thứ gì trong app.
"""

import os
import re
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.engine import make_url

_TEST_URL = os.environ.get("TEST_DATABASE_URL")
if not _TEST_URL:
    raise RuntimeError("Thiếu biến TEST_DATABASE_URL (đặt trong docker-compose.override.yml)")
_TEN_CSDL_TEST = make_url(_TEST_URL).database or ""
# Chặn chạy nhầm vào CSDL dev hoặc bản thật: test xóa và ghi dữ liệu tùy ý.
if not re.fullmatch(r"[a-z0-9_]+_test", _TEN_CSDL_TEST):
    raise RuntimeError(f"TEST_DATABASE_URL phải trỏ tới CSDL có tên kết thúc bằng _test, đang là '{_TEN_CSDL_TEST}'")
os.environ["DATABASE_URL"] = _TEST_URL
# bcrypt độ khó thấp nhất cho test chạy nhanh (bản thật bắt buộc >= 12).
os.environ["BCRYPT_ROUNDS"] = "4"

from datetime import datetime, timedelta  # noqa: E402

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.clock import get_now  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.database import get_db, get_engine  # noqa: E402
from app.main import app  # noqa: E402

get_settings.cache_clear()
THU_MUC_BACKEND = Path(__file__).resolve().parents[1]


def _tao_csdl_test_neu_chua_co() -> None:
    url_postgres = make_url(_TEST_URL).set(database="postgres")
    engine = create_engine(url_postgres, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as conn:
            da_co = conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :ten"), {"ten": _TEN_CSDL_TEST})
            if not da_co:
                # Tên đã kiểm tra bằng regex ở trên nên ghép vào lệnh được.
                conn.execute(text(f'CREATE DATABASE "{_TEN_CSDL_TEST}" ENCODING \'UTF8\''))
    finally:
        engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _csdl_test() -> Iterator[None]:
    """Tạo CSDL test (nếu chưa có) và chạy migration tới head: migration cũng được kiểm tra mỗi lần test."""
    _tao_csdl_test_neu_chua_co()
    cfg = Config(str(THU_MUC_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(THU_MUC_BACKEND / "alembic"))
    cfg.attributes["configure_logger"] = False
    command.upgrade(cfg, "head")
    yield
    get_engine().dispose()


@pytest.fixture
def db() -> Iterator[Session]:
    """Phiên CSDL cho một test: mọi thay đổi (kể cả commit trong code) bị hoàn tác khi test xong."""
    conn = get_engine().connect()
    giao_dich = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint", expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        giao_dich.rollback()
        conn.close()


class DongHo:
    """Đồng hồ giả cho test: API đọc giờ qua get_now, test tua giờ bằng tua(...)."""

    BAT_DAU = datetime(2026, 11, 18, 7, 0, 0)  # UTC, năm học 2026-2027

    def __init__(self) -> None:
        self.gio = self.BAT_DAU

    def tua(self, **khoang: float) -> None:
        self.gio += timedelta(**khoang)


@pytest.fixture
def dong_ho() -> DongHo:
    return DongHo()


@pytest.fixture
def client(db: Session, dong_ho: DongHo) -> Iterator[TestClient]:
    """TestClient dùng chung phiên CSDL của test (API ghi gì cũng được hoàn tác) và đồng hồ giả."""

    def _get_db_test() -> Iterator[Session]:
        yield db

    app.dependency_overrides[get_db] = _get_db_test
    app.dependency_overrides[get_now] = lambda: dong_ho.gio
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
