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
 * (TIEN_DO.md mục 10, dòng "Cấu hình bài học", "Gắn nhãn bộ phận"). Không có đáp án, công thức chấm, sai số.
 */
export type LessonType = "STRUCTURE" | "EXPERIMENT";

/** Tọa độ trong hệ của mô hình đã đưa tâm khối bao về gốc, không co giãn (`duaTamVeGoc`). */
export type Vec3 = [number, number, number];

/** Góc nhìn: vị trí camera và điểm camera nhìn vào (giống tin nhắn `camera` của WebSocket, chương 3). */
export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface LessonPart {
  id: number;
  label: string;
  description: string | null;
  /** Một hoặc nhiều tên mesh trong file GLB (so theo `chuanHoaTenMesh`). */
  mesh_names: string[];
  camera_view: CameraView | null;
  sort_order: number;
}

export interface LessonModel {
  /** Đường dẫn file GLB (có số phiên bản, ví dụ /content/models/12.v1.glb). */
  url: string;
  file_size: number | null;
  /** Dòng ghi công hiển thị ở góc dưới khung 3D; null nếu không cần. */
  attribution: string | null;
}

/** `lessons.config` đã lọc (không có công thức chấm, sai số). */
export interface LessonConfig {
  /** Góc nhìn tổng quan khi mở bài và khi bấm "Đặt lại góc nhìn"; null thì tự canh vừa khung. */
  camera_view?: CameraView | null;
  /** Kịch bản phim (HT03); rỗng hoặc không có thì ẩn chế độ Phim. */
  film_script?: unknown[] | null;
}

export interface LessonDetail {
  id: number;
  subject: { id: number; name: string };
  grade: number;
  chapter: string | null;
  lesson_no: number | null;
  title: string;
  lesson_type: LessonType;
  model: LessonModel | null;
  config: LessonConfig;
  parts: LessonPart[];
  /** Câu hỏi kiểm tra nhanh (HT05), không kèm đáp án. */
  questions: unknown[];
}
