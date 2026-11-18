# Frontend – React

## Công nghệ
Vite + React + TypeScript, Tailwind CSS, shadcn/ui (mã thành phần chép vào `src/components/ui/`), Lucide, React Router,
Three.js cho khung bài học 3D. Quản lý gói bằng npm.

## Cấu trúc
- `src/pages/` – mỗi màn hình một thư mục, tên theo màn hình trong chương 3
- `src/components/` – thành phần dùng chung; `src/components/ui/` – shadcn/ui
- `src/api/` – hàm gọi API; một chỗ duy nhất gắn access token và tự làm mới khi gặp 401 `TOKEN_EXPIRED`
- `src/lib/` – tiện ích; `src/styles/` – token màu, phông

## Giao diện – QUY ƯỚC CỦA DỰ ÁN (ưu tiên hơn mọi skill thiết kế)
Theo mục 3.2.1 chương 3. Mẫu chuẩn: `docs/giao-dien-chuong-3.html` (lấy token màu, khoảng cách từ đây), ảnh `docs/hinh-giao-dien/`.
- Nền và khung xám trung tính; một màu nhấn xanh lục `#0e7a55` cho nút chính, mục đang chọn, con số quan trọng.
- Đỏ, vàng, xanh lá chỉ dùng báo lỗi, cảnh báo, thành công. Không chuyển màu, không phát sáng, không biểu tượng cảm xúc.
- Nền lưới ô li chỉ dùng cho khung 3D và đồ thị.
- Phông Be Vietnam Pro (file trong `docs/vendor/fonts/`, không tải từ máy chủ ngoài); độ đậm 400 và 500; viết hoa đầu câu.
- Khoảng cách bội số 4 px. Nút cao 40 px (Tiểu học 48 px), chữ 15–16 px (Tiểu học 18 px).
- Mỗi màn hình có trạng thái đang tải, rỗng, lỗi. Tương phản chữ ≥ 4,5:1, dùng được bằng bàn phím.
- Câu chữ tiếng Việt, ngắn, không dấu chấm than; lỗi nói rõ cần làm gì.

## Bảo mật
- Access token chỉ giữ trong bộ nhớ (biến trong ứng dụng), không localStorage/sessionStorage.
- Refresh token nằm trong cookie httpOnly do máy chủ đặt; frontend không đọc, không ghi.
- Không tính điểm ở máy học sinh; công thức chỉ để vẽ hiện tượng và đồ thị.

## Lệnh
- Chạy dev: `npm run dev` (trong `frontend/`)
- Kiểm tra kiểu: `npm run typecheck`; build: `npm run build`
- Kiểm tra giao diện: dùng MCP Playwright mở trang, chụp màn hình, so với ảnh trong `docs/hinh-giao-dien/`.
