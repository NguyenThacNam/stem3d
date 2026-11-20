# Tiến độ dự án Stem3D

Cập nhật: 20/11/2026 · Nhánh `dev` · Kế hoạch gốc: `docs/Ke_hoach_trien_khai_chuc_nang.xlsx` (45 việc, 7 giai đoạn)

Tệp này là nơi đầu tiên cần đọc khi bắt đầu một phiên làm việc. Xong mỗi phần, cập nhật tệp này trong cùng commit.

Bảng phân công dạng Excel `ke-hoach/Phan_cong_cong_viec.xlsx` được SINH từ tệp này (mục 2, 9, 10) bằng
`python ke-hoach/tao_phan_cong.py` – không sửa tay file Excel. Mục 11 là nguồn của sheet "Nền tảng đã bàn giao".

## 1. Tóm tắt

**Trưởng nhóm đã xong toàn bộ phần nền tảng** (NT01–NT06, NT09) và bàn giao cho hai dev (mục 11). Hệ thống rỗng
đã chạy được: Docker 3 dịch vụ, CSDL 15 bảng, đăng nhập / khóa tạm / đổi mật khẩu / đặt lại mật khẩu, phân quyền
theo vai trò, khung ghi nhật ký, khung giao diện React với màn đăng nhập và thanh bên theo vai trò, khung hiển thị
mô hình 3D (Three.js). **Giai đoạn 0 đã xong** (NT08 do trưởng nhóm làm thay Dev Bài học). Giai đoạn 1 đã bắt đầu:
ND01 (Dev Quản lý) xong – nạp mô hình GLB có kiểm tra tự động, danh sách, xem chi tiết 3D, xóa (API 45–48 và
màn Thư viện mô hình 3D). ND02 đang làm – đã có API soạn bài 49–55, API môn học 7, màn danh sách bài và màn soạn bài
(thẻ Thông tin bài, Mô hình); còn cấu hình `config` chờ thống nhất với Dev Bài học. Chưa có chức năng học tập hay quản lý trường.

| Giai đoạn | Tên | Tổng việc | Xong | Đang làm | Chưa làm | Bỏ |
|---|---|---|---|---|---|---|
| 0 | Nền tảng kỹ thuật | 9 | 8 | 0 | 0 | 1 |
| 1 | Xem bài học 3D | 7 | 1 | 1 | 5 | 0 |
| 2 | Thí nghiệm, kiểm tra, phim | 7 | 0 | 0 | 7 | 0 |
| 3 | Trường, tài khoản, lớp | 10 | 0 | 1 | 9 | 0 |
| 4 | Dạy học theo lớp | 7 | 0 | 0 | 7 | 0 |
| 5 | Hoàn thiện, thử nghiệm thật | 4 | 0 | 0 | 4 | 0 |
| 6 | Mở rộng (khi cần) | 1 | 0 | 0 | 1 | 0 |
| | **Tổng** | **45** | **9** | **2** | **33** | **1** |

API (chương 3, mục 3.1.3): **18 / 73 API REST xong**, WebSocket 0 / 1. Ngoài danh sách có thêm `GET /api/health`.

Test: backend 436 (pytest, CSDL PostgreSQL thật), frontend 39 (Vitest cho `src/api/client.ts` và phần tính toán 3D).

## 2. Bảng chức năng (45 việc theo kế hoạch)

"Người phụ trách" theo phân công trong kế hoạch. Phần đã làm đến nay do Trưởng nhóm thực hiện (kể cả việc
của Dev Bài học, Dev Quản lý ghi chú bên dưới).

| Mã | Chức năng | Người phụ trách | GĐ | Trạng thái | Commit | Ghi chú |
|---|---|---|---|---|---|---|
| NT01 | Khởi tạo dự án, Docker (web, api, db) | Trưởng nhóm | 0 | Xong | dbf6502, 305b484 | web build frontend bằng Vite từ phần 4 |
| NT02 | Tạo CSDL 15 bảng, dữ liệu mẫu | Trưởng nhóm | 0 | Xong | ddb8eb0 | Migration đầu tiên, script seed |
| NT03 | Đăng nhập, khóa tạm khi sai 5 lần | Trưởng nhóm | 0 | Xong | d7f3456, 6eb8958, 305b484 | API + màn đăng nhập |
| NT04 | Đổi mật khẩu | Trưởng nhóm | 0 | Xong | d7f3456, 305b484 | API + màn đổi mật khẩu bắt buộc |
| NT05 | Phân quyền theo vai trò và theo trường | Trưởng nhóm | 0 | Xong | d7f3456 | `require_role`, `get_current_user`; phạm vi trường kiểm tra trong service từng API |
| NT06 | Ghi nhật ký thao tác | Trưởng nhóm | 0 | Xong | d7f3456, d6c8030 | Khung `app/services/nhat_ky.py` (mã cố định, chặn thông tin nhạy cảm) + `kiem_tra_nhat_ky` cho test. Mỗi API tự ghi nhật ký: điều kiện hoàn thành của API đó (`backend/CLAUDE.md` mục Nhật ký) |
| NT09 | Chốt quy ước API | Trưởng nhóm | 0 | Xong | dbf6502, d7f3456 | Khuôn dạng lỗi, mã lỗi chung, phân trang: `backend/CLAUDE.md` |
| NT08 | Khung giao diện React và thử hiển thị mô hình 3D | Dev Bài học | 0 | Xong | 305b484, nhánh feature/NT08-thu-hien-thi-mo-hinh-3d | Người làm: Trưởng nhóm (làm thay Dev Bài học). Bố cục, menu, gọi API; thành phần `MoHinh3D` (Three.js) và trang thử `/thu-mo-hinh-3d` (chỉ bản dev) |
| QL00 | Màn hình quản trị bằng dữ liệu giả; Excel mẫu | Dev Quản lý | 0 | Bỏ | | Đã có API thật, làm thẳng màn hình với API; Excel mẫu nằm trong QL04 (API 26) |
| BH01 | Khung bài học 3D | Dev Bài học | 1 | Chưa làm | | Việc khó nhất |
| ND01 | Nạp mô hình 3D, xóa mô hình | Dev Quản lý | 1 | Xong | 387462e, bda040e (PR #5), ce33d83 | Phần nền (PR #5): volume `content`, Nginx phục vụ `/content/models/`, bộ đọc GLB. API 45–48 + màn Thư viện mô hình 3D (bảng, nạp có xem trước 3D, chi tiết, xóa) |
| ND02 | Tạo, sửa, xóa, xuất bản bài học | Dev Quản lý | 1 | Đang làm | b8b03a4, (commit sửa ND02) | Xong: API 7, 49–55; màn Bài học (danh sách, tạo, gỡ, xóa) và màn soạn bài Hình 3-11 (thẻ Thông tin bài, Mô hình; xuất bản / gỡ). Chưa: soạn `lessons.config` (camera, kịch bản phim, thông số thí nghiệm – thẻ Thí nghiệm) và nút Xem trước – chờ thống nhất cấu trúc config (mục 10) |
| ND03 | Gắn nhãn, chú thích bộ phận | Dev Bài học | 1 | Chưa làm | | |
| HT01 | Tra cứu bài học | Dev Bài học | 1 | Chưa làm | | |
| HT02 | Tự khám phá mô hình | Dev Bài học | 1 | Chưa làm | | |
| BT01 | Bài 1: Cá chép (KHTN 6) | Dev Bài học | 1 | Chưa làm | | |
| NT07 | Bộ tính công thức chấm thí nghiệm | Dev Quản lý | 2 | Chưa làm | | |
| HT04 | Làm thí nghiệm | Dev Bài học | 2 | Chưa làm | | |
| ND04 | Soạn câu hỏi kiểm tra | Dev Quản lý | 2 | Chưa làm | | |
| HT05 | Làm bài kiểm tra nhanh | Dev Bài học | 2 | Chưa làm | | |
| BT02 | Bài 2: Chuẩn độ axit – bazơ (Hóa 11) | Dev Bài học | 2 | Chưa làm | | |
| BT03 | Bài 3: Cấu tạo tim người (KHTN 8) | Dev Bài học | 2 | Chưa làm | | |
| HT03 | Xem phim mở đầu | Dev Bài học | 2 | Chưa làm | | Nên có |
| QL01 | Quản lý trường (kèm quản trị trường) | Dev Quản lý | 3 | Chưa làm | | |
| QL03 | Quản lý học sinh | Dev Quản lý | 3 | Chưa làm | | |
| QL04 | Nhập học sinh từ Excel | Dev Quản lý | 3 | Chưa làm | | |
| QL05 | Quản lý giáo viên | Dev Quản lý | 3 | Chưa làm | | |
| QL07 | Quản lý lớp và phân công giảng dạy | Dev Quản lý | 3 | Chưa làm | | |
| QL08 | Đặt lại mật khẩu | Dev Quản lý | 3 | Đang làm | d7f3456, 6eb8958 | API xong (làm cùng phần xác thực); chưa có nút trên giao diện |
| VH03 | Sao lưu dữ liệu hằng ngày (mã hóa) | Dev Quản lý | 3 | Chưa làm | | Phải có trước khi có dữ liệu học sinh thật |
| QL06 | Nhập giáo viên từ Excel | Dev Quản lý | 3 | Chưa làm | | Nên có |
| QL02 | Quản lý tài khoản biên tập viên | Dev Quản lý | 3 | Chưa làm | | Nên có |
| BH02 | Tối ưu 3D cho máy yếu, máy tính bảng | Dev Bài học | 3 | Chưa làm | | |
| LH01 | Quản lý lớp học (giáo viên) | Dev Quản lý | 4 | Chưa làm | | |
| LH02 | Giao bài cho lớp | Dev Quản lý | 4 | Chưa làm | | |
| LH03 | Nộp và chấm bài | Dev Quản lý | 4 | Chưa làm | | |
| HT06 | Xem kết quả cá nhân | Dev Quản lý | 4 | Chưa làm | | |
| LH04 | Xem, xuất kết quả cả lớp | Dev Quản lý | 4 | Chưa làm | | |
| LH05 | Điều khiển màn hình lớp học | Dev Bài học | 4 | Chưa làm | | Nên có; WebSocket phía máy chủ do Dev Quản lý |
| QL09 | Báo cáo sử dụng của trường | Dev Quản lý | 4 | Chưa làm | | Nên có |
| VH04 | Thử trên thiết bị thật | Dev Bài học | 5 | Chưa làm | | |
| VH06 | Kiểm thử tải, triển khai máy chủ trung tâm | Dev Quản lý | 5 | Chưa làm | | Kèm HTTPS (Let's Encrypt) |
| VH02 | Đưa file mô hình qua CDN | Dev Quản lý | 5 | Chưa làm | | Nên có |
| VH01 | Giao diện xem nhật ký hệ thống | Dev Quản lý | 5 | Chưa làm | | Nên có |
| VH05 | Chạy nhiều bản api, dùng Redis | Dev Quản lý | 6 | Chưa làm | | Chỉ khi số trường tăng |

## 3. Bảng API (73 API REST + 1 WebSocket, chương 3 mục 3.1.3)

Cột "Việc" là mã việc trong kế hoạch mà API phục vụ.

| # | PT | Đường dẫn | Việc | Trạng thái | Commit |
|---|---|---|---|---|---|
| 1 | POST | /api/auth/login | NT03 | Xong | d7f3456 |
| 2 | POST | /api/auth/refresh | NT03 | Xong | d7f3456 |
| 3 | POST | /api/auth/logout | NT03 | Xong | d7f3456 |
| 4 | GET | /api/auth/me | NT03 | Xong | d7f3456 |
| 5 | POST | /api/auth/change-password | NT04 | Xong | d7f3456, 6eb8958 |
| 6 | POST | /api/users/{id}/reset-password | QL08 | Xong | d7f3456, 6eb8958 |
| 7 | GET | /api/subjects | ND02 | Xong | b8b03a4 – viết cùng ND02 cho ô chọn môn (mục 10, "API học tập") |
| 8 | GET | /api/lessons | HT01 | Chưa làm | |
| 9 | GET | /api/lessons/{id} | HT02 | Chưa làm | |
| 10 | POST | /api/attempts | LH03 | Chưa làm | |
| 11 | GET | /api/me/assignments | LH02 | Chưa làm | |
| 12 | GET | /api/me/attempts | HT06 | Chưa làm | |
| 13 | GET | /api/me/attempts/{id} | HT06 | Chưa làm | |
| 14 | GET | /api/me/classes | LH01 | Chưa làm | |
| 15 | GET | /api/classes/{id}/students | LH01 | Chưa làm | |
| 16 | GET | /api/classes/{id}/assignments | LH02 | Chưa làm | |
| 17 | POST | /api/assignments | LH02 | Chưa làm | |
| 18 | DELETE | /api/assignments/{id} | LH02 | Chưa làm | |
| 19 | GET | /api/assignments/{id}/results | LH04 | Chưa làm | |
| 20 | GET | /api/assignments/{id}/results.xlsx | LH04 | Chưa làm | |
| 21 | WS | /ws/class/{class_id} | LH05 | Chưa làm | Nginx đã chuyển /ws/ sang api |
| 22–25 | | /api/students (GET, POST, PUT, DELETE) | QL03 | Chưa làm | |
| 26–28 | | /api/students/import/template, preview, confirm | QL04 | Chưa làm | |
| 29–32 | | /api/teachers (GET, POST, PUT, DELETE) | QL05 | Chưa làm | |
| 33–35 | | /api/teachers/import/template, preview, confirm | QL06 | Chưa làm | |
| 36–39 | | /api/classes (GET, POST, PUT, DELETE) | QL07 | Chưa làm | |
| 40–42 | | /api/classes/{id}/teachers (GET, POST, DELETE) | QL07 | Chưa làm | |
| 43–44 | GET | /api/reports/usage, usage.xlsx | QL09 | Chưa làm | |
| 45–48 | | /api/assets (GET, POST, GET {id}, DELETE) | ND01 | Xong | ce33d83 |
| 49–55 | | /api/editor/lessons (CRUD, publish, unpublish) | ND02 | Xong | b8b03a4 |
| 56 | PUT | /api/editor/lessons/{id}/parts | ND03 | Chưa làm | |
| 57–59 | | /api/editor/lessons/{id}/questions, /api/editor/questions/{id} | ND04 | Chưa làm | |
| 60–65 | | /api/schools (CRUD, lock, unlock, xóa có mã xác nhận) | QL01 | Chưa làm | Khi làm khóa trường: cân nhắc tăng `token_version` (xem mục 6) |
| 66–69 | | /api/schools/{id}/admins | QL01 | Chưa làm | |
| 70–73 | | /api/editors | QL02 | Chưa làm | |
| 74 | GET | /api/logs | VH01 | Chưa làm | |

(Bảng 3-2…3-7 đánh số 1–74 gồm cả WebSocket ở dòng 21, tức 73 API REST + 1 WebSocket.)

## 4. Đã làm theo từng phần

| Phần | Nội dung | Commit |
|---|---|---|
| 0 | Khởi tạo: nội quy, tài liệu thiết kế, skill, subagent, hook, MCP | af852c5 |
| 1 | docker-compose 3 dịch vụ (Nginx, FastAPI, PostgreSQL 16), khung backend, `GET /api/health`, khuôn dạng lỗi chung (404/405/422/500/413), header Nginx | dbf6502 |
| 2 | 15 model SQLAlchemy + migration đầu tiên (khớp phụ lục: 26 khóa ngoại, 16 CHECK, chỉ mục chủ nhiệm), CSDL test riêng (mỗi test một giao dịch rồi hoàn tác), test ràng buộc, script seed | ddb8eb0 |
| 3 | 6 API nhóm 1 (đăng nhập, refresh, đăng xuất, me, đổi mật khẩu, đặt lại mật khẩu), JWT + cookie refresh, khóa tạm, `require_role`, nhật ký, năm học hiện tại | d7f3456 |
| 3 (sửa) | Kiểm tra lại phạm vi sau khi khóa dòng khi đặt lại mật khẩu, ghi IP khi đổi mật khẩu | 6eb8958 |
| NT06 | Khung nhật ký: `nhat_ky.ghi()` với danh sách mã cố định (45 mã, nhãn tiếng Việt cho VH01), tự ghi `actor` / `target_name`, chặn khóa nhạy cảm kể cả lồng nhau, IP chỉ cho đăng nhập / mật khẩu, quy tắc nhập Excel; `kiem_tra_nhat_ky` cho test; quy ước trong `backend/CLAUDE.md`, mục kiểm tra trong `review-code` | d6c8030 |
| 4 | Frontend Vite + React 19 + Tailwind 4 + shadcn/ui: client API (token trong bộ nhớ, tự làm mới), màn đăng nhập (Hình 3-3), đổi mật khẩu bắt buộc, bố cục thanh bên theo vai trò (Hình 3-1), trang tạm; Nginx phục vụ bản build, header bảo mật, gzip | 305b484 |
| ND01 (phần nền) | Dev Quản lý: volume `content` (api ghi, Nginx chỉ đọc), Nginx phục vụ `/content/models/` (lưu đệm lâu dài), `CONTENT_DIR` / `models_dir` / `content_tmp_dir` trong cấu hình, bộ đọc GLB `doc_glb()` (28 test), `python-multipart` cho tải file lên | 387462e, bda040e (PR #5) |
| NT08 | Three.js 0.187.0; thành phần `MoHinh3D` (nạp GLB, kéo xoay / phóng to, tự canh camera, nền ô li, 3 trạng thái, giải phóng bộ nhớ đồ họa); phần tính toán thuần có test; trang thử `/thu-mo-hinh-3d` chỉ ở bản dev (mô hình mẫu, mở file GLB trên máy, đo thời gian tải / khung hình); CSP thêm `connect-src blob:`. Trưởng nhóm làm thay Dev Bài học | nhánh feature/NT08-thu-hien-thi-mo-hinh-3d |

| ND01 | API 45–48 (danh sách phân trang + tìm tên, nạp có kiểm tra tự động, chi tiết, xóa – khóa dòng, 409 khi bài đang dùng); màn Thư viện mô hình 3D: bảng chỉ số tô vàng khi vượt mức khuyến nghị, hộp thoại nạp (kéo thả, % tải lên, xác nhận cảnh báo, báo cáo kiểm tra, xem trước 3D ngay trên máy), chi tiết (xem 3D, các phần, bài đang dùng), xóa; xem 3D dùng `MoHinh3D` (NT08), nạp lười | ce33d83 |
| ND02 | API 7, 49–55 (môn học; tạo, sửa, xóa, xuất bản, gỡ bài – 400 `LESSON_INCOMPLETE`, 409 `LESSON_IN_USE`, `DUPLICATE_LESSON`, `LESSON_ASSIGNED`); màn Bài học (lọc, tạo, gỡ, xóa) và màn soạn bài Hình 3-11 (thẻ Thông tin bài, Mô hình) | b8b03a4 |
| ND02 (sửa) | Xuất bản khi gặp hỏi trùng bài: bấm "Vẫn lưu" giờ xuất bản tiếp (trước chỉ lưu nháp, không báo); "Vẫn lưu" sau Lưu nháp hiện "Đã lưu lúc …"; thẻ Mô hình tự tải lại danh sách khi quay về thẻ trình duyệt và có nút tải lại; lỗi ở cả ô thông tin bài lẫn mô hình thì ở lại thẻ Thông tin bài | (commit sửa ND02) |

Mỗi phần đều được subagent `review-code` soát trước khi commit; các mục "phải sửa / nên sửa" đã xử lý.

Sau phần 4: hook trong `.claude/settings.json` gọi script bằng `$CLAUDE_PROJECT_DIR` thay cho đường dẫn tương đối
(trước đó đứng ở thư mục con như `frontend/` thì hook không tìm thấy script và chặn mọi lần sửa). Đã thử: sửa file
frontend được phép khi đứng ở thư mục gốc và ở `frontend/`; ghi / sửa trong `docs/` bị chặn ở cả hai nơi.

Quy trình Git (mục "Quy trình Git" trong `CLAUDE.md`): nhánh `main` / `dev` / `feature/<mã-việc>-...`, mọi thay đổi vào
`dev` qua Pull Request. Hook `chan_git_nhanh_chinh.py` chặn Claude commit / merge / rebase / cherry-pick trên `main`,
`dev` và push vào `main`, `dev` (89 test). Commit thiết lập này là commit cuối cùng nằm thẳng trên `main`.

## 5. Quyết định phát sinh khi code

Bổ sung cho `docs/quyet-dinh.md` (những điểm đặc tả không nói hoặc phải chọn khi làm). Đã chốt với người dùng.

**CSDL và thời gian**
- Quản trị trường CÓ `users.school_id`; chỉ biên tập viên, quản trị hệ thống để NULL (dòng 40 phụ lục viết nhầm, đã sửa). Không thêm CHECK vai trò ↔ trường, service kiểm tra.
- Giữ kiểu `TIMESTAMP` như phụ lục nhưng phiên kết nối ép `timezone=UTC`; trả API kèm múi giờ (`UtcDatetime`), nhận API bắt buộc có múi giờ (`UtcInputDatetime`).
- Năm học hiện tại: từ 1/8 năm N đến 31/7 năm N+1, ranh giới tính theo giờ Việt Nam (`current_school_year`).
- Seed: trường `nguyendu` (THCS), 5 môn (Khoa học 4–5, KHTN 6–9, Vật lí / Hóa học / Sinh học 10–12), tên đăng nhập viết thường, mã HS/GV viết hoa; tài khoản mẫu không bắt đổi mật khẩu.

**API và bảo mật**
- Mã lỗi chung: `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`, `FILE_TOO_LARGE`, `NOT_AUTHENTICATED`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `FORBIDDEN`, `PASSWORD_CHANGE_REQUIRED`, `USER_NOT_FOUND`; 400 `INVALID_CURRENT_PASSWORD`.
- Nginx giới hạn 151 MB (gói multipart dư vài KB); API tải mô hình tự chặn chính xác > 150 MB.
- Lần sai thứ 5 trả 423 ngay; khi khóa đưa bộ đếm về 0. Sai mật khẩu hiện tại khi đổi mật khẩu tính chung bộ đếm với đăng nhập.
- Đổi mật khẩu nhận `{current_password, new_password, confirm_password}`, từ chối trùng mật khẩu cũ, cấp token mới cho máy hiện tại.
- Đặt lại mật khẩu trả `{user_id, username, new_password}`; khác trường → 404, cùng trường ngoài phạm vi → 403; giáo viên chủ nhiệm chỉ với lớp chủ nhiệm trong **năm học hiện tại**.
- Mỗi yêu cầu đọc lại tài khoản trong CSDL: khóa tài khoản / trường có hiệu lực ngay.
- Mật khẩu tối đa 72 byte UTF-8 (giới hạn bcrypt); `BCRYPT_ROUNDS` mặc định 12, bản thật không thấp hơn 12.
- Nhật ký (NT06): mọi service ghi qua `nhat_ky.ghi()`, mã chỉ lấy trong `HANH_DONG`; tên đăng nhập không tồn tại chỉ lưu 3 ký tự đầu.
  - NT06 chuyển Xong khi có khung; ghi nhật ký là điều kiện hoàn thành của từng API (test `kiem_tra_nhat_ky`, `review-code` kiểm).
  - `detail` luôn có `actor` (tên người làm) và `target_name` (bắt buộc với `DELETE_*`) để tra được sau khi xóa tài khoản / trường.
  - IP chỉ ghi cho đăng nhập và mật khẩu, kể cả đặt lại mật khẩu (API 6 nay ghi IP). Thao tác thất bại chỉ ghi cho đăng nhập và đổi mật khẩu.
  - Xóa tài khoản ghi thêm `full_name` (UC14: giữ tên đăng nhập và họ tên); `ghi()` phải gọi trước `db.delete()`.
  - Sửa (`UPDATE_*`) chỉ ghi `changed_fields`; chặn khóa `config`, `options`, `correct`, `expected` để cấu hình bài, câu hỏi (công thức, sai số, đáp án) không lọt vào nhật ký.
  - Ghi cả `CREATE_ASSIGNMENT`, `DELETE_ASSIGNMENT` (API 17, 18) dù chương 3 không liệt kê: hủy bài giao làm các bài nộp mất liên kết, cần tra được ai hủy.
  - `IMPORT_STUDENTS` / `IMPORT_TEACHERS` chỉ ghi `created_count`, `error_count`, `file_name`; không ghi danh sách tài khoản vừa tạo (đi kèm mật khẩu ban đầu).
  - `school_id` = trường của đối tượng bị tác động; đối tượng không thuộc trường nào thì lấy trường của người làm.
- Nginx ghi đè `X-Forwarded-For` bằng IP thật (không nối thêm) để IP trong nhật ký không giả được.
- Tham số id trên đường dẫn dùng `IdPath` (1 … 2.147.483.647) để id quá lớn trả 422, không 500.
- Soạn bài học (ND02, API 49–55; đặc tả chỉ có một dòng cho mỗi API – đã chốt với người dùng):
  - Thiếu điều kiện xuất bản (mô hình; ít nhất một nhãn bộ phận; ghi công với mô hình CC BY / CC BY-SA) → 400 `LESSON_INCOMPLETE`, `details` = danh sách phần thiếu. API 51 trả sẵn `missing_for_publish`.
  - Xóa bài đã từng được giao hoặc đã có bài nộp → 409 `LESSON_IN_USE` (`details` = số bài giao, số bài nộp); gợi ý gỡ xuất bản. Xóa kéo theo nhãn bộ phận, câu hỏi (CASCADE).
  - Trùng môn + lớp + bộ sách + số bài → 409 `DUPLICATE_LESSON` (chỉ cảnh báo, CSDL không có UNIQUE); gửi lại với `confirm_duplicate=true` để lưu. Khi sửa chỉ hỏi nếu đổi một trong bốn trường đó.
  - Gỡ bài đang giao cho lớp còn hạn (chưa có hạn hoặc hạn sau hiện tại) → 409 `LESSON_ASSIGNED` kèm danh sách lớp; gửi lại với `{"confirm": true}`. Nhật ký ghi `active_assignment_count`.
  - Sửa bài đã xuất bản được (UC 20 bước 7), trừ khi làm mất điều kiện xuất bản → 400 `LESSON_INCOMPLETE` (phải gỡ xuất bản trước).
  - Gỡ xuất bản giữ `published_by` / `published_at` ("xuất bản lần gần nhất"). Xuất bản / gỡ lần hai không đổi gì, không ghi nhật ký.
  - API 52 thay cả bản ghi: phải gửi đủ trường (thiếu `config`, `asset_id`… → 422, không âm thầm xóa công thức).
  - `config` nhận nguyên JSON object (tối đa 1 MB), chưa kiểm tra cấu trúc bên trong (chờ mục 10, "Cấu hình bài học").
  - Lớp phải nằm trong khoảng lớp của môn. Không có quy tắc sở hữu: biên tập viên, quản trị hệ thống sửa được mọi bài.
  - API 7 (`/api/subjects`, mọi vai trò) viết cùng ND02 để có ô chọn môn.
- Mô hình 3D (ND01, đặc tả không nói mã lỗi API 45, 47, 48):
  - API 48: mô hình đang được bài dùng → 409 `ASSET_IN_USE`, `details` = `[{id, title, status}]` các bài đang dùng (UC 21 luồng 6.1); không có → 404 `ASSET_NOT_FOUND` (API 47 cũng vậy).
  - API 48 khóa dòng `assets` (`FOR UPDATE`) trước khi kiểm tra để bài học không gắn được mô hình giữa lúc kiểm tra và xóa; file GLB xóa SAU commit (commit hỏng thì file vẫn còn).
  - API 45 phân trang theo quy ước chung, mới nạp trước, tìm `q` theo tên (không phân biệt hoa thường, ký tự `%` `_` hiểu theo nghĩa đen); mỗi dòng có `file_url` (`/content/models/<id>.v1.glb`), `mesh_count`, `lesson_count`, `uploaded_by_name`, `warning_fields`.
  - API 47 tính lại `warnings` từ các cột đã lưu theo mức cảnh báo (bảng `assets` không lưu cảnh báo); `unnamed_meshes` chỉ có ngay sau khi nạp (API 46).
  - CSP thêm `connect-src blob:`: Three.js (GLTFLoader) đọc texture nhúng trong GLB qua `fetch(blob:...)` do chính trang tạo.

**Giao diện**
- Chữ phụ dùng `--text-2` thay `--muted` vì `--muted` (#858a87) chỉ đạt tương phản ~3,6:1, dưới mức 4,5:1 của quy ước; `--muted` chỉ dùng cho biểu tượng.
- Chữ chính 15 px, nhãn 14 px (to hơn file mẫu ~1 px) theo quy ước 15–16 px.
- Logo ghi "Phòng thí nghiệm ảo / Lý · Hóa · Sinh 3D" theo ảnh mẫu; menu biên tập viên theo Hình 3-1 (Bài học, Mô hình 3D).
- `/` tạm chuyển về `/dang-nhap` cho tới khi có trang giới thiệu.
- Không dùng thư viện form / quản lý trạng thái; Vitest cho `src/api/client.ts` và phần tính toán thuần (không cần trình duyệt).
- Màn Thư viện mô hình 3D (không có ảnh riêng): bố cục bảng theo Hình 3-12, chỉ số vượt mức khuyến nghị tô vàng (`warn-weak`) như Hình 3-11. Bấm tên mô hình mở chi tiết; menu "⋯" có Xem chi tiết, Xóa mô hình.
- Hộp thoại nạp xem trước 3D ngay từ file trên máy (đọc thẳng, chưa gửi lên) để biên tập viên thấy mô hình trước khi nạp (UC 21 bước 4). Tải lên dùng `XMLHttpRequest` trong `src/api/client.ts` để có % tiến độ; làm mới token trước khi gửi file lớn.
- Xem 3D ở màn Mô hình 3D dùng thành phần chung `MoHinh3D` (NT08) qua `src/pages/mo-hinh-3d/XemTruoc3D.tsx` (nạp lười, ErrorBoundary có nút thử lại).
- Thêm `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu` và thành phần `src/components/ui/dialog.tsx`, `dropdown-menu.tsx`.
- Menu "Bài học" giữ một mục (cả biên tập viên và quản trị hệ thống); thẻ lọc Tất cả / Đang soạn / Đã xuất bản thay hai mục "Bài đang soạn", "Bài đã xuất bản" của file mẫu. Màn soạn bài ở `/bien-tap/bai-hoc/:id` (trang con, cùng quyền với mục Bài học – `TRANG_CON` trong `App.tsx`).
- Màn soạn bài (ND02): thẻ Bộ phận (ND03), Câu hỏi (ND04), Thí nghiệm và nút Xem trước hiện câu "sẽ có ở bản cập nhật tới"; thẻ Mô hình chọn mô hình đã nạp, xem 3D, báo cáo kiểm tra tô vàng như Hình 3-11. Ô chọn dùng `<select>` của trình duyệt (`src/components/ui/native-select.tsx`).
- Phiên bản thư viện tra trên npm và ghim đúng số; cần Node ≥ 22.22 (React Router 8). Docker build dùng `node:26-alpine`, chạy `nginx:1.30.6-alpine` (bản ổn định).

**Nạp mô hình 3D (ND01, phần nền – Dev Quản lý, PR #5)**
- File GLB lưu trong volume `content` (`/data/content`): api ghi vào `tmp/` rồi đổi tên sang `models/` (nguyên tử, cùng
  volume); Nginx chỉ đọc, phục vụ `models/` tại `/content/models/`, không phục vụ `tmp/`. Cần sao lưu cùng `pgdata` (VH03).
- `/content/models/` công khai, không cần đăng nhập (đúng thiết kế, sau này đưa qua CDN – VH02); lưu đệm 1 năm
  (`immutable`) vì tên file có số phiên bản.
- Bộ đọc GLB chỉ dùng thư viện chuẩn, đọc từng phần (không nạp cả file 150 MB); file sai cấu trúc → 422 `INVALID_GLB`.
  - Số tam giác tính theo cảnh mặc định: mesh dùng ở nhiều node tính nhiều lần.
  - Tên mesh lấy như Three.js: tên node, node không tên thì tên mesh. Three.js còn đổi khoảng trắng thành `_` và bỏ ký
    tự `[]:./`, nên khi gắn nhãn (ND03, BH01) hai phía phải so tên theo cùng một cách.
- Máy dev: `npm run dev` chuyển `/content` sang Nginx cổng 8080 như `/api`.

**3D (NT08)**
- Three.js `0.187.0` (ghim cùng `@types/three`). Không dùng bộ giải nén Draco / meshopt vì đã chốt không nén mô hình (`docs/quyet-dinh.md`), nên không cần WASM.
- CSP thêm `connect-src blob:`: GLTFLoader đọc texture nhúng trong GLB bằng `fetch(blob:...)`; thiếu thì mô hình mất toàn bộ màu
  (đã thử với CSP bản thật). `blob:` chỉ trỏ tới dữ liệu do chính trang tạo, không mở đường gửi ra ngoài. Giữ ImageBitmap
  (giải nén ảnh ngoài luồng chính) thay vì ép nạp bằng thẻ `<img>`.
- Mỗi khung 3D một renderer; rời trang thì giải phóng geometry / vật liệu / texture và trả ngữ cảnh WebGL (`forceContextLoss`).
  Độ phân giải tối đa 2× (`devicePixelRatio`). Tắt kéo dịch (pan) theo Hình 3-5: chỉ xoay và phóng to.
- File trên máy đọc bằng `GLTFLoader.parse` (không tạo `blob:` cho cả file GLB).
- Trang thử `/thu-mo-hinh-3d` chỉ có khi `npm run dev` (bản build bỏ hẳn trang, Three.js và mô hình mẫu). Mô hình mẫu
  `phan-tu-nuoc.v1.glb` (5 mesh có tên) sinh bằng `node scripts/tao-mo-hinh-mau.mjs`, để trong `src/assets/` (không phải
  `public/`) để không lên bản thật.
- Dung lượng hiển thị theo đơn vị thập phân (1 MB = 1.000.000 byte) như ngưỡng 150 MB của ND01.
- **Số liệu đo tham khảo cho BH02** (20/11/2026, Chrome, máy phát triển GPU AMD Radeon tích hợp, khung 1120 × 830 px, tỉ lệ 1×):

  | Mô hình | Dung lượng | Tam giác | Mesh | Tải và dựng (file trên máy) | Khung hình/giây khi xoay |
  |---|---|---|---|---|---|
  | Phân tử nước (mẫu) | 64 KB | 2.144 | 5 | ~110 ms | 60 |
  | Tim NIH 3D (CC0, Sourav Pan) | 16,7 MB | 149.992 | 1 | lần đầu ~440 ms, các lần sau 136–169 ms | 60 |
  | Tim, giả lập CPU chậm 4× | 16,7 MB | 149.992 | 1 | 330–410 ms | 60 |

  - Thời gian trên chưa gồm tải qua mạng: 16,7 MB qua đường 20 Mbit/s mất khoảng 7 s, 50 Mbit/s khoảng 3 s.
  - 60 khung hình/giây là giới hạn màn hình; GPU máy phát triển còn dư. Chưa đo trên máy tính bảng, máy trường thật (VH04).
  - Mở rồi đóng mô hình tim 20 lần: vẫn 1 canvas, không có cảnh báo vượt số ngữ cảnh WebGL.

## 6. Giới hạn đã biết

- **Refresh token:** không có bảng `refresh_tokens`, nên token cũ vẫn dùng được tới hết hạn 8 giờ trừ khi `token_version` tăng (đổi / đặt lại mật khẩu).
- **Đăng xuất** chỉ xóa cookie trên máy hiện tại, không tăng `token_version`.
- **Access token cũ** còn hạn tối đa 15 phút sau khi đổi mật khẩu.
- **Khóa tài khoản / trường** hiện chặn refresh nhờ kiểm tra `is_active`, nhưng chưa tăng `token_version` (thêm khi làm API khóa tài khoản, khóa trường).
- **Dò được tên đăng nhập** có tồn tại qua khóa tạm (tên có thật sau 5 lần sai trả 423). Chấp nhận vì tên đăng nhập theo quy tắc mã trường + mã HS/GV vốn đoán được.
- **Tin IP chuyển tiếp:** uvicorn chạy `--forwarded-allow-ips *`, tin mọi máy trong mạng compose (hiện chỉ có `web`, `db`).
- **Soạn bài (ND02):** kiểm tra trùng bài không khóa nên hai lần tạo cùng lúc có thể cùng lọt (chỉ là cảnh báo, chấp nhận).
  Bài đã xuất bản mà xóa hết nhãn bộ phận (API 56 của ND03) thì mọi lần sửa bài đó bị 400 cho tới khi gắn lại nhãn hoặc gỡ
  xuất bản – cần thống nhất với ND03 (mục 10).
  Rời màn soạn bài qua menu thanh bên khi còn thay đổi chưa lưu thì không được hỏi lại (ứng dụng dùng `BrowserRouter`, chưa
  dùng được `useBlocker`; liên kết "Bài học" trên thanh vị trí và đóng / tải lại tab thì có hỏi).
  Hai người cùng sửa một bài: người lưu sau ghi đè người lưu trước (API 52 chưa so `updated_at`) – cần thì bàn thêm.
- **Mô hình 3D (ND01):** đóng hộp thoại chi tiết khi file GLB đang tải thì trình duyệt vẫn tải tiếp đến hết
  (`MoHinh3D` dùng `GLTFLoader.load`, chưa hủy được); file lớn trên mạng chậm sẽ tốn băng thông. Sửa trong `MoHinh3D` khi làm BH02.
- **Ảnh cá chép** ở màn đăng nhập nặng 694 KB, vẫn tải trên màn hẹp.
- **Khung 3D (NT08)** vẽ liên tục 60 lần/giây kể cả khi không xoay (tốn pin máy tính bảng); chưa điều khiển được bằng bàn
  phím; chưa tự giảm chất lượng cho máy yếu. Để BH01, BH02 làm.

## 7. Việc còn chờ

- **Giai đoạn 0 đã xong.** QL00 đã bỏ (xem mục 9). NT06 xong phần khung; mỗi API tự ghi nhật ký.
- **Cần trưởng nhóm chốt:**
  - Ai viết API học tập 7–9 phía máy chủ (mục 10, dòng "API học tập").
  - VH04 (thử trên thiết bị thật, Bắt buộc) không chờ LH05 (Nên có) như kế hoạch gốc; phần điều khiển lớp thử thêm khi LH05 xong (mục 9).
- `docker-compose.yml`: chỉ truyền cho `api` những biến nó cần (hiện `env_file: .env` truyền cả `POSTGRES_PASSWORD`).
- Lớp 1–3 chưa có môn: cân nhắc thêm môn "Tự nhiên và Xã hội" (hỏi người dùng trước).
- Trang giới thiệu (Hình 3-2) chưa làm.
- Đổi ảnh cá chép sang webp, thêm `width` / `height`.
- HTTPS: Nginx tự giữ chứng chỉ Let's Encrypt, mở cổng 443 – làm khi triển khai thật.

## 8. Bàn giao cho người mới

**Cài đặt** (chi tiết trong `CLAUDE.md` mục "Cài đặt trên máy mới")
1. Cài Git, Docker Desktop, Node.js ≥ 22.22 (khuyên dùng bản LTS mới nhất), Python 3.12+.
2. Chép `.env.example` thành `.env`, điền `POSTGRES_PASSWORD`, `JWT_SECRET`, `SEED_PASSWORD`.
3. `docker compose up -d --build`, rồi `docker compose exec api alembic upgrade head`, rồi `docker compose exec api python -m scripts.seed`.
4. Mở http://localhost:8080. Tài khoản mẫu: `admin`, `bientap`, `nguyendu.admin`, `nguyendu.gv001`, `nguyendu.hs001` – mật khẩu là `SEED_PASSWORD` trong `.env`.
5. Frontend dev: `cd frontend && npm ci && npm run dev` (cổng 5173, proxy `/api` sang 8080).

**Git – việc đầu tiên** (quy tắc đầy đủ: mục "Quy trình Git" trong `CLAUDE.md`)
1. Lấy mã nguồn: `git clone https://github.com/NguyenThacNam/stem3d.git` rồi `cd stem3d` (làm trước bước cài đặt ở trên).
2. Chuyển sang nhánh gộp code của nhóm: `git switch dev` rồi `git pull`. Không làm việc trực tiếp trên `main` hay `dev`.
3. Xem mã việc mình phụ trách ở mục 2 (cột "Người phụ trách"), tạo nhánh việc từ `dev`:
   `git switch -c feature/<mã-việc>-<mô-tả-ngắn-không-dấu>`, ví dụ `git switch -c feature/QL03-quan-ly-hoc-sinh`.
   Sửa lỗi thì dùng `fix/<mô-tả>`.
4. Làm việc, commit trên nhánh của mình. Mỗi ngày: `git pull origin dev`, tự giải quyết xung đột.
5. Trước khi gộp: chạy toàn bộ test, nhờ `review-code` soát đạt, cập nhật dòng của việc mình trong `TIEN_DO.md`.
   Sau đó kéo `dev` mới nhất về (`git pull origin dev`) và **chạy lại toàn bộ test**. Có xung đột phải sửa tay thì
   nhờ `review-code` soát lại phần đã sửa.
6. Đẩy nhánh lên: `git push -u origin feature/...`.
7. Tạo Pull Request trên GitHub: mở trang kho → **Pull requests** → **New pull request** → chọn
   **base: `dev`**, **compare: nhánh của mình** → điền tiêu đề tiếng Việt bắt đầu bằng động từ, mô tả đã làm gì,
   đã test gì → **Create pull request**. Không chọn base `main`.
8. **Tự gộp** (không cần trưởng nhóm duyệt): trên trang PR, nút Merge để kiểu **Create a merge commit** (không
   chọn Squash / Rebase), bấm **Merge pull request** → **Confirm merge**, rồi bấm **Delete branch**.
   Trang PR báo nhánh đã cũ so với `dev` ("out-of-date") thì kéo `dev` về, test lại rồi mới gộp.
   Trên máy: `git switch dev && git pull && git branch -d feature/...`.
   Gộp xong mà `dev` lỗi: mở lại PR đó, bấm **Revert** → **Create pull request** → **Merge pull request** →
   **Confirm merge**. GitHub báo không revert tự động được thì tạo nhánh `fix/...` từ `dev`, chạy
   `git revert -m 1 <mã-merge-commit>` rồi tạo PR như thường.
9. Đưa `dev` lên `main` (bản ổn định) cũng qua Pull Request, chỉ khi đã chạy thử ổn – **chỉ trưởng nhóm** làm.

**Đọc trước khi code:** `CLAUDE.md` (gốc), `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `docs/quyet-dinh.md`, mục 5–6 của tệp này.

**Kiểm tra**
- Backend: `docker compose exec api pytest` (dùng CSDL `stem3d_test` riêng, tự tạo; chỉ có trong `docker-compose.override.yml`).
- Frontend: `npm run typecheck`, `npm run build`, `npm test`.
- Hook Git: `python -m pytest .claude/hooks/tests` (Python trên máy, không cần Docker).

**Cách làm việc:** trình bày kế hoạch trước khi tạo / sửa nhiều file; làm từng phần nhỏ; chạy test, nhờ `review-code` soát rồi mới commit; commit message tiếng Việt bắt đầu bằng động từ; không sửa `docs/` (hook chặn).

**Bẫy hay gặp**
- Vitest trên Windows phải chạy từ đường dẫn ổ đĩa viết HOA (`E:\stem3d\frontend`); chữ thường (`e:\`) sẽ báo "failed to find the runner".
  `npm run dev` cũng vậy: chạy từ `e:\` thì Vite nạp hai bản React, trang báo "Invalid hook call".
- Cookie refresh chỉ có `Secure` khi `APP_ENV=prod`; truy cập bản thật bằng http (không phải localhost) sẽ không đăng nhập được – cần HTTPS.
- Muốn mở cổng CSDL cho pgAdmin: bỏ chú thích trong `docker-compose.override.yml` (cổng 5433, không dùng 5432).
- Ảnh chụp Playwright lưu trong `.playwright-mcp/` (không đưa lên Git).
- Bản chạy thật: `docker compose -f docker-compose.yml up -d --build` (bỏ qua override dành cho máy dev).

## 9. Thứ tự làm và phân công (nguồn cho file Excel)

Script `ke-hoach/tao_phan_cong.py` đọc bảng này cùng mục 2 (trạng thái, commit), mục 10 và kế hoạch gốc
trong `docs/` (người làm, cần xong trước, mức) để sinh `ke-hoach/Phan_cong_cong_viec.xlsx`.

- **Thứ tự**: số càng nhỏ càng làm trước (dùng chung cho cả nhóm; mỗi sheet dev lọc việc của mình theo số này).
  Nguyên tắc: Bắt buộc trước Nên có; theo giai đoạn; việc đang chặn người kia lên trước (ND02 trước ND03, HT01;
  NT07 trước HT04; ND04 trước HT05; LH01 trước LH05). Việc đã xong hoặc bỏ ghi `—`.
- **API**: số thứ tự API trong chương 3 (Bảng 3-2…3-7). **Màn hình**: số hình trong chương 3 mục 3.2.3, hoặc tên
  màn trong Bảng 3-15.
- **Cần xong trước (điều chỉnh)**: để trống thì dùng cột "Cần xong trước" của kế hoạch gốc. Ghi `mã, mã` để thay
  cho cả việc, hoặc `Người: mã, mã; Người: mã` để mỗi người một danh sách (việc tách đôi); `-` là không cần chờ gì.
  Script báo lỗi nếu một việc được xếp thứ tự trước việc nó cần.
- **Xuyên suốt**: `Có` với việc làm dần qua mọi việc khác (NT06); không tính khi xác định giai đoạn hiện tại.
- **Phần việc khi tách đôi**: việc hai người cùng làm, ghi `Người: phần việc; Người: phần việc`. Người chính vẫn là
  "Người làm" trong kế hoạch gốc; người còn lại cũng thấy việc này trong sheet của mình.
- Đổi thứ tự, tách việc, bỏ việc: sửa bảng này (và trạng thái ở mục 2), rồi chạy lại script. Trong ô cần dấu `|`
  thì viết `\|`.

| Mã | Thứ tự | API | Màn hình | Nhánh gợi ý | Cần xong trước (điều chỉnh) | Xuyên suốt | Phần việc khi tách đôi | Điều chỉnh so với kế hoạch |
|---|---|---|---|---|---|---|---|---|
| NT01 | — | | | | | | | |
| NT02 | — | | | | | | | |
| NT03 | — | 1–4 | Hình 3-3 | | | | | |
| NT04 | — | 5 | Đổi mật khẩu (Bảng 3-15) | | | | | |
| NT05 | — | | | | | | | |
| NT06 | — | | | | | Có | Trưởng nhóm: khung ghi nhật ký (xong); Dev Quản lý: ghi nhật ký trong mọi API mình viết; Dev Bài học: ghi nhật ký trong mọi API mình viết | Xong phần khung; ghi nhật ký là điều kiện hoàn thành của từng API (`backend/CLAUDE.md` mục Nhật ký) |
| NT09 | — | | | | | | | |
| NT08 | 1 | | Hình 3-5 | feature/NT08-thu-hien-thi-mo-hinh-3d | | | | Trưởng nhóm làm thay Dev Bài học. Xong: bố cục, menu, gọi API (305b484); thử hiển thị mô hình 3D bằng Three.js |
| QL00 | — | | | | | | | Bỏ: đã có API thật nên làm thẳng màn hình với API; file Excel mẫu nằm trong QL04 (API 26) |
| BH01 | 2 | | Hình 3-5 | feature/BH01-khung-bai-hoc-3d | | | | Việc khó nhất. Làm được ngay: chỉ cần đọc file mô hình GLB; nối API 9 sau khi có |
| ND01 | — | 45–48 | Thư viện mô hình 3D (Bảng 3-15), Hình 3-11 | feature/ND01-nap-mo-hinh-3d | | | | Xong (ce33d83). Xem 3D dùng `MoHinh3D` của NT08 |
| ND02 | 4 | 7, 49–55 | Hình 3-11 | feature/ND02-soan-bai-hoc | | | | Làm sớm vì chặn ND03, HT01 của Dev Bài học. Đã có API 7, 49–55 và màn soạn bài (Thông tin, Mô hình); còn soạn `config` |
| ND03 | 5 | 56 | Hình 3-11 (thẻ Nhãn) | feature/ND03-gan-nhan-bo-phan | Dev Quản lý: ND02; Dev Bài học: ND02, BH01 | | Dev Quản lý: API 56 lưu nhãn (cùng nhóm /api/editor của ND02); Dev Bài học: chọn mesh trên mô hình 3D, thẻ Nhãn trên Hình 3-11 | Tách đôi: phần máy chủ giao Dev Quản lý; phần máy chủ không cần chờ BH01 |
| HT01 | 6 | 7, 8 | Hình 3-4 | feature/HT01-thu-vien-bai-hoc | | | | API 7–8 phía máy chủ: xem mục 10, dòng "API học tập" |
| HT02 | 7 | 9 | Hình 3-5 | feature/HT02-tu-kham-pha-mo-hinh | | | | API 9 phía máy chủ: xem mục 10, dòng "API học tập" |
| BT01 | 8 | 46, 50–56 | Hình 3-5 | feature/BT01-bai-ca-chep | | | | Nhập nội dung qua màn soạn bài; giáo viên duyệt chú thích |
| NT07 | 9 | 10 | | feature/NT07-bo-tinh-cong-thuc | | | | Làm trước HT04 của Dev Bài học; thống nhất cách viết công thức (mục 10) |
| ND04 | 10 | 57–59 | Soạn câu hỏi (Bảng 3-15), Hình 3-11 | feature/ND04-soan-cau-hoi | | | | Làm trước HT05 của Dev Bài học |
| HT04 | 11 | 9, 10 | Hình 3-6 | feature/HT04-lam-thi-nghiem | | | | Công thức hiển thị phía trình duyệt phải khớp bộ tính NT07 (mục 10) |
| HT05 | 12 | 9, 10 | Hình 3-7 | feature/HT05-bai-kiem-tra-nhanh | | | | API 9 không trả đáp án; chấm ở máy chủ (LH03) |
| BT02 | 13 | 46, 50–56 | Hình 3-6 | feature/BT02-bai-chuan-do | | | | Giáo viên kiểm tra công thức pH |
| BT03 | 14 | 46, 50–56 | Hình 3-5 | feature/BT03-bai-tim-nguoi | | | | Kiểm tra giấy phép mô hình (ghi công CC BY) |
| QL01 | 15 | 60–69 | Hình 3-12 | feature/QL01-quan-ly-truong | | | | |
| QL03 | 16 | 22–25 | Quản lý học sinh (Bảng 3-15) | feature/QL03-quan-ly-hoc-sinh | | | | |
| QL05 | 17 | 29–32 | Quản lý giáo viên (Bảng 3-15) | feature/QL05-quan-ly-giao-vien | | | | |
| QL08 | 18 | 6 | Hình 3-12, Quản lý học sinh, Quản lý giáo viên (Bảng 3-15) | feature/QL08-nut-dat-lai-mat-khau | | | | API 6 đã xong (d7f3456, 6eb8958); chỉ còn nút "Đặt lại mật khẩu" và hộp thoại hiện mật khẩu mới. Nút của giáo viên chủ nhiệm trên Hình 3-8 làm cùng LH01; nút cho biên tập viên làm cùng QL02 |
| QL04 | 19 | 26–28 | Hình 3-10 | feature/QL04-nhap-hoc-sinh-excel | | | | Gồm cả file Excel mẫu (trước thuộc QL00) |
| QL07 | 20 | 36–42 | Lớp và phân công (Bảng 3-15) | feature/QL07-lop-va-phan-cong | | | | |
| VH03 | 21 | | | feature/VH03-sao-luu-du-lieu | | | | Phải có trước khi nhận dữ liệu học sinh thật |
| BH02 | 22 | | Hình 3-5 | feature/BH02-toi-uu-3d-may-yeu | | | | |
| LH01 | 23 | 14, 15 | Hình 3-8 | feature/LH01-lop-cua-toi | | | | Làm trước LH05 của Dev Bài học |
| LH02 | 24 | 11, 16–18 | Hình 3-8, Bài được giao (Bảng 3-15) | feature/LH02-giao-bai | | | | |
| LH03 | 25 | 10 | Hình 3-6, Hình 3-7 | feature/LH03-nop-va-cham-bai | Dev Quản lý: NT07, LH02; Dev Bài học: HT04, NT07, LH02 | | Dev Quản lý: API 10 nộp bài, chấm lại bằng NT07, chống ghi trùng client_id; Dev Bài học: nút Nộp bài trên màn thí nghiệm và bài kiểm tra, sinh client_id, gửi lại khi mất mạng | Tách đôi theo ghi chú kế hoạch gốc |
| HT06 | 26 | 12, 13 | Kết quả của tôi (Bảng 3-15) | feature/HT06-ket-qua-ca-nhan | | | | |
| LH04 | 27 | 19, 20 | Hình 3-9 | feature/LH04-ket-qua-ca-lop | | | | |
| VH04 | 28 | | | feature/VH04-thu-thiet-bi-that | BH02, LH03 | | | Kế hoạch gốc ghi cần LH05 (Nên có) xong trước; đổi thành BH02, LH03 để việc Bắt buộc không chờ việc Nên có. Phần điều khiển màn hình lớp thử thêm khi LH05 xong (chờ trưởng nhóm chốt, mục 7) |
| VH06 | 29 | | | feature/VH06-kiem-thu-tai-trien-khai | | | | Kèm HTTPS (Let's Encrypt, cổng 443) |
| HT03 | 31 | 9 | Phim mở đầu (Bảng 3-15) | feature/HT03-phim-mo-dau | | | | |
| QL06 | 32 | 33–35 | Hình 3-10 | feature/QL06-nhap-giao-vien-excel | | | | |
| QL02 | 33 | 70–73 | Quản lý biên tập viên (Bảng 3-15) | feature/QL02-quan-ly-bien-tap-vien | | | | |
| LH05 | 34 | 21 (WebSocket) | Hình 3-5 | feature/LH05-dieu-khien-man-hinh-lop | Dev Quản lý: LH01; Dev Bài học: BH01, LH01 | | Dev Bài học: phía trình duyệt, đồng bộ góc nhìn, bộ phận của giáo viên tới học sinh; Dev Quản lý: kênh WebSocket /ws/class/{class_id} phía máy chủ (mục 3.1.6) | Tách đôi theo ghi chú kế hoạch gốc |
| QL09 | 35 | 43, 44 | Báo cáo sử dụng (Bảng 3-15) | feature/QL09-bao-cao-su-dung | | | | |
| VH02 | 36 | | | feature/VH02-cdn-mo-hinh | | | | |
| VH01 | 37 | 74 | Nhật ký hệ thống (Bảng 3-15) | feature/VH01-xem-nhat-ky | | | | |
| VH05 | 38 | | | feature/VH05-nhieu-ban-api-redis | | | | Chỉ khi số trường tăng |

## 10. Phối hợp giữa hai dev

Những chỗ Dev Quản lý và Dev Bài học phải thống nhất TRƯỚC khi làm (ghi kết quả vào cột cuối khi đã chốt).

| Chủ đề | Việc liên quan | Dev Quản lý | Dev Bài học | Cần thống nhất | Đã thống nhất |
|---|---|---|---|---|---|
| Cách viết công thức chấm | NT07, HT04, BT02 | Bộ tính biểu thức an toàn phía máy chủ (Python), chấm lại khi nộp | Tính cùng công thức phía trình duyệt để vẽ hiện tượng, đồ thị | Cú pháp công thức trong lessons.config, tên biến thông số, đơn vị, cách ghi sai số; một bộ số liệu mẫu chung để test cả hai phía ra cùng kết quả | Chưa |
| Cấu hình bài học | ND02, BH01, HT02, HT03, HT04 | Lưu và sửa lessons.config (màn soạn bài) | Đọc lessons.config để dựng khung 3D, kịch bản phim, thông số thí nghiệm | Cấu trúc JSON của lessons.config (góc camera, kịch bản phim, thông số, khoảng giá trị) | Chưa |
| Gắn nhãn bộ phận | ND03, ND01, ND02 | API 56 lưu danh sách nhãn; API 47 trả danh sách mesh của mô hình (đã có: `mesh_names` là tên node có mesh trong file GLB, theo thứ tự trong file); API 51 (ND02) đã trả `parts`, `asset.mesh_names`. Đề xuất: API 56 không cho xóa hết nhãn của bài đang xuất bản (ND02 coi ≥1 nhãn là điều kiện xuất bản) | Chọn mesh trên mô hình 3D, thẻ Nhãn trên Hình 3-11 | Khuôn dạng mesh_names, camera_view; cách đặt tên mesh trong file GLB | Chưa |
| Nộp bài | LH03, HT04, HT05 | API 10: nhận bài, chấm lại, chống ghi trùng client_id | Nút Nộp bài, sinh client_id (UUID), gửi lại khi mất mạng | Cấu trúc experiment_data, answers gửi lên; cách báo kết quả chấm | Chưa |
| Điều khiển màn hình lớp | LH05, LH01 | Kênh WebSocket /ws/class/{class_id} phía máy chủ, xác thực, phòng trong bộ nhớ | Gửi, nhận sự kiện phía trình duyệt, đồng bộ góc nhìn, bộ phận | Danh sách sự kiện và khuôn dạng tin nhắn (mục 3.1.6 chương 3) | Chưa |
| API học tập | HT01, HT02, HT05 | API 7 (`/api/subjects`) đã viết cùng ND02. Đề xuất: viết API 8, 9 phía máy chủ cùng lúc với ND02 (cùng bảng lessons) | Màn thư viện, khung bài học, bài kiểm tra | Kế hoạch giao HT01, HT02 cho Dev Bài học (Three.js, React) nhưng các việc này có API máy chủ: trưởng nhóm chốt ai viết API 8–9 | Chưa – chờ trưởng nhóm (API 7 đã xong ở ND02) |
| Mô hình 3D | ND01, BH01, BH02 | Kiểm tra ngưỡng khi nạp (150 MB, 1,5 triệu tam giác, texture 4096 px) | Hiển thị, tự giảm chất lượng trên máy yếu | Mức chi tiết mục tiêu cho máy yếu, máy tính bảng; tên file có số phiên bản | Chưa |
| File dùng chung | Mọi việc | backend/app/main.py (gắn router) | frontend/src/lib/roles.ts (menu), frontend/src/App.tsx (đường dẫn) | Chỉ thêm phần của mình, không sửa phần người khác; kéo dev về mỗi ngày | Đã có trong CLAUDE.md |

## 11. Phần nền tảng đã bàn giao

Trưởng nhóm đã làm xong phần nền tảng; bảng dưới cho hai dev biết đã có gì, dùng thế nào, đọc ở đâu.
Script sinh sheet "Nền tảng đã bàn giao" từ bảng này (cột Mã là mã việc trong kế hoạch, hoặc `—` với phần ngoài kế hoạch).

| Mã | Đã có | Dev dùng thế nào | Xem ở đâu | Commit |
|---|---|---|---|---|
| NT01 | Docker 3 dịch vụ: `web` (Nginx phục vụ bản build React, header bảo mật, gzip), `api` (FastAPI), `db` (PostgreSQL 16); `docker-compose.override.yml` cho máy dev | `docker compose up -d --build`; frontend dev: `cd frontend && npm run dev` (cổng 5173, proxy `/api` sang 8080) | `CLAUDE.md` mục Lệnh; mục 8 tệp này | dbf6502, 305b484 |
| NT02 | 15 bảng khớp phụ lục CSDL (khóa ngoại, CHECK, chỉ mục chủ nhiệm), Alembic, CSDL test riêng (mỗi test một giao dịch rồi hoàn tác), dữ liệu mẫu | Đổi bảng: tạo migration MỚI (skill `tao-migration`), kéo `dev` trước khi tạo; dữ liệu test: `tao_truong`, `tao_tai_khoan`, `tao_lop`… trong `backend/tests/du_lieu.py`; dữ liệu mẫu: `python -m scripts.seed` | `backend/CLAUDE.md` mục Migration, Test | ddb8eb0 |
| NT03 | API 1–4 (đăng nhập, làm mới phiên, đăng xuất, thông tin tài khoản), JWT + cookie refresh, khóa tạm khi sai 5 lần; màn đăng nhập (Hình 3-3) | Frontend gọi API qua `frontend/src/api/client.ts` (token trong bộ nhớ, tự làm mới khi hết hạn); test API: `bearer(user, now)`, `dang_nhap(client, ...)` | `frontend/CLAUDE.md`; `backend/tests/du_lieu.py` | d7f3456, 6eb8958, 305b484 |
| NT04 | API 5 (đổi mật khẩu), API 6 (đặt lại mật khẩu theo phạm vi); màn đổi mật khẩu bắt buộc | Tạo tài khoản (học sinh, giáo viên, quản trị trường, biên tập viên): `generate_password()`, `hash_password()` trong `app/core/security.py`; trả mật khẩu một lần, đặt `Cache-Control: no-store` | `backend/app/services/users.py` (mẫu kiểm tra phạm vi) | d7f3456, 6eb8958, 305b484 |
| NT05 | `require_role`, `get_current_user` (đọc lại tài khoản mỗi yêu cầu, chặn tài khoản phải đổi mật khẩu); thanh bên, menu theo vai trò | Router: `Depends(require_role(...))`; service: `school_id` lấy từ `CurrentUser`, bản ghi trường khác trả 404; thêm menu: `frontend/src/lib/roles.ts`, thêm trang: `frontend/src/App.tsx` (chỉ thêm phần của mình) | `backend/CLAUDE.md` mục Quy ước; `app/core/deps.py` | d7f3456, 305b484 |
| NT06 | Khung nhật ký `nhat_ky.ghi()`: 45 mã cố định có nhãn tiếng Việt, tự ghi tên người làm / đối tượng, chặn thông tin nhạy cảm; `kiem_tra_nhat_ky` cho test | Mỗi API thay đổi dữ liệu gọi `ghi()` trước `db.commit()` (xóa: trước `db.delete()`); test có `kiem_tra_nhat_ky` – điều kiện hoàn thành của API | `backend/CLAUDE.md` mục Nhật ký | d7f3456, d6c8030 |
| NT09 | Khuôn dạng lỗi chung (`AppError`), mã lỗi chung, phân trang, `IdPath`, `UtcDatetime` / `UtcInputDatetime`, `get_now`, `current_school_year` | Ném `AppError(status, code, message)`; id trên đường dẫn dùng `IdPath`; giờ lấy qua `get_now`; danh sách trả `{items, total, page, page_size}` | `backend/CLAUDE.md` mục Quy ước; `app/schemas/common.py` | dbf6502, d7f3456 |
| NT08 | Khung giao diện: bố cục thanh bên, menu theo vai trò, client API, trang tạm, quy ước giao diện. Khung 3D: thành phần `MoHinh3D` (nạp GLB, xoay, phóng to, 3 trạng thái, giải phóng bộ nhớ), trang thử `/thu-mo-hinh-3d` (chỉ bản dev) | BH01 dựng khung bài học trên `MoHinh3D` (`src/components/mo-hinh-3d/`); xem tên mesh của file GLB bằng trang thử (nút "Mở file GLB trên máy"); số liệu đo cho BH02 ở mục 5 | `frontend/CLAUDE.md` mục 3D | 305b484, nhánh feature/NT08-thu-hien-thi-mo-hinh-3d |
| — | Quy trình làm việc: nhánh `main` / `dev` / `feature/...`, hook chặn commit / push vào `main`, `dev`, subagent `review-code`, `tra-cuu-dac-ta`, skill viết API / màn hình / migration, file Excel phân công sinh từ tệp này | Làm theo mục 8 (Git – việc đầu tiên); xong việc: cập nhật mục 2, chạy `python ke-hoach/tao_phan_cong.py`, commit cả hai | `CLAUDE.md` mục Quy trình Git, Tiến độ | 6c4a137, 6a187b9, 6d9648f |
