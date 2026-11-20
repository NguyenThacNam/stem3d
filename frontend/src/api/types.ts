/** Kiểu dữ liệu theo API chương 3 (tên trường = tên cột CSDL, snake_case). */

export type Role = "SYSTEM_ADMIN" | "CONTENT_EDITOR" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export interface SchoolBrief {
  id: number;
  code: string;
  name: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  role: Role;
  school: SchoolBrief | null;
}

export interface TokenOut {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  must_change_password: boolean;
  user: UserBrief;
}

export interface Me {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  school: SchoolBrief | null;
  must_change_password: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}

/*
 * API 9 – GET /api/lessons/{id} (chi tiết bài học cho học sinh, giáo viên).
 * Chương 3 chỉ mô tả bằng lời; khuôn dạng dưới đây là ĐỀ XUẤT của BH01, chờ thống nhất với Dev Quản lý
 * (TIEN_DO.md mục 10, dòng "API học tập", "Cấu hình bài học", "Gắn nhãn bộ phận"). Không có đáp án, công thức chấm,
 * sai số. BẢO MẬT: màn học tập chỉ dùng `LessonView`, KHÔNG dùng `LessonDetail` của `api/editorLessons.ts` (API 51,
 * có đáp án, sai số); máy chủ cũng dùng schema đầu ra riêng `LessonViewOut`, không dùng lại schema của API 51.
 */
export type LessonType = "STRUCTURE" | "EXPERIMENT";

/** Tọa độ trong hệ của mô hình đã đưa tâm khối bao về gốc, không co giãn (`duaTamVeGoc`). */
export type Vec3 = [number, number, number];

/** Góc nhìn: vị trí camera và điểm camera nhìn vào (giống tin nhắn `camera` của WebSocket, chương 3). */
export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface LessonViewPart {
  id: number;
  label: string;
  description: string | null;
  /** Một hoặc nhiều tên mesh trong file GLB (so theo `chuanHoaTenMesh`). */
  mesh_names: string[];
  camera_view: CameraView | null;
  sort_order: number;
}

/** Chương 3 gọi là `model`; dùng `asset` để đồng bộ API 51 (lệch có chủ ý, trưởng nhóm chốt – TIEN_DO.md mục 5). */
export interface LessonViewAsset {
  /** Đường dẫn file GLB (có số phiên bản, ví dụ /content/models/12.v1.glb); cùng tên trường với API 51. */
  file_url: string;
  /** Dung lượng file (byte), bắt buộc: dùng hiện phần trăm tải khi máy chủ không gửi Content-Length. */
  file_size: number;
  /** Dòng ghi công hiển thị ở góc dưới khung 3D; null nếu không cần. */
  attribution: string | null;
}

/**
 * `lessons.config` ĐÃ LỌC cho học sinh (API 9). Khung `config` có đúng 3 khóa (trưởng nhóm chốt, TIEN_DO.md mục 10):
 * `camera_tong_quan` (ND03), `kich_ban_phim` (HT03), `thi_nghiem {thong_so, cong_thuc_hien_thi, cong_thuc, sai_so}`
 * (HT04 + NT07).
 * API 9 chỉ trả theo danh sách cho phép: `camera_tong_quan`, `kich_ban_phim`, `thi_nghiem.thong_so`,
 * `thi_nghiem.cong_thuc_hien_thi` – KHÔNG BAO GIỜ có
 * `cong_thuc`, `sai_so`. Nội dung bên trong từng khóa do việc tương ứng chốt sau.
 */
export interface LessonConfig {
  /** Góc nhìn tổng quan khi mở bài và khi bấm "Đặt lại góc nhìn"; null thì tự canh vừa khung. */
  camera_tong_quan?: CameraView | null;
  /** Kịch bản phim (HT03 chốt nội dung); rỗng hoặc không có thì ẩn chế độ Phim. */
  kich_ban_phim?: unknown[] | null;
  /** Bài thí nghiệm (HT04 chốt nội dung): thông số và công thức hiển thị (vẽ hiện tượng, đồ thị). Công thức chấm
   * (`cong_thuc`) và sai số (`sai_so`) không bao giờ có ở đây. */
  thi_nghiem?: { thong_so?: unknown; cong_thuc_hien_thi?: unknown } | null;
}

export interface LessonView {
  id: number;
  subject: { id: number; name: string };
  grade: number;
  chapter: string | null;
  lesson_no: number | null;
  title: string;
  lesson_type: LessonType;
  asset: LessonViewAsset | null;
  config: LessonConfig;
  parts: LessonViewPart[];
  /** Câu hỏi kiểm tra nhanh (HT05), không kèm đáp án. */
  questions: unknown[];
}
