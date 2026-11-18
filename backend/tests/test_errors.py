"""Khuôn dạng lỗi chung: 404, 405, 422, 500 đều trả {"error": {"code", "message", "details"}}."""

from collections.abc import Iterator

import pytest
from fastapi import Query
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.main import create_app


class DuLieuThu(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=8)


@pytest.fixture
def client() -> Iterator[TestClient]:
    # Ứng dụng riêng cho test, thêm vài đường dẫn để gây lỗi; không đụng vào app thật.
    app = create_app()

    @app.get("/api/thu/so/{so}")
    def thu_so(so: int, page: int = Query(1, ge=1)) -> dict:
        return {"so": so, "page": page}

    @app.post("/api/thu/dang-nhap")
    def thu_dang_nhap(du_lieu: DuLieuThu) -> dict:
        return {"ok": True}

    @app.get("/api/thu/loi")
    def thu_loi() -> dict:
        raise RuntimeError("chi tiết nội bộ: mật khẩu CSDL abc")

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


def test_404_duong_dan_khong_co(client: TestClient) -> None:
    res = client.get("/api/khong-co")

    assert res.status_code == 404
    assert res.json() == {
        "error": {"code": "NOT_FOUND", "message": "Không tìm thấy đường dẫn yêu cầu", "details": None}
    }


def test_405_sai_phuong_thuc(client: TestClient) -> None:
    res = client.post("/api/health")

    assert res.status_code == 405
    assert res.json()["error"]["code"] == "METHOD_NOT_ALLOWED"
    assert res.json()["error"]["details"] is None
    assert "GET" in res.headers["allow"]


def test_422_sai_kieu_tham_so(client: TestClient) -> None:
    res = client.get("/api/thu/so/abc", params={"page": 0})

    assert res.status_code == 422
    loi = res.json()["error"]
    assert loi["code"] == "VALIDATION_ERROR"
    assert loi["message"] == "Dữ liệu gửi lên không hợp lệ"
    assert {"field": "so", "message": "Phải là số nguyên"} in loi["details"]
    assert {"field": "page", "message": "Phải lớn hơn hoặc bằng 1"} in loi["details"]


def test_422_khong_vong_lai_du_lieu_gui_len(client: TestClient) -> None:
    res = client.post("/api/thu/dang-nhap", json={"username": "hs", "password": "bimat12"})

    assert res.status_code == 422
    loi = res.json()["error"]
    assert loi["code"] == "VALIDATION_ERROR"
    assert {"field": "password", "message": "Cần ít nhất 8 ký tự"} in loi["details"]
    assert {"field": "username", "message": "Cần ít nhất 3 ký tự"} in loi["details"]
    assert "bimat12" not in res.text


def test_422_thieu_truong_va_json_hong(client: TestClient) -> None:
    thieu = client.post("/api/thu/dang-nhap", json={"username": "hocsinh"})
    hong = client.post(
        "/api/thu/dang-nhap", content="{khong-phai-json", headers={"content-type": "application/json"}
    )

    assert {"field": "password", "message": "Thiếu thông tin bắt buộc"} in thieu.json()["error"]["details"]
    assert hong.status_code == 422
    assert hong.json()["error"]["details"] == [{"field": "", "message": "Dữ liệu JSON không đúng cú pháp"}]
    assert "khong-phai-json" not in hong.text


def test_500_khong_lo_chi_tiet(client: TestClient) -> None:
    res = client.get("/api/thu/loi")

    assert res.status_code == 500
    assert res.json() == {
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "Hệ thống gặp lỗi, vui lòng thử lại sau",
            "details": None,
        }
    }
    assert "abc" not in res.text
