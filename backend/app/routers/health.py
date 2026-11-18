"""GET /api/health – API hạ tầng, kiểm tra api và CSDL còn hoạt động (ngoài 73 API của chương 3)."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import AppError
from app.schemas.health import HealthOut

router = APIRouter(prefix="/api", tags=["Hệ thống"])


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)) -> HealthOut:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise AppError(503, "DATABASE_UNAVAILABLE", "Không kết nối được cơ sở dữ liệu") from exc
    return HealthOut(status="ok", database="ok")
