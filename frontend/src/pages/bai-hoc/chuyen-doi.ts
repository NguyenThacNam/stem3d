/** Chuyển giữa biểu mẫu thông tin bài và dữ liệu API 50–52. */
import type { LessonDetail, LessonInput } from "@/api/editorLessons";
import { ApiError } from "@/api/client";
import type { LoiThongTin, ThongTinBai } from "./ThongTinBaiForm";

export function tuBaiHoc(b: LessonDetail): ThongTinBai {
  return {
    title: b.title,
    subject_id: b.subject.id,
    grade: b.grade ?? "",
    book_series: b.book_series ?? "KNTT",
    chapter: b.chapter ?? "",
    lesson_no: b.lesson_no === null ? "" : String(b.lesson_no),
    lesson_type: b.lesson_type ?? "STRUCTURE",
  };
}

/** Gọi sau khi kiemTraThongTin không còn lỗi (subject_id, grade đã chọn). */
export function thanhDauVao(
  v: ThongTinBai,
  extra: { asset_id: number | null; config: Record<string, unknown>; confirm_duplicate?: boolean },
): LessonInput {
  return {
    title: v.title.trim(),
    subject_id: Number(v.subject_id),
    grade: Number(v.grade),
    book_series: v.book_series.trim(),
    chapter: v.chapter.trim() || null,
    lesson_no: v.lesson_no.trim() ? Number(v.lesson_no) : null,
    lesson_type: v.lesson_type,
    ...extra,
  };
}

const O_TREN_FORM = ["title", "subject_id", "grade", "book_series", "chapter", "lesson_no", "lesson_type"];

/** Thông báo lỗi để hiện: lỗi 422 ở trường không có trên biểu mẫu (mô hình, cấu hình) thì nối câu của máy chủ vào. */
export function cauLoi(e: unknown, macDinh: string): { text: string; loiMoHinh: boolean } {
  if (!(e instanceof ApiError)) return { text: macDinh, loiMoHinh: false };
  const khac =
    e.status === 422 && Array.isArray(e.details)
      ? (e.details as { field?: string; message?: string }[]).filter(
          (d) => d.field && !O_TREN_FORM.includes(d.field),
        )
      : [];
  if (khac.length === 0) return { text: e.message, loiMoHinh: false };
  return { text: khac.map((d) => d.message).join(". "), loiMoHinh: khac.some((d) => d.field === "asset_id") };
}

/** Lỗi 422 của máy chủ → lỗi từng ô (chỉ các ô có trong biểu mẫu). */
export function loiTuMayChu(e: unknown): LoiThongTin | null {
  if (!(e instanceof ApiError) || e.status !== 422 || !Array.isArray(e.details)) return null;
  const loi: LoiThongTin = {};
  for (const d of e.details as { field?: string; message?: string }[]) {
    const f = d.field as keyof ThongTinBai | undefined;
    if (
      f &&
      ["title", "subject_id", "grade", "book_series", "chapter", "lesson_no", "lesson_type"].includes(f)
    )
      loi[f] = d.message;
  }
  return Object.keys(loi).length ? loi : null;
}
