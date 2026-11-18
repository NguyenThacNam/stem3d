---
name: tao-migration
description: Tạo hoặc sửa bảng CSDL PostgreSQL của Stem3D bằng SQLAlchemy model và Alembic migration, đối chiếu với phụ lục CSDL. Dùng khi cần thêm bảng, thêm hoặc sửa cột, ràng buộc, chỉ mục, hoặc khi model và CSDL lệch nhau.
---

# Tạo migration

## Các bước
1. Đọc định nghĩa bảng trong `docs/phu-luc-csdl.md` (lệnh CREATE TABLE và bảng quan hệ) và mục 2.7 chương 2.
2. Viết hoặc sửa model trong `backend/app/models/<ten_bang>.py` cho khớp từng cột: kiểu, NOT NULL, DEFAULT,
   CHECK, UNIQUE, khóa ngoại và `ondelete` (CASCADE / SET NULL), chỉ mục một phần (ví dụ chủ nhiệm duy nhất mỗi lớp).
3. Sinh migration: `docker compose exec api alembic revision --autogenerate -m "<mô tả tiếng Việt không dấu>"`.
4. Đọc lại file migration vừa sinh: autogenerate hay bỏ sót CHECK, chỉ mục một phần, giá trị DEFAULT phía máy chủ.
   Bổ sung bằng tay nếu thiếu.
5. Chạy `docker compose exec api alembic upgrade head`, rồi `alembic downgrade -1` và `upgrade head` lại để chắc
   migration đảo ngược được.
6. Báo danh sách bảng/cột đã đổi.

## Quy tắc bắt buộc
- Không sửa migration đã commit; luôn tạo migration mới.
- Tên bảng, cột giữ đúng như phụ lục (snake_case, số nhiều cho bảng).
- Khác phụ lục (thêm/bớt cột, đổi kiểu) thì hỏi người dùng trước; được đồng ý thì ghi lại lý do trong `docs/quyet-dinh.md`
  qua người dùng (thư mục `docs/` bị hook chặn sửa).
- Không đưa dữ liệu thật vào migration; dữ liệu mẫu để trong script seed riêng.
