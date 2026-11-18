# PHỤ LỤC. THIẾT KẾ CƠ SỞ DỮ LIỆU VÀ QUAN HỆ GIỮA CÁC BẢNG

## 1. Tổng quan

Phụ lục này bổ sung cho mục 2.7 (Chương 2): tổng hợp toàn bộ quan hệ giữa các bảng, quy tắc khi xóa dữ liệu và lệnh SQL tạo cơ sở dữ liệu. Cơ sở dữ liệu của hệ thống Phòng thí nghiệm ảo 3D STEM dùng PostgreSQL, gồm **15 bảng** chia thành bốn nhóm và **23 quan hệ** giữa các bảng.

*Bảng PL-1. Danh sách các bảng*

| Nhóm | Bảng | Đại diện cho |
|---|---|---|
| Tổ chức và người dùng | schools | Trường học |
| | users | Thông tin chung của mọi tài khoản (đăng nhập, họ tên, liên hệ, vai trò, trường, trạng thái khóa tạm, phiên bản token) |
| | student_profiles | Hồ sơ học sinh |
| | teacher_profiles | Hồ sơ giáo viên |
| | classes | Lớp học theo năm học |
| | class_students | Học sinh thuộc lớp nào |
| | class_teachers | Phân công giảng dạy: giáo viên dạy môn gì ở lớp nào, ai chủ nhiệm |
| Nội dung | subjects | Môn học |
| | assets | Mô hình 3D đã nạp |
| | lessons | Bài học |
| | lesson_parts | Bộ phận được gắn nhãn, chú thích trong bài học |
| | questions | Câu hỏi kiểm tra của bài học |
| Học tập | assignments | Bài giáo viên giao cho lớp |
| | attempts | Mỗi lần học sinh nộp thí nghiệm hoặc bài kiểm tra |
| Hệ thống | system_logs | Nhật ký các thao tác quan trọng |

Ký hiệu dùng trong tài liệu: **1–1** là quan hệ một – một, **1–n** là một – nhiều, **n–n** là nhiều – nhiều. Cột "Khi xóa bản ghi cha" cho biết dữ liệu ở bảng con được xử lý thế nào khi bản ghi ở bảng cha bị xóa.

## 2. Quan hệ giữa các bảng

### 2.1. Người dùng và hồ sơ

*Bảng PL-2. Quan hệ người dùng – hồ sơ*

| Quan hệ | Loại | Khóa ngoại | Ý nghĩa | Khi xóa bản ghi cha |
|---|---|---|---|---|
| users → student_profiles | 1–1 | student_profiles.user_id | Một tài khoản học sinh có đúng một hồ sơ học sinh | Xóa user thì xóa hồ sơ |
| users → teacher_profiles | 1–1 | teacher_profiles.user_id | Một tài khoản giáo viên có một hồ sơ giáo viên | Xóa user thì xóa hồ sơ |

Cột `user_id` của mỗi bảng hồ sơ vừa là khóa chính vừa là khóa ngoại, nên một tài khoản có tối đa một hồ sơ mỗi loại. Mỗi tài khoản chỉ giữ một vai trò, nên trên thực tế chỉ có một trong hai hồ sơ. Quản trị trường, biên tập viên và quản trị hệ thống chỉ có bản ghi trong `users`, không có hồ sơ riêng. Quản trị trường thuộc một trường (`users.school_id`); biên tập viên và quản trị hệ thống không thuộc trường nào (`school_id` để NULL).

### 2.2. Trường học

*Bảng PL-3. Quan hệ của bảng trường học*

| Quan hệ | Loại | Khóa ngoại | Ý nghĩa | Khi xóa trường |
|---|---|---|---|---|
| schools → users | 1–n | users.school_id | Một trường có nhiều tài khoản (học sinh, giáo viên, quản trị trường); NULL với biên tập viên, quản trị hệ thống | Xóa theo (tài khoản bị xóa) |
| schools → student_profiles | 1–n | student_profiles.school_id | Một trường có nhiều học sinh | Xóa theo |
| schools → teacher_profiles | 1–n | teacher_profiles.school_id | Một trường có nhiều giáo viên | Xóa theo |
| schools → classes | 1–n | classes.school_id | Một trường có nhiều lớp | Xóa theo |
| schools → system_logs | 1–n | system_logs.school_id | Nhật ký gắn với trường | Giữ nhật ký, cột trường thành NULL |

### 2.3. Lớp học

*Bảng PL-4. Quan hệ của lớp học*

| Quan hệ | Loại | Bảng trung gian / khóa ngoại | Ý nghĩa |
|---|---|---|---|
| classes ↔ student_profiles | n–n | class_students | Một lớp có nhiều học sinh; một học sinh qua các năm học thuộc nhiều lớp, trong một năm học chỉ thuộc một lớp |
| classes ↔ teacher_profiles | n–n | class_teachers | Một lớp có nhiều giáo viên dạy; một giáo viên dạy nhiều lớp. Mỗi dòng ghi rõ môn dạy và có phải chủ nhiệm hay không |
| subjects → class_teachers | 1–n | class_teachers.subject_id | Một môn được phân công ở nhiều lớp; không xóa được môn đang có phân công |

Xóa lớp, học sinh hoặc giáo viên thì các dòng tương ứng trong hai bảng trung gian bị xóa theo. Mỗi lớp có tối đa một giáo viên chủ nhiệm, được đảm bảo bằng chỉ mục duy nhất một phần trên `class_teachers(class_id) WHERE is_homeroom`.

### 2.4. Nội dung bài học

*Bảng PL-5. Quan hệ của nội dung bài học*

| Quan hệ | Loại | Khóa ngoại | Ý nghĩa | Khi xóa bản ghi cha |
|---|---|---|---|---|
| subjects → lessons | 1–n | lessons.subject_id | Một môn có nhiều bài | Không cho xóa môn còn bài |
| assets → lessons | 1–n | lessons.asset_id | Một mô hình dùng được cho nhiều bài | Không cho xóa mô hình đang được dùng |
| lessons → lesson_parts | 1–n | lesson_parts.lesson_id | Một bài có nhiều bộ phận được gắn nhãn | Xóa theo |
| lessons → questions | 1–n | questions.lesson_id | Một bài có nhiều câu hỏi | Xóa theo |
| users → assets | 1–n | assets.uploaded_by | Biên tập viên nạp nhiều mô hình | Giữ mô hình, người nạp thành NULL |
| users → lessons | 1–n (hai quan hệ) | lessons.created_by, lessons.published_by | Biên tập viên tạo và xuất bản bài | Giữ bài, người tạo / xuất bản thành NULL |

### 2.5. Giao bài và nộp bài

*Bảng PL-6. Quan hệ của giao bài và nộp bài*

| Quan hệ | Loại | Khóa ngoại | Ý nghĩa | Khi xóa bản ghi cha |
|---|---|---|---|---|
| classes → assignments | 1–n | assignments.class_id | Một lớp nhận nhiều bài giao | Xóa theo |
| lessons → assignments | 1–n | assignments.lesson_id | Một bài được giao cho nhiều lớp | Không cho xóa bài đang được giao |
| teacher_profiles → assignments | 1–n | assignments.assigned_by | Một giáo viên giao nhiều bài | Giữ bài giao, người giao thành NULL |
| student_profiles → attempts | 1–n | attempts.student_id | Một học sinh nộp nhiều lần | Xóa theo (mất bài nộp) |
| lessons → attempts | 1–n | attempts.lesson_id | Một bài có nhiều lượt nộp | Không cho xóa bài đã có người nộp |
| assignments → attempts | 1–n, không bắt buộc | attempts.assignment_id | Lượt nộp thuộc một bài giao, hoặc NULL nếu học sinh tự học | Giữ bài nộp, cột bài giao thành NULL |

### 2.6. Nhật ký hệ thống

*Bảng PL-7. Quan hệ của nhật ký*

| Quan hệ | Loại | Khóa ngoại | Ý nghĩa | Khi xóa user |
|---|---|---|---|---|
| users → system_logs | 1–n | system_logs.user_id | Một người có nhiều dòng nhật ký | Giữ nhật ký, user thành NULL; tên tài khoản vẫn lưu trong cột detail |

## 3. Sơ đồ ERD

*Hình PL-1. Sơ đồ ERD của hệ thống*

![Hình PL-1](E:/ino_lhs/pttk/hinh/2-31.png)

Tóm tắt cấu trúc:

- **users** là trung tâm về con người: mỗi tài khoản có một vai trò, thuộc một trường (nếu là người của nhà trường) và tối đa một hồ sơ theo vai trò.
- **lessons** là trung tâm về nội dung: mỗi bài thuộc một môn, dùng một mô hình, có nhiều bộ phận và câu hỏi.
- **classes** nối hai phía qua phân công giảng dạy (`class_teachers`) và giao bài (`assignments`).
- **attempts** là nơi các phía gặp nhau: học sinh nào nộp bài nào, thuộc đợt giao nào, được bao nhiêu điểm.

## 4. Quy tắc khi xóa dữ liệu

Hệ thống dùng xóa hẳn. Các quy tắc lan truyền được khai báo ngay trong khóa ngoại:

*Bảng PL-8. Hệ quả khi xóa*

| Xóa | Hệ quả |
|---|---|
| Học sinh | Xóa hồ sơ, xếp lớp và **toàn bộ bài đã nộp** của học sinh |
| Giáo viên | Xóa hồ sơ và phân công giảng dạy; bài đã giao vẫn giữ, chỉ bỏ thông tin người giao |
| Biên tập viên | Bài học và mô hình đã tạo vẫn giữ, chỉ bỏ thông tin người tạo |
| Lớp | Chỉ xóa được lớp không còn học sinh và chưa có bài giao (xem Use Case Quản lý lớp và phân công giảng dạy); khi đó xóa luôn phân công giảng dạy của lớp. Riêng khi xóa cả trường, lớp bị xóa theo cùng bài giao; bài nộp còn lại (nếu có) không còn gắn với bài giao |
| Trường | Xóa toàn bộ tài khoản, hồ sơ, lớp, phân công, bài giao, bài nộp của trường; nhật ký vẫn giữ |

Vì bảng `users` có cột `school_id` khai báo ON DELETE CASCADE, chỉ cần một lệnh xóa trường là CSDL tự xóa toàn bộ dữ liệu liên quan, kể cả tài khoản. Cột `school_id` ở các bảng hồ sơ được giữ lại để ràng buộc mã học sinh không trùng trong một trường; phần mềm đảm bảo giá trị này luôn khớp với `users.school_id`.

## 5. Lệnh SQL tạo cơ sở dữ liệu

Bước 1: tạo database (chạy khi đang kết nối vào database `postgres`):

```
CREATE DATABASE stem3d WITH ENCODING 'UTF8';
```

Bước 2: kết nối vào `stem3d` rồi chạy toàn bộ lệnh sau:

```
-- ===== 1. NHÓM TỔ CHỨC VÀ NGƯỜI DÙNG =====
CREATE TABLE schools (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    name        TEXT         NOT NULL,
    level       VARCHAR(20)  CHECK (level IN ('PRIMARY','LOWER_SECONDARY','UPPER_SECONDARY','MULTI')),
    address     TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    school_id      INT REFERENCES schools(id) ON DELETE CASCADE,   -- NULL: biên tập viên, quản trị hệ thống
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    full_name      TEXT         NOT NULL,
    email          VARCHAR(100),
    phone          VARCHAR(15),
    avatar_url     TEXT,
    role           VARCHAR(15)  NOT NULL
                   CHECK (role IN ('SYSTEM_ADMIN','CONTENT_EDITOR','SCHOOL_ADMIN','TEACHER','STUDENT')),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    last_login_at  TIMESTAMP,
    must_change_password  BOOLEAN   NOT NULL DEFAULT false,  -- phải đổi mật khẩu ở lần đăng nhập tới
    failed_login_count    SMALLINT  NOT NULL DEFAULT 0,      -- số lần đăng nhập sai liên tiếp
    locked_until          TIMESTAMP,                         -- khóa tạm tới thời điểm này
    token_version         INT       NOT NULL DEFAULT 0,      -- tăng khi đổi/đặt lại mật khẩu, khóa: thu hồi refresh token
    created_at     TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
    user_id        INT PRIMARY KEY REFERENCES users(id)   ON DELETE CASCADE,
    school_id      INT NOT NULL    REFERENCES schools(id) ON DELETE CASCADE,
    student_code   VARCHAR(20) NOT NULL,
    date_of_birth  DATE,
    gender         VARCHAR(6) CHECK (gender IN ('MALE','FEMALE')),
    parent_name    TEXT,
    parent_phone   VARCHAR(15),
    UNIQUE (school_id, student_code)
);

CREATE TABLE teacher_profiles (
    user_id       INT PRIMARY KEY REFERENCES users(id)   ON DELETE CASCADE,
    school_id     INT NOT NULL    REFERENCES schools(id) ON DELETE CASCADE,
    teacher_code  VARCHAR(20),
    department    TEXT,
    position      VARCHAR(12) NOT NULL DEFAULT 'TEACHER'
                  CHECK (position IN ('TEACHER','HEAD','DEPUTY_HEAD'))
);

CREATE TABLE subjects (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(20) NOT NULL UNIQUE,
    name       TEXT        NOT NULL,
    min_grade  SMALLINT,
    max_grade  SMALLINT
);

CREATE TABLE classes (
    id           SERIAL PRIMARY KEY,
    school_id    INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name         VARCHAR(20) NOT NULL,
    grade        SMALLINT CHECK (grade BETWEEN 1 AND 12),
    school_year  VARCHAR(9) NOT NULL,
    UNIQUE (school_id, name, school_year)
);

CREATE TABLE class_students (
    class_id    INT REFERENCES classes(id)                ON DELETE CASCADE,
    student_id  INT REFERENCES student_profiles(user_id)  ON DELETE CASCADE,
    PRIMARY KEY (class_id, student_id)
);

CREATE TABLE class_teachers (
    class_id     INT REFERENCES classes(id)                ON DELETE CASCADE,
    teacher_id   INT REFERENCES teacher_profiles(user_id)  ON DELETE CASCADE,
    subject_id   INT NOT NULL REFERENCES subjects(id),
    is_homeroom  BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (class_id, teacher_id, subject_id)
);
CREATE UNIQUE INDEX uq_class_homeroom ON class_teachers (class_id) WHERE is_homeroom;

-- ===== 2. NHÓM NỘI DUNG =====
CREATE TABLE assets (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       INT,
    triangle_count  INT,
    max_texture_px  INT,
    mesh_names      JSONB,
    source_type     VARCHAR(20) NOT NULL
                    CHECK (source_type IN ('SELF_BUILT','COMMISSIONED','CC0','CC_BY','CC_BY_SA')),
    attribution     TEXT,
    uploaded_by     INT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (source_type NOT IN ('CC_BY','CC_BY_SA') OR attribution IS NOT NULL)
);

CREATE TABLE lessons (
    id              SERIAL PRIMARY KEY,
    subject_id      INT NOT NULL REFERENCES subjects(id),
    grade           SMALLINT CHECK (grade BETWEEN 1 AND 12),
    book_series     VARCHAR(30) DEFAULT 'KNTT',
    chapter         TEXT,
    lesson_no       SMALLINT,
    title           TEXT NOT NULL,
    lesson_type     VARCHAR(12) CHECK (lesson_type IN ('STRUCTURE','EXPERIMENT')),
    asset_id        INT REFERENCES assets(id),
    config          JSONB,
    thumbnail_path  TEXT,
    status          VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
    created_by      INT REFERENCES users(id) ON DELETE SET NULL,
    published_by    INT REFERENCES users(id) ON DELETE SET NULL,
    published_at    TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE lesson_parts (
    id           SERIAL PRIMARY KEY,
    lesson_id    INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    mesh_names   JSONB NOT NULL,
    label        TEXT  NOT NULL,
    description  TEXT,
    camera_view  JSONB,
    sort_order   SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE questions (
    id             SERIAL PRIMARY KEY,
    lesson_id      INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question_type  VARCHAR(12) NOT NULL CHECK (question_type IN ('CHOICE','PICK_PART','NUMERIC')),
    content        TEXT  NOT NULL,
    options        JSONB,
    answer         JSONB NOT NULL,
    tolerance      NUMERIC,
    sort_order     SMALLINT NOT NULL DEFAULT 0
);

-- ===== 3. NHÓM HỌC TẬP =====
CREATE TABLE assignments (
    id           SERIAL PRIMARY KEY,
    class_id     INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    lesson_id    INT NOT NULL REFERENCES lessons(id),
    assigned_by  INT REFERENCES teacher_profiles(user_id) ON DELETE SET NULL,
    requirement  VARCHAR(12) CHECK (requirement IN ('EXPERIMENT','QUIZ','BOTH')),
    open_at      TIMESTAMP NOT NULL,
    due_at       TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (due_at IS NULL OR due_at > open_at)
);

CREATE TABLE attempts (
    id               SERIAL PRIMARY KEY,
    client_id        UUID NOT NULL UNIQUE,
    student_id       INT  NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    lesson_id        INT  NOT NULL REFERENCES lessons(id),
    assignment_id    INT  REFERENCES assignments(id) ON DELETE SET NULL,
    attempt_type     VARCHAR(12) CHECK (attempt_type IN ('EXPERIMENT','QUIZ')),
    experiment_data  JSONB,
    answers          JSONB,
    score            NUMERIC(4,2),
    submitted_at     TIMESTAMP NOT NULL,
    synced_at        TIMESTAMP NOT NULL DEFAULT now()
);

-- ===== 4. NHÓM HỆ THỐNG =====
CREATE TABLE system_logs (
    id           BIGSERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id)   ON DELETE SET NULL,
    school_id    INT REFERENCES schools(id) ON DELETE SET NULL,
    action       VARCHAR(30) NOT NULL,
    target_type  VARCHAR(20),
    target_id    INT,
    detail       JSONB,
    created_at   TIMESTAMP NOT NULL DEFAULT now()
);
```

Bước 3: xem ERD. Trong pgAdmin 4, chuột phải vào database `stem3d` → **ERD For Database**, bấm **Auto align** để sắp xếp bảng, rồi **Download image** để lấy ảnh. Trong DBeaver, mở `stem3d` → Schemas → public → tab **ER Diagram**.
