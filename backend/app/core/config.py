"""Cấu hình ứng dụng, đọc từ biến môi trường (file .env qua docker compose)."""

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

# Giá trị mẫu trong .env.example: bản thật không được chạy với các giá trị này.
JWT_SECRET_MAU = "doi-chuoi-nay"
MAT_KHAU_CSDL_MAU = "doi-mat-khau-nay"
DO_DAI_JWT_SECRET_TOI_THIEU = 32


class Settings(BaseSettings):
    # hide_input_in_errors: lỗi cấu hình không in giá trị (chuỗi kết nối, khóa) ra log.
    model_config = SettingsConfigDict(extra="ignore", hide_input_in_errors=True)

    database_url: str
    jwt_secret: str
    app_env: Literal["dev", "prod"] = "dev"

    @property
    def is_prod(self) -> bool:
        return self.app_env == "prod"

    @model_validator(mode="after")
    def _kiem_tra_ban_that(self) -> "Settings":
        # make_url ném ArgumentError kèm nguyên chuỗi (có mật khẩu); đổi thành ValueError không chứa chuỗi.
        try:
            url = make_url(self.database_url)
        except ArgumentError:
            raise ValueError("DATABASE_URL không đúng định dạng postgresql+psycopg://...") from None
        if not self.is_prod:
            return self
        if self.jwt_secret == JWT_SECRET_MAU or len(self.jwt_secret) < DO_DAI_JWT_SECRET_TOI_THIEU:
            raise ValueError(
                f"APP_ENV=prod: JWT_SECRET phải là chuỗi ngẫu nhiên từ {DO_DAI_JWT_SECRET_TOI_THIEU} ký tự, "
                "không dùng giá trị mẫu"
            )
        if url.password == MAT_KHAU_CSDL_MAU:
            raise ValueError("APP_ENV=prod: POSTGRES_PASSWORD đang là giá trị mẫu, hãy đổi trong .env")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
