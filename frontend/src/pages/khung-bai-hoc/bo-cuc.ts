/**
 * Phần tính thuần của khung bài học (không cần trình duyệt, có test): chế độ theo loại bài, bộ phận tiếp theo,
 * xếp thẻ chú thích hai bên mô hình.
 */
import type { LessonView, LessonViewPart } from "@/api/types";

export type CheDo = "phim" | "kham-pha" | "thi-nghiem" | "kiem-tra";

export const TEN_CHE_DO: Record<CheDo, string> = {
  phim: "Phim",
  "kham-pha": "Tự khám phá",
  "thi-nghiem": "Thí nghiệm",
  "kiem-tra": "Kiểm tra",
};

/**
 * Các chế độ của bài theo Hình 3-5: Phim (ẩn khi bài không có kịch bản phim – UC5 luồng phụ 2.1), Tự khám phá,
 * Thí nghiệm (chỉ bài thí nghiệm), Kiểm tra.
 */
export function cacCheDo(bai: Pick<LessonView, "lesson_type" | "config">): CheDo[] {
  const ds: CheDo[] = [];
  if ((bai.config.film_script?.length ?? 0) > 0) ds.push("phim");
  ds.push("kham-pha");
  if (bai.lesson_type === "EXPERIMENT") ds.push("thi-nghiem");
  ds.push("kiem-tra");
  return ds;
}

/** Dòng phụ dưới tên bài, ví dụ "Khoa học tự nhiên 8 · Sinh học cơ thể người". */
export function dongPhu(bai: Pick<LessonView, "subject" | "grade" | "chapter">): string {
  return [`${bai.subject.name} ${bai.grade}`, bai.chapter].filter(Boolean).join(" · ");
}

/** Bộ phận theo thứ tự hiển thị (sort_order, rồi id). */
export function sapXepBoPhan(ds: LessonViewPart[]): LessonViewPart[] {
  return [...ds].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/** Nút "Bộ phận tiếp": bộ phận sau bộ phận đang xem, hết danh sách thì quay về đầu; chưa chọn thì lấy bộ phận đầu. */
export function boPhanTiep(dsDaSapXep: LessonViewPart[], idHienTai: number | null): number | null {
  if (dsDaSapXep.length === 0) return null;
  const i = dsDaSapXep.findIndex((p) => p.id === idHienTai);
  return dsDaSapXep[(i + 1) % dsDaSapXep.length].id;
}

/** Bài nhiều bộ phận quá thì chỉ hiện thẻ của bộ phận đang xem, các bộ phận khác chỉ còn chấm ghim. */
export const SO_THE_TOI_DA = 10;

export type DiemNeo = { id: number; x: number; y: number };
export type ViTriThe = { id: number; ben: "trai" | "phai"; y: number };

/**
 * Xếp thẻ chú thích thành hai cột hai bên mô hình (Hình 3-5): điểm neo nằm bên trái `giuaX` thì thẻ ở cột trái,
 * còn lại ở cột phải. Trong mỗi cột, thẻ đặt ngang điểm neo rồi đẩy xuống cho cách nhau ít nhất `khoangCach`;
 * tràn đáy thì đẩy ngược lên, không vượt `tren` / `duoi` (tọa độ tâm thẻ theo chiều dọc).
 */
export function xepChuThich(
  dsNeo: DiemNeo[],
  giuaX: number,
  khoangCach: number,
  tren: number,
  duoi: number,
): ViTriThe[] {
  const ketQua: ViTriThe[] = [];
  for (const ben of ["trai", "phai"] as const) {
    const cot = dsNeo
      .filter((n) => n.x < giuaX === (ben === "trai"))
      .sort((a, b) => a.y - b.y || a.id - b.id);
    const y = cot.map((n) => Math.min(duoi, Math.max(tren, n.y)));
    for (let i = 1; i < y.length; i++) y[i] = Math.max(y[i], y[i - 1] + khoangCach);
    if (y.length > 0) y[y.length - 1] = Math.min(y[y.length - 1], duoi);
    for (let i = y.length - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] - khoangCach);
    // Cột quá đông so với chiều cao khung: rải đều từ trên xuống dưới, giữ thứ tự (thẻ có thể sát nhau).
    if (y.length > 1 && y[0] < tren) {
      const buoc = (duoi - tren) / (y.length - 1);
      for (let i = 0; i < y.length; i++) y[i] = tren + i * buoc;
    }
    cot.forEach((n, i) => ketQua.push({ id: n.id, ben, y: y[i] }));
  }
  return ketQua;
}
