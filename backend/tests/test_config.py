"""Cấu hình: APP_ENV chỉ nhận dev/prod; bản thật không chạy với khóa, mật khẩu mẫu."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings

URL_TOT = "postgresql+psycopg://stem3d:mat-khau-that-dai@db:5432/stem3d"
KHOA_TOT = "k" * 48


def test_dev_chap_nhan_gia_tri_mau() -> None:
    s = Settings(
        database_url="postgresql+psycopg://stem3d:doi-mat-khau-nay@db:5432/stem3d",
        jwt_secret="doi-chuoi-nay",
        app_env="dev",
    )
    assert s.is_prod is False


def test_prod_hop_le() -> None:
    s = Settings(database_url=URL_TOT, jwt_secret=KHOA_TOT, app_env="prod")
    assert s.is_prod is True


def test_app_env_go_nham_bi_tu_choi() -> None:
    with pytest.raises(ValidationError):
        Settings(database_url=URL_TOT, jwt_secret=KHOA_TOT, app_env="production")


@pytest.mark.parametrize("khoa", ["doi-chuoi-nay", "ngan-qua"])
def test_prod_tu_choi_jwt_secret_yeu(khoa: str) -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(database_url=URL_TOT, jwt_secret=khoa, app_env="prod")


@pytest.mark.parametrize("app_env", ["dev", "prod"])
def test_database_url_sai_khong_lo_mat_khau(app_env: str) -> None:
    with pytest.raises(ValidationError) as loi:
        Settings(database_url="postgres//stem3d:MATKHAUBIMAT@db/stem3d", jwt_secret=KHOA_TOT, app_env=app_env)

    assert "DATABASE_URL không đúng định dạng" in str(loi.value)
    assert "MATKHAUBIMAT" not in str(loi.value)


def test_prod_tu_choi_mat_khau_csdl_mau() -> None:
    with pytest.raises(ValidationError, match="POSTGRES_PASSWORD"):
        Settings(
            database_url="postgresql+psycopg://stem3d:doi-mat-khau-nay@db:5432/stem3d",
            jwt_secret=KHOA_TOT,
            app_env="prod",
        )
