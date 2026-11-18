# Stem3D – Phòng thí nghiệm ảo 3D STEM

Nền tảng thí nghiệm ảo 3D cho Vật lí, Hóa học, Sinh học lớp 1–12, một máy chủ trung tâm phục vụ mọi trường.
Sản phẩm của công ty InoLink. Giao diện, thông báo, dữ liệu mẫu: 100% tiếng Việt.

## Đề bài (đọc trước khi làm)
- `docs/chuong-2-phan-tich-thiet-ke.md` – Use Case, CSDL 15 bảng (mục 2.7), phân quyền (mục 2.5)
- `docs/chuong-3-thiet-ke-api-giao-dien.md` – 73 API REST + 1 WebSocket, quy ước giao diện (mục 3.2.1)
- `docs/phu-luc-csdl.md` – lệnh SQL tạo bảng, các quan hệ
- `docs/quyet-dinh.md` – các quyết định đã chốt (đọc khi phân vân)
- `docs/giao-dien-chuong-3.html`, `docs/hinh-giao-dien/` – giao diện mẫu cho 11 màn hình
Tài liệu dài: dùng subagent `tra-cuu-dac-ta` để tra đúng đoạn cần.

## Cấu trúc
- `backend/` – Python FastAPI (quy ước riêng: `backend/CLAUDE.md`)
- `frontend/` – React + TypeScript + Three.js (quy ước riêng: `frontend/CLAUDE.md`)
- `docker-compose.yml` – 3 dịch vụ: `web` (Nginx + frontend), `api` (FastAPI), `db` (PostgreSQL)

## Lệnh
- Khởi động (máy phát triển, tự nạp `docker-compose.override.yml`): `docker compose up -d --build`
- Chạy bản thật (bỏ qua override): `docker compose -f docker-compose.yml up -d --build`
- Xem log: `docker compose logs -f api`
- Test backend: `docker compose exec api pytest`
- Migration: `docker compose exec api alembic upgrade head`

## Triển khai
- HTTPS: Nginx tự giữ chứng chỉ Let's Encrypt, mở cổng 443; làm khi triển khai thật (hiện chỉ có cổng 80/8080).
- Cookie refresh token chỉ bật `Secure` khi `APP_ENV=prod`; dev chạy http://localhost vẫn đăng nhập được.

## Cài đặt trên máy mới
1. Cài Git, Docker Desktop, Node.js LTS, Python 3.12+.
2. `git clone` kho, chép `.env.example` thành `.env` và điền giá trị.
3. `docker compose up -d --build` rồi `docker compose exec api alembic upgrade head`.
4. Mở Claude Code trong thư mục gốc; duyệt MCP `playwright` khi được hỏi.

## Quy tắc bảo mật – QUAN TRỌNG
- Không bao giờ trả về `password_hash`, mật khẩu, đáp án câu hỏi, công thức chấm, sai số cho phép trong API học tập.
- Với vai trò thuộc trường, `school_id` luôn lấy từ JWT, không lấy từ dữ liệu gửi lên. Bản ghi của trường khác trả 404.
- Máy chủ tự chấm lại kết quả thí nghiệm từ công thức trong `lessons.config`; không tin điểm máy học sinh gửi lên.
- Không ghi mật khẩu, khóa bí mật vào code hay Git; dùng biến môi trường (`.env`).

## Cách làm việc
- Trước khi tạo hoặc sửa nhiều file: trình bày kế hoạch và chờ đồng ý.
- Làm từng phần nhỏ; xong phần nào chạy test phần đó, báo kết quả rồi mới commit.
- Trước khi commit tính năng: nhờ subagent `review-code` soát lại.
- Commit message tiếng Việt, ngắn gọn, bắt đầu bằng động từ ("Thêm…", "Sửa…").
- Không sửa file trong `docs/` (hook sẽ chặn); thay đổi thiết kế thì hỏi người dùng.
- Đường dẫn trong cấu hình luôn tương đối, không ghi cứng ổ đĩa (dự án chạy trên nhiều máy).
