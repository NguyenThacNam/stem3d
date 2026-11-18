---
name: viet-api-fastapi
description: Viết hoặc sửa API FastAPI của Stem3D theo đặc tả chương 3. Dùng khi được yêu cầu thêm endpoint, sửa API, làm một nhóm API, hoặc viết test cho API.
---

# Viết API FastAPI theo đặc tả

## Các bước
1. Tra đặc tả (nên dùng subagent `tra-cuu-dac-ta`): số API trong Bảng 3-2 … 3-7, vai trò được dùng, Use Case,
   bảng đặc tả chi tiết nếu có (Bảng 3-8 … 3-12), các mã lỗi. Nêu lại yêu cầu thành danh sách ngắn.
2. Đối chiếu bảng, cột liên quan trong `docs/phu-luc-csdl.md`. Thiếu bảng hoặc cột thì dùng skill `tao-migration` trước.
3. Trình bày kế hoạch: file sẽ tạo hoặc sửa, nghiệp vụ từng trường hợp, danh sách test. Chờ đồng ý.
4. Viết theo thứ tự: schema → repository → service → router → gắn vào `app/main.py`.
5. Viết test trong `backend/tests/test_<nhom>.py`.
6. Chạy `docker compose exec api pytest`, báo số test đạt/không đạt.
7. Nhờ subagent `review-code` soát phần thay đổi trước khi đề xuất commit.

## Quy tắc bắt buộc
- Router: chỉ khai báo đường dẫn, `require_role(...)`, gọi service, trả schema `...Out`.
- Service: toàn bộ nghiệp vụ; kiểm tra phạm vi (cùng trường, đúng lớp mình dạy, lớp chủ nhiệm); khác trường → 404.
- `school_id` của vai trò thuộc trường luôn lấy từ người dùng hiện tại (JWT), không lấy từ body hay query.
- Schema đầu ra không có `password_hash`, đáp án, công thức chấm, sai số cho phép (trừ API `/api/editor/...`).
- Lỗi: `AppError` với đúng mã HTTP và mã lỗi trong đặc tả; message tiếng Việt nói rõ cần làm gì.
- Thao tác thay đổi tài khoản, trường, lớp, bài học, mô hình, đặt lại mật khẩu: ghi `system_logs` trong service.
- Tạo nhiều bản ghi liên quan (tài khoản + hồ sơ + xếp lớp): trong một giao dịch.

## Test tối thiểu cho mỗi API
- Trường hợp đúng.
- Dữ liệu sai (422).
- Chưa đăng nhập (401) và sai vai trò (403).
- Bản ghi thuộc trường khác (404) – với API có phạm vi trường.
- Mỗi mã lỗi nghiệp vụ trong đặc tả.
