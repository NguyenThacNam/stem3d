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
  - 401 `NOT_AUTHENTICATED` – thiếu header `Authorization: Bearer`
  - 401 `TOKEN_INVALID` – access token sai chữ ký, sai loại (dùng refresh token), tài khoản không còn
  - 401 `TOKEN_EXPIRED` – access token hết hạn (máy khách gọi /api/auth/refresh)
  - 403 `FORBIDDEN` – sai vai trò hoặc cùng trường nhưng ngoài phạm vi
  - 403 `PASSWORD_CHANGE_REQUIRED` – tài khoản phải đổi mật khẩu, gọi API ngoài `/api/auth`
  - 403 `ACCOUNT_DISABLED`, `SCHOOL_DISABLED` – tài khoản / trường bị khóa (kiểm tra ở mỗi yêu cầu)
- Lỗi 401/403 luôn ném `AppError`; không dùng `fastapi.security.HTTPBearer` hay `HTTPException` (sẽ ra `HTTP_ERROR`).
- Phân quyền hai lớp: router dùng `require_role(...)`, service kiểm tra cùng trường / đúng lớp. Khác trường → 404.
  - `require_role(...)` (`app/core/deps.py`): khai báo `CONTENT_EDITOR` thì `SYSTEM_ADMIN` tự được dùng.
  - `get_current_user` chặn tài khoản phải đổi mật khẩu; chỉ API `/api/auth/*` dùng `get_current_user_for_auth`.
  - Mỗi yêu cầu đọc lại tài khoản trong CSDL: khóa tài khoản / trường có hiệu lực ngay.
- Thời gian: cột kiểu `TIMESTAMP` (không múi giờ, đúng phụ lục) nhưng luôn chứa giờ UTC – phiên kết nối ép
  `timezone=UTC` (`CONNECT_ARGS` trong `app/core/database.py`), nên `now()` cũng là UTC. Ghi vào CSDL dùng
  `datetime` UTC không kèm múi giờ.
  - Trả ra API: kiểu `UtcDatetime` (`app/schemas/common.py`) – ISO 8601 có múi giờ.
  - Nhận từ API (`open_at`, `due_at`, `submitted_at`…): kiểu `UtcInputDatetime` – bắt buộc có múi giờ, đổi về UTC.
  - Giờ hiện tại lấy qua dependency `get_now` (`app/core/clock.py`), truyền xuống service; test ghi đè để tua giờ.
- Năm học hiện tại: `current_school_year(now)` trong `app/core/clock.py` – từ 1/8 năm N đến hết 31/7 năm N+1
  (theo giờ Việt Nam) là `"N-(N+1)"`, ví dụ 18/11/2026 → `"2026-2027"`. Giáo viên chủ nhiệm chỉ có quyền với lớp
  chủ nhiệm trong năm học hiện tại.
- Mật khẩu mới dùng kiểu `NewPassword`: tối thiểu 8 ký tự, tối đa 72 byte UTF-8 (giới hạn của bcrypt);
  `verify_password` luôn trả False với mật khẩu dài hơn 72 byte.
- Tham số id trên đường dẫn dùng kiểu `IdPath` (`app/schemas/common.py`, 1 … 2.147.483.647): id ngoài khoảng trả 422,
  không để CSDL báo tràn số thành 500.
- Câu báo lỗi trong validator tự viết (`ValueError`) được trả nguyên văn ra ngoài: không bao giờ chứa giá trị gửi lên.
- Sai mật khẩu khi đăng nhập và sai mật khẩu hiện tại khi đổi mật khẩu dùng chung `failed_login_count`:
  đủ 5 lần thì khóa tạm theo vai trò, trả 423.
- Thao tác trên phản hồi chứa token hoặc mật khẩu: đặt `Cache-Control: no-store`.
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

## Giới hạn đã biết của thiết kế
- Refresh token: không có bảng `refresh_tokens` (docs/quyet-dinh.md), nên mỗi lần refresh tuy cấp token mới nhưng
  token cũ VẪN DÙNG ĐƯỢC tới hết hạn 8 giờ, trừ khi `users.token_version` tăng (đổi / đặt lại mật khẩu).
  Tài khoản / trường bị khóa thì refresh bị từ chối nhờ kiểm tra `is_active` (chưa có code tăng `token_version`
  khi khóa tài khoản – thêm khi làm API khóa tài khoản). Cấp token mới chỉ để gia hạn phiên, không chống dùng
  lại token bị lộ.
- Đăng xuất (`/api/auth/logout`) chỉ xóa cookie trên máy hiện tại (đúng đặc tả), KHÔNG tăng `token_version`:
  refresh token đã bị lộ trước đó vẫn dùng được tới hết hạn 8 giờ. Muốn thu hồi mọi phiên thì đổi mật khẩu.
- Dò được tên đăng nhập có tồn tại qua khóa tạm: tên có thật sau 5 lần sai trả 423, tên không có luôn trả 401
  (không giới hạn theo IP – docs/quyet-dinh.md). Chấp nhận vì tên đăng nhập theo quy tắc mã trường + mã HS/GV
  vốn đoán được.
- Access token cũ còn hạn tối đa 15 phút sau khi đổi mật khẩu (không so `token_version` ở access token); khóa
  tài khoản / trường thì chặn ngay vì mỗi yêu cầu đọc lại CSDL.
