"""Nhóm mô hình 3D – /api/assets (Bảng 3-6, API 45–48). Biên tập viên, quản trị hệ thống (kế thừa)."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from pydantic import StringConstraints
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.deps import require_role
from app.schemas.assets import AssetDetailOut, AssetListOut, AssetUploadOut, SourceType
from app.schemas.common import IdPath
from app.services import assets as assets_service
from app.services.auth import CurrentUser

router = APIRouter(prefix="/api/assets", tags=["Mô hình 3D"])

TenMoHinh = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
BienTap = require_role("CONTENT_EDITOR")


@router.get("", response_model=AssetListOut)
def list_assets(
    q: Annotated[str | None, Query(max_length=200)] = None,
    page: Annotated[int, Query(ge=1, le=100_000)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    _actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
) -> AssetListOut:
    """API 45 – danh sách mô hình đã nạp."""
    return assets_service.list_assets(db, q=q, page=page, page_size=page_size)


@router.post("", response_model=AssetUploadOut, status_code=201)
def upload_asset(
    file: Annotated[UploadFile, File()],
    name: Annotated[TenMoHinh, Form()],
    source_type: Annotated[SourceType, Form()],
    attribution: Annotated[str | None, Form(max_length=500)] = None,
    accept_warnings: Annotated[bool, Form()] = False,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AssetUploadOut:
    """API 46 – nạp mô hình GLB (multipart/form-data), kiểm tra tự động (Bảng 3-11)."""
    return assets_service.upload_asset(
        db,
        actor,
        settings,
        file=file.file,
        name=name,
        source_type=source_type,
        attribution=attribution,
        accept_warnings=accept_warnings,
    )


@router.get("/{asset_id}", response_model=AssetDetailOut)
def get_asset(
    asset_id: IdPath,
    _actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
) -> AssetDetailOut:
    """API 47 – báo cáo kiểm tra và danh sách mesh."""
    return assets_service.get_asset(db, asset_id)


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: IdPath,
    actor: CurrentUser = Depends(BienTap),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    """API 48 – xóa mô hình chưa được bài nào dùng (xóa cả file GLB)."""
    assets_service.delete_asset(db, actor, settings, asset_id)
    return Response(status_code=204)
