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
- Mã lỗi chung (đặt trong `app/core/errors.py`, mọi API dùng thống nhất; mã riêng của từng API theo chương 3):
  - 404 `NOT_FOUND` – đường dẫn không có
  - 405 `METHOD_NOT_ALLOWED` – sai phương thức
  - 422 `VALIDATION_ERROR` – dữ liệu sai; `details` = danh sách `{field, message}`, không vọng lại giá trị gửi lên
  - 500 `INTERNAL_ERROR` – lỗi không lường trước; chi tiết chỉ ghi log
  - 413 `FILE_TOO_LARGE` – Nginx trả khi yêu cầu vượt 151 MB; API tải mô hình tự chặn chính xác file > 150 MB
- Phân quyền hai lớp: router dùng `require_role(...)`, service kiểm tra cùng trường / đúng lớp. Khác trường → 404.
- Thời gian: cột kiểu `TIMESTAMP` (không múi giờ, đúng phụ lục) nhưng luôn chứa giờ UTC – phiên kết nối ép
  `timezone=UTC` (`CONNECT_ARGS` trong `app/core/database.py`), nên `now()` cũng là UTC. Ghi vào CSDL dùng
  `datetime` UTC không kèm múi giờ. Trả ra API dùng kiểu `UtcDatetime` (`app/schemas/common.py`): ISO 8601 có múi giờ.
  Phần phụ thuộc giờ (khóa tạm, hạn nộp) nhận hàm lấy giờ để test được.
- Danh sách: `page`, `page_size` (mặc định 20, tối đa 100), trả `{items, total, page, page_size}`.

## Migration
- Mọi thay đổi bảng đều qua Alembic; không sửa migration đã chạy, tạo migration mới.
- Bảng, cột, ràng buộc phải khớp `docs/phu-luc-csdl.md`. Khác đi thì hỏi trước.

## Test
- Test chạy với CSDL PostgreSQL thật trong Docker (CSDL riêng cho test), mỗi test một giao dịch rồi hoàn tác.
  - `tests/conftest.py`: dùng `TEST_DATABASE_URL` (tên CSDL bắt buộc kết thúc `_test`, đặt trong
    `docker-compose.override.yml`), tự tạo CSDL và chạy `alembic upgrade head` đầu mỗi phiên test.
  - Fixture `db` (phiên CSDL, hoàn tác sau test) và `client` (TestClient dùng chung phiên `db`).
  - Kiểm tra vi phạm ràng buộc trong `db.begin_nested()` và so `IntegrityError.orig.diag.constraint_name`.
- Tên ràng buộc theo quy tắc trong `app/models/base.py` (`ck_<bảng>_<tên>`, `uq_…`, `fk_…`); CHECK luôn đặt `name=`.
- Mỗi API: trường hợp đúng, sai dữ liệu, không có quyền, khác trường, và từng mã lỗi trong đặc tả.

## Việc còn chờ
- `docker-compose.yml`: chỉ truyền cho `api` những biến nó cần (hiện `env_file: .env` truyền cả `POSTGRES_PASSWORD`).
- Lớp 1–3 chưa có môn: cân nhắc thêm môn "Tự nhiên và Xã hội" (lớp 1–3) – hỏi người dùng trước khi thêm.
- Khi làm phần xác thực:
  - bcrypt lặng lẽ cắt mật khẩu dài hơn 72 byte: schema đặt/đổi mật khẩu phải giới hạn độ dài tính theo byte UTF-8
    (chữ tiếng Việt có dấu chiếm 2–3 byte).
  - Giờ gửi lên (`open_at`, `due_at`, `submitted_at`…) dùng `AwareDatetime` (bắt buộc có múi giờ) rồi đổi sang UTC
    không múi giờ trước khi ghi. `UtcDatetime` chỉ dùng cho schema `...Out`.
  - Lỗi 401/403 ném `AppError` với mã trong chương 3; không dùng `HTTPBearer`/`HTTPException` (sẽ ra `HTTP_ERROR`).
