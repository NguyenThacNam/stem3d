"""Tạo ứng dụng FastAPI, gắn router, đăng ký xử lý lỗi."""

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.routers import health


def create_app() -> FastAPI:
    settings = get_settings()
    # Tài liệu API chỉ mở ở môi trường dev.
    docs_url = None if settings.is_prod else "/api/docs"
    openapi_url = None if settings.is_prod else "/api/openapi.json"

    app = FastAPI(title="Stem3D API", docs_url=docs_url, redoc_url=None, openapi_url=openapi_url)
    register_error_handlers(app)
    app.include_router(health.router)
    return app


app = create_app()
