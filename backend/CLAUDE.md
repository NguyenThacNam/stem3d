# Backend – FastAPI

## Công nghệ
Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (kiểu khai báo `Mapped`), Alembic, psycopg 3, PyJWT, bcrypt, pytest.
Thư viện khai báo trong `requirements.txt`. Chạy trong container `api`.

## Cấu trúc
- `app/main.py` – tạo ứng dụng, gắn router, đăng ký xử lý lỗi
- `app/core/` – cấu hình (đọc từ biến môi trường), bảo mật (JWT, băm mật khẩu), lỗi chung, phụ thuộc (`get_db`, `get_current_user`, `require_role`)
- `app/models/` – model SQLAlchemy, mỗi bảng một file, tên trùng tên bảng
- `app/schemas/` – schema Pydantic: `XxxCreate`, `XxxUpdate`, `XxxOut`
- `app/repositories/` – truy vấn CSDL, không chứa nghiệp vụ
- `app/services/` – nghiệp vụ, kiểm tra phạm vi dữ liệu, ghi `system_logs`
- `app/routers/` – khai báo endpoint, kiểm tra vai trò, gọi service
- `alembic/` – migration
- `tests/` – pytest, mỗi router một file `test_<ten>.py`

## Quy ước
- Router không gọi repository trực tiếp. Service không trả model SQLAlchemy ra ngoài router; router trả schema `...Out`.
- Đường dẫn, tên trường JSON, mã lỗi theo đúng chương 3 (mục 3.1). Tên trường JSON = tên cột CSDL (snake_case).
- Lỗi: ném `AppError(status, code, message, details)`; trình xử lý chung trả `{"error": {"code", "message", "details"}}`, message tiếng Việt.
- Phân quyền hai lớp: router dùng `require_role(...)`, service kiểm tra cùng trường / đúng lớp. Khác trường → 404.
- Thời gian: lưu UTC trong CSDL, trả ISO 8601 có múi giờ. Phần phụ thuộc giờ (khóa tạm, hạn nộp) nhận hàm lấy giờ để test được.
- Danh sách: `page`, `page_size` (mặc định 20, tối đa 100), trả `{items, total, page, page_size}`.

## Migration
- Mọi thay đổi bảng đều qua Alembic; không sửa migration đã chạy, tạo migration mới.
- Bảng, cột, ràng buộc phải khớp `docs/phu-luc-csdl.md`. Khác đi thì hỏi trước.

## Test
- Test chạy với CSDL PostgreSQL thật trong Docker (CSDL riêng cho test), mỗi test một giao dịch rồi hoàn tác.
- Mỗi API: trường hợp đúng, sai dữ liệu, không có quyền, khác trường, và từng mã lỗi trong đặc tả.
