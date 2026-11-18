# Các quyết định đã chốt

Ghi lại để máy nào, người nào mở dự án cũng biết. Khi tài liệu chương 2, 3 và file này mâu thuẫn, hỏi lại người dùng.

## Kiến trúc
- Một máy chủ trung tâm cho mọi trường; trường cần Internet. Không làm chế độ offline/PWA.
- Backend FastAPI chia lớp Router → Service → Repository → Model; schema Pydantic riêng cho đầu vào và đầu ra.
- PostgreSQL + SQLAlchemy 2 + Alembic. 15 bảng, 23 quan hệ (xem `phu-luc-csdl.md`). Xóa là xóa hẳn, không xóa mềm.
- File GLB phân phối qua CDN, đường dẫn có số phiên bản (`ten.v3.glb`). Không tự nén mô hình.
- Giai đoạn đầu chạy 1 bản api; khi chạy nhiều bản thì phòng lớp học (WebSocket) dùng Redis chuyển sự kiện.

## Vai trò và tài khoản
- 5 vai trò, mỗi tài khoản đúng 1 vai trò: SYSTEM_ADMIN, CONTENT_EDITOR, SCHOOL_ADMIN, TEACHER, STUDENT.
- SYSTEM_ADMIN kế thừa CONTENT_EDITOR: làm được mọi việc về bài học, mô hình (API `/api/editor/...`, `/api/assets`).
- Hồ sơ riêng chỉ có `student_profiles`, `teacher_profiles`. Không có bảng hồ sơ quản trị trường.
- Tạo hồ sơ là tạo luôn tài khoản trong một giao dịch. Tên đăng nhập = mã trường + "." + mã HS/GV; quản trị trường đầu tiên = mã trường + ".admin". Mật khẩu ban đầu ngẫu nhiên 8 ký tự, chỉ hiện một lần.
- Bắt buộc đổi mật khẩu lần đầu với SCHOOL_ADMIN, SYSTEM_ADMIN, CONTENT_EDITOR (cờ `must_change_password`).
- Sai 5 lần liên tiếp thì khóa tạm: 15 phút (quản trị, biên tập), 1 phút (giáo viên, học sinh). Không giới hạn theo IP.

## Xác thực
- Access token JWT 15 phút, giữ trong bộ nhớ ứng dụng (không localStorage), gửi qua `Authorization: Bearer`.
- Refresh token JWT 8 giờ trong cookie httpOnly, Secure, SameSite=Strict, Path=/api/auth; cấp mới mỗi lần làm mới.
- Thu hồi bằng cột `users.token_version`: tăng khi đổi/đặt lại mật khẩu hoặc khóa tài khoản. Không có bảng refresh_tokens.

## Bài học
- Không có "khóa học": bài học xếp theo môn + lớp + bộ sách + chương (`lessons.chapter` là TEXT).
- Biên tập viên tự xuất bản, không có bước duyệt.
- `lessons.config` lưu CÔNG THỨC đáp án; máy chủ tính lại bằng bộ tính biểu thức an toàn rồi chấm.
- Nộp bài: `attempts.client_id` (UUID do máy học sinh sinh) UNIQUE, lưu bằng INSERT … ON CONFLICT DO NOTHING.
- Ngưỡng mô hình: chặn > 150 MB / 1,5 triệu tam giác / texture 4096 px; cảnh báo > 50 MB / 500.000 / 2048 px.

## Giao diện
- Thư viện thành phần shadcn/ui + Tailwind; biểu tượng Lucide; phông Be Vietnam Pro (tự lưu trong dự án).
- Quy ước màu, chữ, khoảng cách theo mục 3.2.1 chương 3; mẫu chuẩn là `giao-dien-chuong-3.html`.
- Có trang giới thiệu công khai; chân trang ghi "Sản phẩm của InoLink".
