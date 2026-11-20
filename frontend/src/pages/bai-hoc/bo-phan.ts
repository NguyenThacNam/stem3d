/** Thẻ Bộ phận (ND03, UC 22): dữ liệu đang soạn, kiểm tra, chuyển sang đầu vào API 56. Thuần, có test. */
import { ApiError } from "@/api/client";
import type { LessonPart, LessonPartInput } from "@/api/editorLessons";
import { type GocNhin, laGocNhin } from "@/components/mo-hinh-3d/tinh-toan";

export const NHAN_TOI_DA = 100;
export const CHU_THICH_TOI_DA = 1000;

export type BoPhanNhap = {
  /** Khóa trong danh sách (bộ phận chưa lưu chưa có id). */
  khoa: string;
  id: number | null;
  mesh_names: string[];
  label: string;
  description: string;
  camera_view: GocNhin | null;
};

/** Lỗi theo khóa bộ phận. */
export type LoiBoPhan = Record<string, string[]>;

let dem = 0;
export function khoaMoi(): string {
  dem += 1;
  return `moi-${dem}`;
}

export function tuDanhSach(parts: LessonPart[]): BoPhanNhap[] {
  return parts.map((p) => ({
    khoa: `id-${p.id}`,
    id: p.id,
    mesh_names: [...p.mesh_names],
    label: p.label,
    description: p.description ?? "",
    camera_view: laGocNhin(p.camera_view) ? p.camera_view : null,
  }));
}

/** Danh sách vừa lưu (cùng thứ tự với danh sách đã gửi) lấy lại khóa của danh sách đã gửi. */
export function giuKhoa(moi: BoPhanNhap[], daGui: BoPhanNhap[]): BoPhanNhap[] {
  return moi.map((p, i) => (daGui[i] ? { ...p, khoa: daGui[i].khoa } : p));
}

export function thanhDauVaoBoPhan(ds: BoPhanNhap[]): LessonPartInput[] {
  return ds.map((p) => ({
    ...(p.id === null ? {} : { id: p.id }),
    mesh_names: p.mesh_names,
    label: p.label.trim(),
    description: p.description.trim() || null,
    camera_view: p.camera_view,
  }));
}

/** Danh sách đang soạn khác với danh sách đã lưu trên máy chủ. */
export function khacDaLuu(ds: BoPhanNhap[], daLuu: LessonPart[]): boolean {
  return JSON.stringify(thanhDauVaoBoPhan(ds)) !== JSON.stringify(thanhDauVaoBoPhan(tuDanhSach(daLuu)));
}

/** Kiểm tra trước khi gửi (máy chủ kiểm tra lại y như vậy). `meshCo`: tên phần của mô hình đã lưu của bài. */
export function kiemTraBoPhan(ds: BoPhanNhap[], meshCo: readonly string[]): LoiBoPhan {
  const loi: LoiBoPhan = {};
  const them = (khoa: string, c: string) => (loi[khoa] ??= []).push(c);
  const co = new Set(meshCo);
  const nhanDaGap = new Set<string>();
  for (const p of ds) {
    const nhan = p.label.trim();
    if (!nhan) them(p.khoa, "Hãy nhập nhãn hiển thị");
    else if (nhan.length > NHAN_TOI_DA) them(p.khoa, `Nhãn dài quá ${NHAN_TOI_DA} ký tự, hãy rút gọn`);
    // Như máy chủ: chuẩn hóa NFC rồi so không phân biệt hoa thường.
    const khoaNhan = nhan.normalize("NFC").toLocaleLowerCase("vi");
    if (nhan && nhan.length <= NHAN_TOI_DA && nhanDaGap.has(khoaNhan))
      them(p.khoa, "Nhãn trùng với bộ phận khác, hãy đặt tên khác");
    nhanDaGap.add(khoaNhan);
    if (p.description.trim().length > CHU_THICH_TOI_DA)
      them(p.khoa, `Chú thích dài quá ${CHU_THICH_TOI_DA} ký tự, hãy rút gọn`);
    if (p.mesh_names.length === 0) them(p.khoa, "Hãy chọn ít nhất một phần trên mô hình");
    const thieu = p.mesh_names.filter((t) => !co.has(t)).length;
    if (thieu) them(p.khoa, `${thieu} phần không còn trong mô hình, hãy bỏ các phần được tô đỏ`);
  }
  return loi;
}

/** Lỗi 422 của API 56 (`parts.<i>.<trường>`) → lỗi theo khóa bộ phận. Không nhận ra được thì null. */
export function loiBoPhanTuMayChu(e: unknown, ds: BoPhanNhap[]): LoiBoPhan | null {
  if (!(e instanceof ApiError) || e.status !== 422 || !Array.isArray(e.details)) return null;
  const loi: LoiBoPhan = {};
  for (const d of e.details as { field?: string; message?: string }[]) {
    const m = /^parts\.(\d+)(?:\.|$)/.exec(d.field ?? "");
    const p = m ? ds[Number(m[1])] : undefined;
    if (p && d.message) (loi[p.khoa] ??= []).push(d.message);
  }
  return Object.keys(loi).length ? loi : null;
}

/**
 * Bấm một phần trên mô hình (Hình 3-11: "bấm vào một phần để gắn nhãn, giữ Shift để chọn nhiều phần").
 * - Không Shift: phần đã thuộc bộ phận nào thì chọn bộ phận đó; chưa thuộc thì tạo bộ phận mới chứa phần này.
 * - Có Shift khi đang chọn một bộ phận: thêm phần vào bộ phận đó (lấy ra khỏi bộ phận cũ), bấm lại thì bỏ ra.
 * - Bấm nền (`ten` null) không Shift: bỏ chọn.
 */
export function bamPhan(
  ds: BoPhanNhap[],
  dangChon: string | null,
  ten: string | null,
  giuShift: boolean,
): { ds: BoPhanNhap[]; dangChon: string | null } {
  if (ten === null) return { ds, dangChon: giuShift ? dangChon : null };
  const chu = ds.find((p) => p.mesh_names.includes(ten));
  const hienTai = dangChon ? ds.find((p) => p.khoa === dangChon) : undefined;
  if (!giuShift || !hienTai) {
    if (chu) return { ds, dangChon: chu.khoa };
    const moi: BoPhanNhap = {
      khoa: khoaMoi(),
      id: null,
      mesh_names: [ten],
      label: "",
      description: "",
      camera_view: null,
    };
    return { ds: [...ds, moi], dangChon: moi.khoa };
  }
  if (chu === hienTai)
    return {
      ds: ds.map((p) => (p === hienTai ? { ...p, mesh_names: p.mesh_names.filter((t) => t !== ten) } : p)),
      dangChon,
    };
  return {
    ds: ds.map((p) =>
      p === hienTai
        ? { ...p, mesh_names: [...p.mesh_names, ten] }
        : p === chu
          ? { ...p, mesh_names: p.mesh_names.filter((t) => t !== ten) }
          : p,
    ),
    dangChon,
  };
}

/** Chuyển bộ phận ở vị trí `tu` tới vị trí `den` (kéo thả, phím Alt + mũi tên). */
export function diChuyen<T>(ds: T[], tu: number, den: number): T[] {
  if (tu === den || tu < 0 || tu >= ds.length || den < 0 || den >= ds.length) return ds;
  const kq = [...ds];
  const [x] = kq.splice(tu, 1);
  kq.splice(den, 0, x);
  return kq;
}

/** Các phần của mô hình chưa thuộc bộ phận nào, theo thứ tự trong file. */
export function phanChuaGan(ds: BoPhanNhap[], meshCo: readonly string[]): string[] {
  const daGan = new Set(ds.flatMap((p) => p.mesh_names));
  return meshCo.filter((t) => !daGan.has(t));
}
