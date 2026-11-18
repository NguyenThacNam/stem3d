"""Lỗi chung: mọi lỗi trả {"error": {"code", "message", "details"}}, message tiếng Việt.

Mã lỗi chung (dùng thống nhất cho mọi API, xem backend/CLAUDE.md):
NOT_FOUND, METHOD_NOT_ALLOWED, VALIDATION_ERROR, INTERNAL_ERROR, FILE_TOO_LARGE (Nginx trả).
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("stem3d")


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def _phan_hoi(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "details": details}},
        headers=headers,
    )


async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    return _phan_hoi(exc.status_code, exc.code, exc.message, exc.details)


# Lỗi HTTP do FastAPI/Starlette tự sinh (đường dẫn không có, sai phương thức...).
_LOI_HTTP = {
    404: ("NOT_FOUND", "Không tìm thấy đường dẫn yêu cầu"),
    405: ("METHOD_NOT_ALLOWED", "Đường dẫn này không hỗ trợ phương thức đã gửi"),
}


async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code, message = _LOI_HTTP.get(exc.status_code, ("HTTP_ERROR", "Yêu cầu không xử lý được"))
    return _phan_hoi(exc.status_code, code, message, headers=getattr(exc, "headers", None))


# Câu tiếng Việt cho các loại lỗi kiểm tra dữ liệu thường gặp của Pydantic.
_LOI_DU_LIEU = {
    "missing": "Thiếu thông tin bắt buộc",
    "json_invalid": "Dữ liệu JSON không đúng cú pháp",
    "int_parsing": "Phải là số nguyên",
    "int_type": "Phải là số nguyên",
    "float_parsing": "Phải là số",
    "float_type": "Phải là số",
    "bool_parsing": "Phải là true hoặc false",
    "string_type": "Phải là chuỗi ký tự",
    "string_too_short": "Cần ít nhất {min_length} ký tự",
    "string_too_long": "Tối đa {max_length} ký tự",
    "greater_than": "Phải lớn hơn {gt}",
    "greater_than_equal": "Phải lớn hơn hoặc bằng {ge}",
    "less_than": "Phải nhỏ hơn {lt}",
    "less_than_equal": "Phải nhỏ hơn hoặc bằng {le}",
    "enum": "Chỉ nhận một trong các giá trị: {expected}",
    "literal_error": "Chỉ nhận một trong các giá trị: {expected}",
    "uuid_parsing": "Phải là UUID hợp lệ",
    "datetime_parsing": "Phải là thời điểm theo ISO 8601",
    "date_parsing": "Phải là ngày theo dạng YYYY-MM-DD",
    "extra_forbidden": "Trường này không được phép",
}
_NGUON = {"body", "query", "path", "header", "cookie"}


def _mo_ta_loi(loi: dict[str, Any]) -> dict[str, str]:
    vi_tri = [str(p) for p in loi.get("loc", ())]
    if vi_tri and vi_tri[0] in _NGUON:
        vi_tri = vi_tri[1:]
    mau = _LOI_DU_LIEU.get(loi.get("type", ""), "Giá trị không hợp lệ")
    try:
        message = mau.format(**loi.get("ctx", {}))
    except (KeyError, IndexError):
        message = "Giá trị không hợp lệ"
    # Không đưa loi["input"] ra ngoài: tránh vọng lại mật khẩu hay dữ liệu người dùng gửi lên.
    return {"field": ".".join(vi_tri), "message": message}


async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [_mo_ta_loi(loi) for loi in exc.errors()]
    return _phan_hoi(422, "VALIDATION_ERROR", "Dữ liệu gửi lên không hợp lệ", details)


async def unhandled_exception_handler(request: Request, _exc: Exception) -> JSONResponse:
    # Ghi chi tiết vào log máy chủ, không trả ra ngoài.
    logger.exception("Lỗi không lường trước khi xử lý %s %s", request.method, request.url.path)
    return _phan_hoi(500, "INTERNAL_ERROR", "Hệ thống gặp lỗi, vui lòng thử lại sau")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
