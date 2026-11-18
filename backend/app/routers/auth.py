"""Nhóm 1 – xác thực: /api/auth/login, refresh, logout, me, change-password (Bảng 3-2, 3-8)."""

from datetime import datetime

from fastapi import APIRouter, Cookie, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.clock import get_now
from app.core.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user_for_auth
from app.core.errors import AppError, error_response
from app.core.security import REFRESH_TOKEN_SECONDS
from app.schemas.auth import ChangePasswordIn, LoginIn, MeOut, TokenOut
from app.services import auth as auth_service
from app.services.auth import CurrentUser, KetQuaCapToken

router = APIRouter(prefix="/api/auth", tags=["Xác thực"])

TEN_COOKIE = "refresh_token"
DUONG_DAN_COOKIE = "/api/auth"


def _dat_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        TEN_COOKIE,
        refresh_token,
        max_age=REFRESH_TOKEN_SECONDS,
        path=DUONG_DAN_COOKIE,
        httponly=True,
        samesite="strict",
        # Secure chỉ bật ở bản thật (HTTPS); dev chạy http://localhost vẫn đăng nhập được.
        secure=get_settings().is_prod,
    )


def _xoa_cookie(response: Response) -> None:
    response.delete_cookie(
        TEN_COOKIE, path=DUONG_DAN_COOKIE, httponly=True, samesite="strict", secure=get_settings().is_prod
    )


def _tra_token(response: Response, ket_qua: KetQuaCapToken) -> TokenOut:
    _dat_cookie(response, ket_qua.refresh_token)
    response.headers["Cache-Control"] = "no-store"
    return ket_qua.token


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


@router.post("/login", response_model=TokenOut)
def login(
    data: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> TokenOut:
    return _tra_token(response, auth_service.login(db, data.username, data.password, now, _ip(request)))


@router.post("/refresh", response_model=TokenOut)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> TokenOut | JSONResponse:
    try:
        ket_qua = auth_service.refresh(db, refresh_token, now)
    except AppError as exc:
        # Refresh token không hợp lệ: trả lỗi và xóa cookie trên máy này.
        loi = error_response(exc)
        _xoa_cookie(loi)
        return loi
    return _tra_token(response, ket_qua)


@router.post("/logout", status_code=204)
def logout() -> Response:
    phan_hoi = Response(status_code=204)
    _xoa_cookie(phan_hoi)
    return phan_hoi


@router.get("/me", response_model=MeOut)
def me(current: CurrentUser = Depends(get_current_user_for_auth), db: Session = Depends(get_db)) -> MeOut:
    return auth_service.me(db, current)


@router.post("/change-password", response_model=TokenOut)
def change_password(
    data: ChangePasswordIn,
    request: Request,
    response: Response,
    current: CurrentUser = Depends(get_current_user_for_auth),
    db: Session = Depends(get_db),
    now: datetime = Depends(get_now),
) -> TokenOut:
    ket_qua = auth_service.change_password(
        db, current, data.current_password, data.new_password, now, _ip(request)
    )
    return _tra_token(response, ket_qua)
