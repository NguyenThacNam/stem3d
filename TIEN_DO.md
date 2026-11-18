# Tiến độ dự án Stem3D

Cập nhật: 18/11/2026 · Nhánh `main` · Kế hoạch gốc: `docs/Ke_hoach_trien_khai_chuc_nang.xlsx` (45 việc, 7 giai đoạn)

Tệp này là nơi đầu tiên cần đọc khi bắt đầu một phiên làm việc. Xong mỗi phần, cập nhật tệp này trong cùng commit.

## 1. Tóm tắt

Đang ở **giai đoạn 0 – Nền tảng kỹ thuật**. Hệ thống rỗng đã chạy được: Docker 3 dịch vụ, CSDL 15 bảng,
đăng nhập / khóa tạm / đổi mật khẩu / đặt lại mật khẩu, phân quyền theo vai trò, khung giao diện React với
màn đăng nhập và thanh bên theo vai trò. Chưa có chức năng học tập, quản lý trường hay nội dung bài học.

| Giai đoạn | Tên | Tổng việc | Xong | Đang làm | Chưa làm |
|---|---|---|---|---|---|
| 0 | Nền tảng kỹ thuật | 9 | 5 | 2 | 2 |
| 1 | Xem bài học 3D | 7 | 0 | 0 | 7 |
| 2 | Thí nghiệm, kiểm tra, phim | 7 | 0 | 0 | 7 |
| 3 | Trường, tài khoản, lớp | 10 | 0 | 1 | 9 |
| 4 | Dạy học theo lớp | 7 | 0 | 0 | 7 |
| 5 | Hoàn thiện, thử nghiệm thật | 4 | 0 | 0 | 4 |
| 6 | Mở rộng (khi cần) | 1 | 0 | 0 | 1 |
| | **Tổng** | **45** | **5** | **3** | **37** |

API (chương 3, mục 3.1.3): **6 / 73 API REST xong**, WebSocket 0 / 1. Ngoài danh sách có thêm `GET /api/health`.

Test: backend 171 (pytest, CSDL PostgreSQL thật), frontend 25 (Vitest cho `src/api/client.ts`).

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
| NT06 | Ghi nhật ký thao tác | Trưởng nhóm | 0 | Đang làm | d7f3456 | Đã ghi: đăng nhập, khóa tạm, đổi / đặt lại mật khẩu. Các thao tác khác ghi khi làm API tương ứng |
| NT09 | Chốt quy ước API | Trưởng nhóm | 0 | Xong | dbf6502, d7f3456 | Khuôn dạng lỗi, mã lỗi chung, phân trang: `backend/CLAUDE.md` |
| NT08 | Khung giao diện React và thử hiển thị mô hình 3D | Dev Bài học | 0 | Đang làm | 305b484 | Xong: bố cục, menu, gọi API. Chưa: thử mô hình 3D (Three.js) |
| QL00 | Màn hình quản trị bằng dữ liệu giả; Excel mẫu | Dev Quản lý | 0 | Chưa làm | | |
| BH01 | Khung bài học 3D | Dev Bài học | 1 | Chưa làm | | Việc khó nhất |
| ND01 | Nạp mô hình 3D, xóa mô hình | Dev Quản lý | 1 | Chưa làm | | |
| ND02 | Tạo, sửa, xóa, xuất bản bài học | Dev Quản lý | 1 | Chưa làm | | |
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
| 7 | GET | /api/subjects | HT01 | Chưa làm | |
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
| 45–48 | | /api/assets (GET, POST, GET {id}, DELETE) | ND01 | Chưa làm | |
| 49–55 | | /api/editor/lessons (CRUD, publish, unpublish) | ND02 | Chưa làm | |
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
| 4 | Frontend Vite + React 19 + Tailwind 4 + shadcn/ui: client API (token trong bộ nhớ, tự làm mới), màn đăng nhập (Hình 3-3), đổi mật khẩu bắt buộc, bố cục thanh bên theo vai trò (Hình 3-1), trang tạm; Nginx phục vụ bản build, header bảo mật, gzip | 305b484 |

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
- Nhật ký: `LOGIN`, `LOGIN_FAILED`, `LOGIN_LOCKED`, `CHANGE_PASSWORD`, `CHANGE_PASSWORD_FAILED`, `RESET_PASSWORD`; tên đăng nhập không tồn tại chỉ lưu 3 ký tự đầu.
- Nginx ghi đè `X-Forwarded-For` bằng IP thật (không nối thêm) để IP trong nhật ký không giả được.
- Tham số id trên đường dẫn dùng `IdPath` (1 … 2.147.483.647) để id quá lớn trả 422, không 500.

**Giao diện**
- Chữ phụ dùng `--text-2` thay `--muted` vì `--muted` (#858a87) chỉ đạt tương phản ~3,6:1, dưới mức 4,5:1 của quy ước; `--muted` chỉ dùng cho biểu tượng.
- Chữ chính 15 px, nhãn 14 px (to hơn file mẫu ~1 px) theo quy ước 15–16 px.
- Logo ghi "Phòng thí nghiệm ảo / Lý · Hóa · Sinh 3D" theo ảnh mẫu; menu biên tập viên theo Hình 3-1 (Bài học, Mô hình 3D).
- `/` tạm chuyển về `/dang-nhap` cho tới khi có trang giới thiệu.
- Không dùng thư viện form / quản lý trạng thái; Vitest chỉ cho `src/api/client.ts`.
- Phiên bản thư viện tra trên npm và ghim đúng số; cần Node ≥ 22.22 (React Router 8). Docker build dùng `node:26-alpine`, chạy `nginx:1.30.6-alpine` (bản ổn định).

## 6. Giới hạn đã biết

- **Refresh token:** không có bảng `refresh_tokens`, nên token cũ vẫn dùng được tới hết hạn 8 giờ trừ khi `token_version` tăng (đổi / đặt lại mật khẩu).
- **Đăng xuất** chỉ xóa cookie trên máy hiện tại, không tăng `token_version`.
- **Access token cũ** còn hạn tối đa 15 phút sau khi đổi mật khẩu.
- **Khóa tài khoản / trường** hiện chặn refresh nhờ kiểm tra `is_active`, nhưng chưa tăng `token_version` (thêm khi làm API khóa tài khoản, khóa trường).
- **Dò được tên đăng nhập** có tồn tại qua khóa tạm (tên có thật sau 5 lần sai trả 423). Chấp nhận vì tên đăng nhập theo quy tắc mã trường + mã HS/GV vốn đoán được.
- **Tin IP chuyển tiếp:** uvicorn chạy `--forwarded-allow-ips *`, tin mọi máy trong mạng compose (hiện chỉ có `web`, `db`).
- **Ảnh cá chép** ở màn đăng nhập nặng 694 KB, vẫn tải trên màn hẹp.

## 7. Việc còn chờ

- **Giai đoạn 0 còn lại:** NT06 (ghi nhật ký cho mọi thao tác quan trọng khi làm từng API), NT08 (thử hiển thị mô hình 3D bằng Three.js), QL00 (màn quản trị với dữ liệu giả, Excel mẫu).
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
- Cookie refresh chỉ có `Secure` khi `APP_ENV=prod`; truy cập bản thật bằng http (không phải localhost) sẽ không đăng nhập được – cần HTTPS.
- Muốn mở cổng CSDL cho pgAdmin: bỏ chú thích trong `docker-compose.override.yml` (cổng 5433, không dùng 5432).
- Ảnh chụp Playwright lưu trong `.playwright-mcp/` (không đưa lên Git).
- Bản chạy thật: `docker compose -f docker-compose.yml up -d --build` (bỏ qua override dành cho máy dev).
