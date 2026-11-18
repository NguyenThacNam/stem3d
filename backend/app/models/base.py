from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Quy tắc đặt tên ràng buộc: tên cố định, migration đảo ngược được, test kiểm tra đúng ràng buộc.
# CHECK phải đặt name ngắn, ví dụ name="attribution" -> ck_assets_attribution.
NAMING_CONVENTION = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
