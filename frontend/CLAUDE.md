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

- Màu chữ phụ dùng `text-text-2`. `--muted` (#858a87) chỉ đạt tương phản ~3,6:1 trên nền trắng nên CHỈ dùng cho
  biểu tượng, đường kẻ – không dùng cho chữ (lệch so với file mẫu, đã chốt với người dùng).
- Cỡ chữ: chữ chính 15 px, nhãn ô nhập / chữ phụ 14 px; 13 px chỉ cho chú thích nhỏ (nhãn nhóm menu, dòng chân trang).
- Token màu trong `src/styles/index.css` (`@theme`); bảng màu mặc định của Tailwind đã bị xóa nên chỉ dùng được
  màu có tên ở đó (`bg-surface`, `text-text-2`, `bg-accent`…). Không thêm màu mới.
- Menu thanh bên, trang chủ theo vai trò: `src/lib/roles.ts` (theo Hình 3-1).

## Phiên đăng nhập
- `src/api/client.ts` là chỗ duy nhất gọi `fetch`; trang gọi API qua hàm trong `src/api/*.ts`.
- `src/auth/AuthProvider.tsx` giữ thông tin tài khoản; tải lại trang thì gọi refresh + `/me` để khôi phục phiên.
- Lỗi API là `ApiError {status, code, message, details}`; hiển thị `message` của máy chủ (đã là tiếng Việt).
- Hết phiên (401, refresh thất bại) hoặc 403 `ACCOUNT_DISABLED` / `SCHOOL_DISABLED` → xóa phiên, về màn đăng nhập
  (kèm lý do với 403). Đăng xuất gọi `endSession()` trước để refresh đang chạy không làm phiên sống lại.
- Thông báo lỗi: bọc trong MỘT vùng `aria-live`; thành phần `Alert` không đặt `role="alert"` (tránh đọc 2 lần).

## 3D (Three.js)
- Lõi 3D dùng chung: `src/components/mo-hinh-3d/canh-bai-hoc.ts` (`CanhBaiHoc`: tải GLB, xoay / phóng to, chọn bộ
  phận, tách ra / lắp lại, camera bay, điểm neo thẻ chú thích, khóa thao tác). Mọi màn có 3D dựng trên lớp này, không
  tự tạo renderer riêng. Khung bài học: `src/pages/khung-bai-hoc/KhungBaiHoc.tsx` (nhận `LessonDetail` – API 9).
- Tọa độ: mô hình luôn đưa tâm khối bao về gốc, không co giãn (`duaTamVeGoc`); `camera_view` lưu theo hệ này. So tên
  mesh qua `chuanHoaTenMesh`, không so chuỗi trực tiếp.
- Phần tính toán thuần (canh camera, đếm tam giác, giải phóng bộ nhớ, đếm khung hình, xếp thẻ chú thích) ở
  `tinh-toan.ts`, `khung-bai-hoc/bo-cuc.ts`, có test Vitest. Thêm tính năng 3D: tách phần tính được ra đây.
- Vị trí đổi theo camera mỗi khung hình (thẻ chú thích…) cập nhật thẳng vào DOM qua ref, không qua state React.
- Rời trang / đổi mô hình phải giải phóng (`giaiPhong`, `renderer.dispose()`, `forceContextLoss()`); trình duyệt chỉ
  giữ khoảng 16 ngữ cảnh WebGL.
- Không nén mô hình (Draco / meshopt); file GLB tên có số phiên bản (`ten.v3.glb`) theo `docs/quyet-dinh.md`.
- Trang nào dùng Three.js thì nạp lười (`lazy`) để màn đăng nhập, thư viện không phải tải Three.js.
- CSP cho `connect-src blob:` vì GLTFLoader đọc texture nhúng bằng `fetch(blob:...)`; không nới thêm.
- Trang thử `/thu-mo-hinh-3d` (chỉ `npm run dev`): mở file GLB trên máy để xem tên mesh, đo thời gian tải, khung hình.
  Trang thử `/thu-khung-bai-hoc` (chỉ `npm run dev`): khung bài học với dữ liệu mẫu (kính hiển vi, phân tử nước).
  Mô hình mẫu sinh bằng `node scripts/tao-mo-hinh-mau.mjs`.

## Nginx (bản build)
- Header bảo mật trong `nginx/security-headers.conf`, include ở mọi `location`. CSP `script-src 'self'`:
  không dùng script inline, không tải script/phông/ảnh từ máy chủ ngoài.

## Lệnh
- Cần Node ≥ 22.22 (React Router 8); phiên bản thư viện ghim đúng số trong `package.json`.
- Chạy dev: `npm run dev` (trong `frontend/`, cổng 5173, proxy `/api` sang Nginx cổng 8080 – cần `docker compose up`)
- Kiểm tra kiểu: `npm run typecheck`; build: `npm run build`; định dạng: `npm run format`
- Test: `npm test` (Vitest). Trên Windows phải chạy từ đường dẫn ổ đĩa viết HOA (`E:\stem3d\frontend`); mở terminal
  ở `e:\...` (chữ thường) thì Vitest nạp trùng module và báo "failed to find the runner". `npm run dev` cũng vậy:
  chạy từ `e:\` thì Vite nạp hai bản React, trang báo "Invalid hook call".
- Kiểm tra giao diện: dùng MCP Playwright mở trang, chụp màn hình, so với ảnh trong `docs/hinh-giao-dien/`
  (ảnh mẫu chụp ở tỉ lệ 1,5× của 1440 × 900). Ảnh chụp lưu trong `.playwright-mcp/` (không đưa lên Git).
