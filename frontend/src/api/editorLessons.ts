/** Soạn bài học – /api/editor/lessons (API 49–56) và môn học – /api/subjects (API 7). Biên tập viên, quản trị hệ thống. */
import type { Page } from "./assets";
import { request } from "./client";

export type LessonType = "STRUCTURE" | "EXPERIMENT";
export type LessonStatus = "DRAFT" | "PUBLISHED";

export interface Subject {
  id: number;
  code: string;
  name: string;
  min_grade: number | null;
  max_grade: number | null;
}

export interface SubjectBrief {
  id: number;
  code: string;
  name: string;
}

export interface LessonListItem {
  id: number;
  title: string;
  subject: SubjectBrief;
  grade: number | null;
  book_series: string | null;
  chapter: string | null;
  lesson_no: number | null;
  lesson_type: LessonType | null;
  status: LessonStatus;
  asset_id: number | null;
  asset_name: string | null;
  part_count: number;
  question_count: number;
  created_by_name: string | null;
  updated_at: string;
  published_at: string | null;
}

export interface LessonPart {
  id: number;
  mesh_names: string[];
  label: string;
  description: string | null;
  /** `{position: [x, y, z], target: [x, y, z]}` theo tọa độ gốc của file GLB (`GocNhin`), hoặc null. */
  camera_view: unknown;
  sort_order: number;
}

/** Một bộ phận gửi lên API 56: có `id` thì sửa tại chỗ (giữ id), không có thì thêm mới. Thứ tự = thứ tự mảng. */
export interface LessonPartInput {
  id?: number;
  mesh_names: string[];
  label: string;
  description: string | null;
  camera_view: { position: [number, number, number]; target: [number, number, number] } | null;
}

export interface LessonQuestion {
  id: number;
  question_type: string;
  content: string;
  options: unknown;
  answer: unknown;
  tolerance: string | null;
  sort_order: number;
}

export interface LessonAsset {
  id: number;
  name: string;
  file_url: string;
  source_type: string;
  attribution: string | null;
  mesh_names: string[];
}

export interface LessonDetail {
  id: number;
  title: string;
  subject: SubjectBrief;
  grade: number | null;
  book_series: string | null;
  chapter: string | null;
  lesson_no: number | null;
  lesson_type: LessonType | null;
  status: LessonStatus;
  asset: LessonAsset | null;
  config: Record<string, unknown>;
  parts: LessonPart[];
  questions: LessonQuestion[];
  created_by_name: string | null;
  published_by_name: string | null;
  updated_at: string;
  published_at: string | null;
  /** Phần còn thiếu để xuất bản; rỗng là đủ điều kiện. */
  missing_for_publish: string[];
}

/** Dữ liệu gửi lên API 50, 52 (API 52 thay toàn bộ, phải gửi đủ). */
export interface LessonInput {
  subject_id: number;
  grade: number;
  book_series: string;
  chapter: string | null;
  lesson_no: number | null;
  title: string;
  lesson_type: LessonType;
  asset_id: number | null;
  config: Record<string, unknown>;
  confirm_duplicate?: boolean;
}

/** `details` của 409 DUPLICATE_LESSON. */
export interface DuplicateLesson {
  id: number;
  title: string;
  status: LessonStatus;
}

/** `details` của 409 LESSON_ASSIGNED. */
export interface ActiveAssignment {
  assignment_id: number;
  class_name: string;
  due_at: string | null;
}

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  STRUCTURE: "Cấu tạo",
  EXPERIMENT: "Thí nghiệm",
};

export const STATUS_LABEL: Record<LessonStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
};

/** API 7. */
export function listSubjects(): Promise<Subject[]> {
  return request<Subject[]>("/api/subjects");
}

/** API 49. */
export function listLessons(params: {
  status?: LessonStatus;
  subjectId?: number;
  grade?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<LessonListItem>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.subjectId) qs.set("subject_id", String(params.subjectId));
  if (params.grade) qs.set("grade", String(params.grade));
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const s = qs.toString();
  return request<Page<LessonListItem>>(`/api/editor/lessons${s ? `?${s}` : ""}`);
}

/** API 50 – 409 DUPLICATE_LESSON: hỏi rồi gửi lại với confirm_duplicate. */
export function createLesson(input: LessonInput): Promise<LessonDetail> {
  return request<LessonDetail>("/api/editor/lessons", { method: "POST", body: input });
}

/** API 51. */
export function getLesson(id: number): Promise<LessonDetail> {
  return request<LessonDetail>(`/api/editor/lessons/${id}`);
}

/** API 52. */
export function updateLesson(id: number, input: LessonInput): Promise<LessonDetail> {
  return request<LessonDetail>(`/api/editor/lessons/${id}`, { method: "PUT", body: input });
}

/** API 53 – 409 LESSON_IN_USE khi đã giao hoặc đã có bài nộp. */
export function deleteLesson(id: number): Promise<void> {
  return request<void>(`/api/editor/lessons/${id}`, { method: "DELETE" });
}

/** API 54 – 400 LESSON_INCOMPLETE kèm danh sách phần thiếu. */
export function publishLesson(id: number): Promise<LessonDetail> {
  return request<LessonDetail>(`/api/editor/lessons/${id}/publish`, { method: "POST" });
}

/** API 55 – 409 LESSON_ASSIGNED: hỏi rồi gửi lại với confirm. */
export function unpublishLesson(id: number, confirm = false): Promise<LessonDetail> {
  return request<LessonDetail>(`/api/editor/lessons/${id}/unpublish`, { method: "POST", body: { confirm } });
}

/** API 56 – thay toàn bộ danh sách nhãn bộ phận. 400 LESSON_NO_ASSET, LESSON_INCOMPLETE; 422 theo `parts.<i>.<trường>`. */
export function replaceLessonParts(id: number, parts: LessonPartInput[]): Promise<LessonDetail> {
  return request<LessonDetail>(`/api/editor/lessons/${id}/parts`, { method: "PUT", body: { parts } });
}
