---
name: viet-man-hinh
description: Làm một màn hình React của Stem3D theo ảnh phác thảo và quy ước giao diện chương 3. Dùng khi được yêu cầu làm, sửa hoặc chỉnh giao diện một màn hình, trang, hộp thoại.
---

# Làm màn hình theo thiết kế

## Các bước
1. Tìm màn hình trong mục 3.2.3 chương 3 (mô tả, API dùng, Use Case) và ảnh tương ứng trong `docs/hinh-giao-dien/`.
   Mở `docs/giao-dien-chuong-3.html` để lấy đúng màu, khoảng cách, cỡ chữ của màn hình đó.
2. Liệt kê: các vùng của màn hình, thành phần shadcn/ui sẽ dùng, API sẽ gọi, các trạng thái (đang tải, rỗng, lỗi).
   Trình bày kế hoạch, chờ đồng ý.
3. Tạo trang trong `frontend/src/pages/<ten-man-hinh>/`; tách thành phần dùng lại vào `src/components/`.
4. Gọi API qua `src/api/` (không gọi fetch trực tiếp trong trang).
5. Kiểm tra: `npm run typecheck`; dùng MCP Playwright mở trang ở 1440×900 và 1366×768, chụp màn hình,
   so với ảnh trong `docs/hinh-giao-dien/`, liệt kê chỗ còn lệch rồi sửa.

## Quy tắc bắt buộc
- Theo quy ước trong `frontend/CLAUDE.md`; quy ước đó ưu tiên hơn skill `frontend-design`.
- Không thêm màu mới ngoài token có sẵn; không chuyển màu, phát sáng, biểu tượng cảm xúc.
- Dữ liệu mẫu tiếng Việt, hợp lý (tên học sinh, lớp 8A2, trường THCS Nguyễn Du…), không "Lorem ipsum".
- Mỗi nút có nhãn động từ rõ việc ("Giao bài", "Lưu nháp"), không "Submit", "OK".
- Đủ trạng thái đang tải, rỗng, lỗi; dùng được bằng bàn phím, có viền nhấn khi chọn.
