/** Nhóm mô hình 3D – /api/assets (Bảng 3-6, API 45–48; Bảng 3-11). Biên tập viên, quản trị hệ thống. */
import { request, upload, type UploadOptions } from "./client";

export type SourceType = "SELF_BUILT" | "COMMISSIONED" | "CC0" | "CC_BY" | "CC_BY_SA";
export type CheckField = "file_size" | "triangle_count" | "max_texture_px";

/** Một chỉ số vượt ngưỡng: `warnings` (vượt mức cảnh báo) và `details` của LIMIT_EXCEEDED / WARNINGS_NOT_ACCEPTED. */
export interface AssetCheckItem {
  field: CheckField;
  value: number;
  limit: number;
  message: string;
}

export interface AssetUploadOut {
  id: number;
  file_size: number;
  triangle_count: number;
  max_texture_px: number | null;
  mesh_names: string[];
  unnamed_meshes: number;
  warnings: AssetCheckItem[];
}

export interface AssetLessonRef {
  id: number;
  title: string;
  status: "DRAFT" | "PUBLISHED";
}

export interface AssetListItem {
  id: number;
  name: string;
  file_url: string;
  source_type: SourceType;
  attribution: string | null;
  file_size: number | null;
  triangle_count: number | null;
  max_texture_px: number | null;
  mesh_count: number;
  uploaded_by_name: string | null;
  created_at: string;
  lesson_count: number;
  warning_fields: CheckField[];
}

export interface AssetDetail extends AssetListItem {
  mesh_names: string[];
  warnings: AssetCheckItem[];
  lessons: AssetLessonRef[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Nhãn loại nguồn theo UC 21. */
export const SOURCE_LABEL: Record<SourceType, string> = {
  SELF_BUILT: "Tự dựng",
  COMMISSIONED: "Thuê thiết kế",
  CC0: "CC0",
  CC_BY: "CC BY",
  CC_BY_SA: "CC BY-SA",
};

/** Giấy phép bắt buộc ghi công tác giả. */
export const NEEDS_ATTRIBUTION: ReadonlySet<SourceType> = new Set(["CC_BY", "CC_BY_SA"]);

/** Mức chặn, mức cảnh báo (docs/quyet-dinh.md) – chỉ để hiển thị gợi ý; máy chủ mới là nơi kiểm tra. */
export const MB = 1024 * 1024;
export const MAX_FILE_SIZE = 150 * MB;
export const WARN_LIMITS: Record<CheckField, number> = {
  file_size: 50 * MB,
  triangle_count: 500_000,
  max_texture_px: 2048,
};

/** API 45. */
export function listAssets(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<AssetListItem>> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const s = qs.toString();
  return request<Page<AssetListItem>>(`/api/assets${s ? `?${s}` : ""}`);
}

/** API 47. */
export function getAsset(id: number): Promise<AssetDetail> {
  return request<AssetDetail>(`/api/assets/${id}`);
}

export interface UploadAssetInput {
  file: File;
  name: string;
  sourceType: SourceType;
  attribution: string;
  acceptWarnings: boolean;
}

/** API 46 – lần đầu gửi acceptWarnings=false; nhận 409 WARNINGS_NOT_ACCEPTED thì hỏi rồi gửi lại với true. */
export function uploadAsset(input: UploadAssetInput, options?: UploadOptions): Promise<AssetUploadOut> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("name", input.name);
  form.append("source_type", input.sourceType);
  if (NEEDS_ATTRIBUTION.has(input.sourceType)) form.append("attribution", input.attribution);
  form.append("accept_warnings", input.acceptWarnings ? "true" : "false");
  return upload<AssetUploadOut>("/api/assets", form, options);
}

/** API 48 – 409 ASSET_IN_USE kèm `details` là danh sách bài đang dùng. */
export function deleteAsset(id: number): Promise<void> {
  return request<void>(`/api/assets/${id}`, { method: "DELETE" });
}
