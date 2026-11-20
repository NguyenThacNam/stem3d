/** Thẻ Câu hỏi (ND04, UC 23): câu đang soạn, kiểm tra, chuyển sang đầu vào API 57, 58. Thuần, có test. */
import { ApiError } from "@/api/client";
import type { LessonPart, LessonQuestion, QuestionInput, QuestionType } from "@/api/editorLessons";

export const SO_PHUONG_AN = { it: 2, nhieu: 6, macDinh: 4 } as const;
export const NOI_DUNG_TOI_DA = 2000;
export const PHUONG_AN_TOI_DA = 500;
export const DON_VI_TOI_DA = 30;

/** Câu đang soạn: giữ dạng chuỗi như trong ô nhập (số chưa đổi). `id` null là câu mới chưa lưu. */
export type CauNhap = {
  id: number | null;
  question_type: QuestionType;
  content: string;
  /** Câu trắc nghiệm: các phương án và vị trí phương án đúng. */
  options: string[];
  dapAn: number | null;
  /** Câu chọn bộ phận. */
  partId: number | null;
  /** Câu nhập số. */
  giaTri: string;
  donVi: string;
  saiSo: string;
};

/** Lỗi theo ô: `content`, `options`, `options.<i>`, `answer`, `tolerance`. */
export type LoiCau = Record<string, string>;

export function cauMoi(loai: QuestionType = "CHOICE"): CauNhap {
  return {
    id: null,
    question_type: loai,
    content: "",
    options: loai === "CHOICE" ? Array.from({ length: SO_PHUONG_AN.macDinh }, () => "") : [],
    dapAn: null,
    partId: null,
    giaTri: "",
    donVi: "",
    saiSo: "",
  };
}

function soNguyen(x: unknown): number | null {
  return typeof x === "number" && Number.isInteger(x) ? x : null;
}

/** Hiện số theo kiểu Việt Nam trong ô nhập (dấu phẩy thập phân). */
function chuSo(x: unknown): string {
  const n = typeof x === "number" ? x : typeof x === "string" ? Number(x) : NaN;
  return Number.isFinite(n) ? String(n).replace(".", ",") : "";
}

export function tuCauHoi(q: LessonQuestion): CauNhap {
  const c = { ...cauMoi(q.question_type), id: q.id, content: q.content };
  const a = (q.answer ?? {}) as Record<string, unknown>;
  if (q.question_type === "CHOICE") {
    c.options = Array.isArray(q.options) ? q.options.map(String) : [];
    c.dapAn = soNguyen(a.index);
  } else if (q.question_type === "PICK_PART") {
    c.options = [];
    c.partId = soNguyen(a.part_id);
  } else {
    c.options = [];
    const o = (q.options ?? {}) as Record<string, unknown>;
    c.donVi = typeof o.unit === "string" ? o.unit : "";
    c.giaTri = chuSo(a.value);
    c.saiSo = chuSo(q.tolerance);
  }
  return c;
}

/** Đọc số người dùng gõ: nhận dấu phẩy hoặc dấu chấm thập phân; bỏ khoảng trắng. Không phải số thì null. */
export function docSo(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Đổi loại câu: giữ nội dung, các ô của loại khác về mặc định. */
export function doiLoai(c: CauNhap, loai: QuestionType): CauNhap {
  if (c.question_type === loai) return c;
  return { ...cauMoi(loai), id: c.id, content: c.content };
}

/** Kiểm tra trước khi gửi (máy chủ kiểm tra lại). `parts`: bộ phận ĐÃ LƯU của bài. */
export function kiemTraCau(c: CauNhap, parts: LessonPart[]): LoiCau {
  const loi: LoiCau = {};
  const noiDung = c.content.trim();
  if (!noiDung) loi.content = "Hãy nhập nội dung câu hỏi";
  else if (noiDung.length > NOI_DUNG_TOI_DA)
    loi.content = `Nội dung dài quá ${NOI_DUNG_TOI_DA} ký tự, hãy rút gọn`;
  if (c.question_type === "CHOICE") {
    if (c.options.length < SO_PHUONG_AN.it || c.options.length > SO_PHUONG_AN.nhieu)
      loi.options = `Câu trắc nghiệm cần từ ${SO_PHUONG_AN.it} đến ${SO_PHUONG_AN.nhieu} phương án`;
    const daGap = new Set<string>();
    c.options.forEach((x, i) => {
      const t = x.trim();
      const khoa = t.normalize("NFC").toLocaleLowerCase("vi");
      if (!t) loi[`options.${i}`] = "Hãy nhập phương án hoặc bỏ phương án này";
      else if (t.length > PHUONG_AN_TOI_DA) loi[`options.${i}`] = `Dài quá ${PHUONG_AN_TOI_DA} ký tự`;
      else if (daGap.has(khoa)) loi[`options.${i}`] = "Trùng với phương án khác";
      daGap.add(khoa);
    });
    // UC 23 luồng phụ 3.1: chưa chọn đáp án đúng thì không cho lưu.
    if (c.dapAn === null || c.dapAn < 0 || c.dapAn >= c.options.length) loi.answer = "Hãy chọn đáp án đúng";
  } else if (c.question_type === "PICK_PART") {
    if (parts.length === 0) loi.answer = "Bài chưa gắn nhãn bộ phận nào. Hãy gắn nhãn ở thẻ Bộ phận trước";
    else if (c.partId === null || !parts.some((p) => p.id === c.partId)) loi.answer = "Hãy chọn bộ phận đúng";
  } else {
    if (docSo(c.giaTri) === null) loi.answer = "Hãy nhập đáp án là một số";
    const saiSo = docSo(c.saiSo);
    if (saiSo === null || saiSo < 0) loi.tolerance = "Hãy nhập sai số cho phép, từ 0 trở lên";
    if (c.donVi.trim().length > DON_VI_TOI_DA) loi.options = `Đơn vị dài quá ${DON_VI_TOI_DA} ký tự`;
  }
  return loi;
}

/** Gọi sau khi `kiemTraCau` không còn lỗi. */
export function thanhDauVaoCau(c: CauNhap): QuestionInput {
  const chung = { question_type: c.question_type, content: c.content.trim() };
  if (c.question_type === "CHOICE")
    return {
      ...chung,
      options: c.options.map((x) => x.trim()),
      answer: { index: c.dapAn ?? -1 },
      tolerance: null,
    };
  if (c.question_type === "PICK_PART")
    return { ...chung, options: null, answer: { part_id: c.partId ?? 0 }, tolerance: null };
  return {
    ...chung,
    options: c.donVi.trim() ? { unit: c.donVi.trim() } : null,
    answer: { value: docSo(c.giaTri) ?? NaN },
    tolerance: docSo(c.saiSo),
  };
}

/** Câu đang soạn khác câu đã lưu (câu mới chưa lưu luôn tính là khác khi đã nhập gì đó). */
export function khacDaLuu(c: CauNhap, q: LessonQuestion | null): boolean {
  const goc = q ? tuCauHoi(q) : cauMoi(c.question_type);
  // Ô số so theo giá trị (gõ "12.5" hay "12,5" là như nhau); ô trống / chưa phải số thì so chuỗi.
  const chuan = (x: CauNhap) => ({
    ...x,
    id: null,
    giaTri: docSo(x.giaTri) ?? x.giaTri.trim(),
    saiSo: docSo(x.saiSo) ?? x.saiSo.trim(),
  });
  return JSON.stringify(chuan(c)) !== JSON.stringify(chuan(goc));
}

/** Lỗi 422 của API 57, 58 → lỗi theo ô (các trường máy chủ trả trùng tên ô ở đây). */
export function loiCauTuMayChu(e: unknown): LoiCau | null {
  if (!(e instanceof ApiError) || e.status !== 422 || !Array.isArray(e.details)) return null;
  const loi: LoiCau = {};
  for (const d of e.details as { field?: string; message?: string }[])
    if (d.field && d.message && /^(content|options(\.\d+)?|answer|tolerance)$/.test(d.field))
      loi[d.field] = d.message;
  return Object.keys(loi).length ? loi : null;
}

/** Đổi thứ tự như máy chủ (API 58 với `sort_order`): chuyển câu `id` tới vị trí `viTri`, đánh số lại 0..n-1. */
export function chuyenCau(ds: LessonQuestion[], id: number, viTri: number): LessonQuestion[] {
  const conLai = ds.filter((q) => q.id !== id);
  const q = ds.find((x) => x.id === id);
  if (!q) return ds;
  conLai.splice(Math.max(0, Math.min(viTri, conLai.length)), 0, q);
  return conLai.map((x, i) => (x.sort_order === i ? x : { ...x, sort_order: i }));
}

/** Câu ngắn gọn cho danh sách: bỏ xuống dòng. */
export function tomTat(noiDung: string): string {
  return noiDung.replace(/\s+/g, " ").trim();
}
