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

## Tiến độ
- Đầu mỗi phiên: đọc `TIEN_DO.md` (đang ở giai đoạn nào, việc nào xong, quyết định phát sinh, giới hạn đã biết).
- Xong mỗi phần: cập nhật `TIEN_DO.md` (bảng chức năng, bảng API, commit, quyết định mới) trong CÙNG commit của phần đó.
- **Mỗi phần đã chạy đủ test và `review-code` soát đạt thì BẮT BUỘC cập nhật `TIEN_DO.md` trước khi commit / tạo PR
  vào `dev`**, kể cả khi việc mới xong một phần. PR vào `dev` không kèm cập nhật tiến độ thì chưa được gộp.
  Cập nhật những gì có thay đổi:
  - Mục 1: số việc theo giai đoạn (Xong / Đang làm / Chưa làm), tóm tắt, số test backend / frontend.
  - Mục 2: trạng thái việc (`Đang làm` khi mới xong một phần, `Xong` khi xong hết), commit, ghi chú nói rõ
    "Xong: …. Chưa: …" để người khác biết còn thiếu gì; làm thay người khác thì ghi "Người làm: …".
  - Mục 3: trạng thái, commit của từng API vừa làm.
  - Mục 4: một dòng tóm tắt phần vừa làm. Mục 5: quyết định mới. Mục 6: giới hạn đã biết. Mục 7: việc còn chờ.
  - Mục 11: thêm dòng khi phần vừa làm là thứ người khác sẽ dùng lại (thành phần, hàm, quy ước).
  - Rồi chạy `python ke-hoach/tao_phan_cong.py` và commit `TIEN_DO.md` + Excel cùng phần code đó.
- Chỉ sửa dòng của việc mình; thấy dòng của người khác chưa cập nhật thì nhắc người đó (hoặc trưởng nhóm), trừ khi
  trưởng nhóm giao sửa.
- Không sửa tay file Excel `ke-hoach/Phan_cong_cong_viec.xlsx`. Xong một việc: cập nhật `TIEN_DO.md` (trạng thái ở
  mục 2; thứ tự, phân công ở mục 9; phối hợp ở mục 10) rồi chạy `python ke-hoach/tao_phan_cong.py` để sinh lại
  Excel, commit cả hai. Excel bị xung đột khi gộp thì chạy lại script trên nhánh đã gộp.
  Script cần `pip install openpyxl==3.1.5` (ghim phiên bản để mọi máy sinh ra cùng một file).

## Quy trình Git
- Nhánh:
  - `main`: bản ổn định; chỉ nhận từ `dev` qua Pull Request khi đã chạy thử ổn; chỉ trưởng nhóm gộp.
  - `dev`: nơi gộp code cả nhóm; chỉ nhận từ nhánh việc qua Pull Request, người làm tự gộp (xem dưới).
  - Nhánh việc tạo từ `dev`, mỗi việc một nhánh, tên theo mã việc trong `docs/Ke_hoach_trien_khai_chuc_nang.xlsx`:
    `feature/<mã-việc>-<mô-tả-ngắn-không-dấu>` (ví dụ `feature/QL04-nhap-hoc-sinh-excel`); sửa lỗi: `fix/<mô-tả>`;
    thay đổi chỉ về tài liệu, quy tắc (không đụng code chạy): `docs/<mô-tả>`.
- Không commit, merge, push thẳng vào `main` hay `dev`.
- Bắt đầu một việc, theo thứ tự:
  1. Kéo `dev` mới nhất: `git switch dev` → `git pull`.
  2. Xem trên GitHub đã có nhánh của việc đó chưa: `git fetch --prune` rồi `git branch -r | grep <mã-việc>`. Có rồi thì
     hỏi người kia, không tạo nhánh trùng.
  3. Tạo nhánh: `git switch -c feature/...`.
  4. Giữ chỗ ngay: trong `TIEN_DO.md` đổi trạng thái việc (mục 2) thành `Đang làm` và ghi đầu cột Ghi chú
     "Người làm: <tên>. …" (cột Trạng thái chỉ nhận 5 giá trị: Chưa làm, Đang làm, Xong, Tạm hoãn, Bỏ – script sinh
     Excel kiểm tra), chạy `python ke-hoach/tao_phan_cong.py`, commit và đẩy nhánh lên (`git push -u origin <nhánh>`).
- Mỗi ngày và trước khi tạo PR: kéo `dev` mới nhất về nhánh mình (`git pull origin dev`), tự giải quyết xung đột.
- Migration: kéo `dev` mới nhất về TRƯỚC khi tạo migration; nếu Alembic báo nhiều head thì tạo migration gộp
  (`alembic merge`) trên nhánh của mình.
- File dùng chung (`backend/app/main.py`, `TIEN_DO.md`, `frontend/src/lib/roles.ts`…): chỉ thêm phần của mình,
  không sửa phần của người khác.
- Gộp vào `dev`: KHÔNG cần trưởng nhóm duyệt, người làm tự gộp, theo thứ tự:
  1. Chạy toàn bộ test; nhờ `review-code` soát đạt; cập nhật dòng của việc mình trong `TIEN_DO.md`.
  2. Kéo `dev` mới nhất về nhánh mình (`git pull origin dev`) và chạy lại toàn bộ test. Có xung đột phải sửa
     tay thì nhờ `review-code` soát lại phần đã sửa.
  3. Đẩy nhánh lên, tạo PR vào `dev` trên GitHub, tự bấm **Merge pull request** (kiểu **Create a merge commit**,
     không dùng Squash / Rebase) → **Confirm merge**, xong bấm **Delete branch**. Trang PR báo nhánh đã cũ so với
     `dev` ("out-of-date") thì quay lại bước 2 trước khi gộp.
  4. Dọn trên máy: `git switch dev && git pull && git branch -d <nhánh-việc>`.
  5. Gộp xong mà `dev` lỗi: trên PR đó bấm **Revert** → **Create pull request** → **Merge pull request** →
     **Confirm merge**. GitHub báo không revert tự động được thì làm trên máy: tạo nhánh `fix/...` từ `dev`,
     `git revert -m 1 <mã-merge-commit>`, rồi tạo PR như thường.
- Chỉ trưởng nhóm gộp `dev` vào `main`, cũng qua PR, khi đã chạy thử ổn.
- Hook `.claude/hooks/chan_git_nhanh_chinh.py` chặn Claude commit / merge / rebase / cherry-pick khi đang ở `main`
  hoặc `dev`, và chặn mọi `git push` nhắm vào `main` / `dev` (test: `python -m pytest .claude/hooks/tests`).
  Lưu ý:
  - Hook chỉ ràng buộc Claude, KHÔNG ràng buộc người gõ lệnh trong terminal.
  - Hook chỉ đọc chuỗi lệnh Bash: không chặn được `bash -c "..."`, alias git hay script riêng.
  - GitHub gói miễn phí với kho riêng tư có thể không khóa được nhánh (branch protection), nên quy tắc này dựa
    trên thỏa thuận của nhóm.

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
- Dữ liệu mẫu (máy phát triển, cần `SEED_PASSWORD` trong `.env`): `docker compose exec api python -m scripts.seed`

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
