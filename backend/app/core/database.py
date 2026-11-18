"""Kết nối CSDL: engine, phiên làm việc và phụ thuộc get_db.

Engine chỉ tạo khi gọi lần đầu (không tạo lúc import), để test đổi được sang CSDL test.
"""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

# connect_timeout: CSDL không phản hồi thì báo lỗi sau 5 giây thay vì treo.
# timezone=UTC: cột TIMESTAMP (không múi giờ, theo phụ lục) luôn lưu và đọc giờ UTC, now() cũng là UTC.
CONNECT_ARGS = {"connect_timeout": 5, "options": "-c timezone=UTC"}


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True, connect_args=CONNECT_ARGS)


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = get_sessionmaker()()
    try:
        yield db
    finally:
        db.close()
