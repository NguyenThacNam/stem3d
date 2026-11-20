"""Nghiệp vụ mô hình 3D (UC 21; API 45–48; Bảng 3-11).

Nạp mô hình (API 46):
1. Kiểm tra khai báo: CC BY / CC BY-SA bắt buộc có dòng ghi công → 422 ATTRIBUTION_REQUIRED.
2. Dung lượng > 150 MB → 413 FILE_TOO_LARGE (Nginx chặn ở 151 MB vì gói multipart có thêm vài KB).
3. Đọc GLB (app/services/glb.py); không đọc được → 422 INVALID_GLB.
4. Vượt mức chặn (1,5 triệu tam giác, texture 4096 px) → 422 LIMIT_EXCEEDED kèm con số cụ thể.
5. Vượt mức cảnh báo (50 MB, 500.000 tam giác, texture 2048 px) mà chưa gửi accept_warnings → 409
   WARNINGS_NOT_ACCEPTED kèm danh sách cảnh báo; giao diện hỏi biên tập viên rồi gửi lại.
6. Lưu file vào thư mục nội dung, ghi bản ghi assets và nhật ký UPLOAD_ASSET trong cùng giao dịch.
Không nén lại file (docs/quyet-dinh.md). Các mức tính "vượt" là lớn hơn hẳn: đúng 4096 px vẫn nạp được.

Lưu file: chép vào tmp/ trước, có id mới đổi tên sang models/<id>.v1.glb (cùng volume nên đổi tên là nguyên
tử – Nginx không bao giờ phục vụ file ghi dở). Lỗi ở bất kỳ bước nào thì xóa file đã ghi, CSDL tự hoàn tác.
Tên file có số phiên bản để trình duyệt / CDN lưu đệm lâu dài (docs/quyet-dinh.md); file_path lưu tương đối
so với thư mục nội dung ("models/12.v1.glb"), trình duyệt tải tại /content/<file_path>.
"""

import logging
import os
import shutil
from typing import BinaryIO
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.models import Asset
from app.repositories import assets as assets_repo
from app.schemas.assets import (
    NGUON_CAN_GHI_CONG,
    AssetCheckItem,
    AssetDetailOut,
    AssetLessonRef,
    AssetListItem,
    AssetListOut,
    AssetUploadOut,
    ChiSo,
)
from app.services import nhat_ky
from app.services.auth import CurrentUser
from app.services.glb import BaoCaoGlb, GlbKhongHopLe, doc_glb

logger = logging.getLogger("stem3d")

MB = 1024 * 1024

# Mức chặn và mức cảnh báo (docs/quyet-dinh.md, Bảng 3-11).
MUC_CHAN: dict[ChiSo, int] = {"file_size": 150 * MB, "triangle_count": 1_500_000, "max_texture_px": 4096}
MUC_CANH_BAO: dict[ChiSo, int] = {"file_size": 50 * MB, "triangle_count": 500_000, "max_texture_px": 2048}

PHIEN_BAN_FILE = 1
DOAN_CHEP = MB


def _so_viet(n: int) -> str:
    """1500000 -> "1.500.000" (cách viết số của tiếng Việt)."""
    return f"{n:,}".replace(",", ".")


def _mo_ta(chi_so: ChiSo, gia_tri: int, gioi_han: int) -> str:
    if chi_so == "file_size":
        return f"Dung lượng {gia_tri / MB:.1f} MB vượt mức {gioi_han // MB} MB".replace(".", ",", 1)
    if chi_so == "triangle_count":
        return f"Số tam giác {_so_viet(gia_tri)} vượt mức {_so_viet(gioi_han)}"
    return f"Texture {_so_viet(gia_tri)} px vượt mức {_so_viet(gioi_han)} px"


def _vuot(gia_tri: dict[ChiSo, int], muc: dict[ChiSo, int]) -> list[AssetCheckItem]:
    return [
        AssetCheckItem(field=k, value=gia_tri[k], limit=muc[k], message=_mo_ta(k, gia_tri[k], muc[k]))
        for k in muc
        if gia_tri[k] > muc[k]
    ]


def _vuot_muc(bao_cao: BaoCaoGlb, file_size: int, muc: dict[ChiSo, int]) -> list[AssetCheckItem]:
    return _vuot(
        {
            "file_size": file_size,
            "triangle_count": bao_cao.triangle_count,
            "max_texture_px": bao_cao.max_texture_px or 0,
        },
        muc,
    )


def _canh_bao_da_luu(asset: Asset) -> list[AssetCheckItem]:
    """Báo cáo cảnh báo tính lại từ các cột đã lưu (bảng assets không lưu warnings)."""
    return _vuot(
        {
            "file_size": asset.file_size or 0,
            "triangle_count": asset.triangle_count or 0,
            "max_texture_px": asset.max_texture_px or 0,
        },
        MUC_CANH_BAO,
    )


def upload_asset(
    db: Session,
    actor: CurrentUser,
    settings: Settings,
    *,
    file: BinaryIO,
    name: str,
    source_type: str,
    attribution: str | None,
    accept_warnings: bool,
) -> AssetUploadOut:
    attribution = (attribution or "").strip() or None
    if source_type in NGUON_CAN_GHI_CONG and attribution is None:
        raise AppError(
            422,
            "ATTRIBUTION_REQUIRED",
            "Mô hình theo giấy phép CC BY / CC BY-SA cần dòng ghi công tác giả, hãy nhập dòng ghi công",
            [{"field": "attribution", "message": "Bắt buộc với giấy phép CC BY, CC BY-SA"}],
        )

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    if file_size > MUC_CHAN["file_size"]:
        raise AppError(413, "FILE_TOO_LARGE", "File vượt quá 150 MB, hãy chọn file nhỏ hơn")

    try:
        bao_cao = doc_glb(file)
    except GlbKhongHopLe as e:
        raise AppError(422, "INVALID_GLB", str(e)) from None

    vuot_chan = _vuot_muc(bao_cao, file_size, MUC_CHAN)
    if vuot_chan:
        raise AppError(
            422,
            "LIMIT_EXCEEDED",
            "Mô hình vượt giới hạn cho phép, hãy giảm số tam giác hoặc kích thước texture rồi xuất lại",
            [x.model_dump() for x in vuot_chan],
        )
    canh_bao = _vuot_muc(bao_cao, file_size, MUC_CANH_BAO)
    if canh_bao and not accept_warnings:
        raise AppError(
            409,
            "WARNINGS_NOT_ACCEPTED",
            "Mô hình vượt mức khuyến nghị nên có thể chạy chậm trên máy yếu, hãy xác nhận nếu vẫn muốn nạp",
            [x.model_dump() for x in canh_bao],
        )

    asset = _luu(db, actor, settings, file, Asset(
        name=name,
        file_path="",  # đặt lại khi có id
        file_size=file_size,
        triangle_count=bao_cao.triangle_count,
        max_texture_px=bao_cao.max_texture_px,
        mesh_names=bao_cao.mesh_names,
        source_type=source_type,
        attribution=attribution,
        uploaded_by=actor.id,
    ))
    return AssetUploadOut(
        id=asset.id,
        file_size=file_size,
        triangle_count=bao_cao.triangle_count,
        max_texture_px=bao_cao.max_texture_px,
        mesh_names=bao_cao.mesh_names,
        unnamed_meshes=bao_cao.unnamed_meshes,
        warnings=canh_bao,
    )


def _luu(db: Session, actor: CurrentUser, settings: Settings, file: BinaryIO, asset: Asset) -> Asset:
    settings.content_tmp_dir.mkdir(parents=True, exist_ok=True)
    settings.models_dir.mkdir(parents=True, exist_ok=True)
    tam = settings.content_tmp_dir / f"{uuid4().hex}.glb"
    dich = None
    try:
        file.seek(0)
        with tam.open("wb") as ra:
            shutil.copyfileobj(file, ra, DOAN_CHEP)
        assets_repo.add(db, asset)
        ten_file = f"{asset.id}.v{PHIEN_BAN_FILE}.glb"
        asset.file_path = f"models/{ten_file}"
        nhat_ky.ghi(
            db,
            "UPLOAD_ASSET",
            nguoi_lam=actor,
            doi_tuong="asset",
            doi_tuong_id=asset.id,
            ten_doi_tuong=asset.name,
            chi_tiet={"file_size": asset.file_size, "source_type": asset.source_type},
        )
        db.flush()
        dich = settings.models_dir / ten_file
        os.replace(tam, dich)
        db.commit()
    except BaseException:
        # Không để lại file mồ côi; CSDL hoàn tác khi phiên đóng (get_db).
        tam.unlink(missing_ok=True)
        if dich is not None:
            dich.unlink(missing_ok=True)
        raise
    return asset


# ---------------------------------------------------------------- API 45, 47, 48


def _khong_tim_thay() -> AppError:
    return AppError(404, "ASSET_NOT_FOUND", "Không tìm thấy mô hình, có thể mô hình đã bị xóa")


def _dong(asset: Asset, ten_nguoi_nap: str | None, so_bai: int) -> dict[str, object]:
    return {
        "id": asset.id,
        "name": asset.name,
        "file_url": f"/content/{asset.file_path}",
        "source_type": asset.source_type,
        "attribution": asset.attribution,
        "file_size": asset.file_size,
        "triangle_count": asset.triangle_count,
        "max_texture_px": asset.max_texture_px,
        "mesh_count": len(asset.mesh_names or []),
        "uploaded_by_name": ten_nguoi_nap,
        "created_at": asset.created_at,
        "lesson_count": so_bai,
        "warning_fields": [c.field for c in _canh_bao_da_luu(asset)],
    }


def list_assets(db: Session, *, q: str | None, page: int, page_size: int) -> AssetListOut:
    """API 45 – mới nạp trước; tìm theo tên (không phân biệt hoa thường)."""
    q = (q or "").strip() or None
    rows, total = assets_repo.list_page(db, q=q, offset=(page - 1) * page_size, limit=page_size)
    return AssetListOut(
        items=[AssetListItem.model_validate(_dong(a, ten, so)) for a, ten, so in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_asset(db: Session, asset_id: int) -> AssetDetailOut:
    """API 47 – báo cáo kiểm tra, danh sách mesh và các bài đang dùng."""
    row = assets_repo.get_with_uploader(db, asset_id)
    if row is None:
        raise _khong_tim_thay()
    asset, ten = row
    bai = assets_repo.lessons_using(db, asset_id)
    return AssetDetailOut.model_validate(
        _dong(asset, ten, len(bai))
        | {
            "mesh_names": list(asset.mesh_names or []),
            "warnings": _canh_bao_da_luu(asset),
            "lessons": [AssetLessonRef(id=b.id, title=b.title, status=b.status) for b in bai],
        }
    )


def delete_asset(db: Session, actor: CurrentUser, settings: Settings, asset_id: int) -> None:
    """API 48 – chỉ xóa khi chưa bài nào dùng (UC 21 luồng 6.1); xóa hẳn cả file GLB.

    Khóa dòng assets trước khi kiểm tra để bài học không gắn được mô hình giữa lúc kiểm tra và xóa.
    File chỉ xóa sau khi CSDL đã commit: commit hỏng thì file vẫn còn, bản ghi vẫn trỏ đúng.
    """
    asset = assets_repo.get_for_update(db, asset_id)
    if asset is None:
        raise _khong_tim_thay()
    bai = assets_repo.lessons_using(db, asset_id)
    if bai:
        raise AppError(
            409,
            "ASSET_IN_USE",
            f"Mô hình đang được {len(bai)} bài học dùng, hãy đổi mô hình của các bài đó trước khi xóa",
            [{"id": b.id, "title": b.title, "status": b.status} for b in bai],
        )
    duong_dan = settings.content_dir / asset.file_path
    nhat_ky.ghi(
        db,
        "DELETE_ASSET",
        nguoi_lam=actor,
        doi_tuong="asset",
        doi_tuong_id=asset.id,
        ten_doi_tuong=asset.name,
        chi_tiet={"file_size": asset.file_size, "source_type": asset.source_type},
    )
    assets_repo.delete(db, asset)
    db.commit()
    try:
        duong_dan.unlink(missing_ok=True)
    except OSError:
        # Bản ghi đã xóa; file sót lại chỉ tốn chỗ, không ai trỏ tới. Ghi log để dọn tay.
        logger.exception("Không xóa được file mô hình %s", duong_dan)
