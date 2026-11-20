/**
 * Phần tính toán thuần của khung 3D (không cần WebGL) – tách riêng để viết test.
 */
import type { Material, Object3D, Texture } from "three";
import { Line, Mesh, Points } from "three";

export type ThongKeMoHinh = {
  soMesh: number;
  soTamGiac: number;
  /** Tên các mesh theo thứ tự trong file; BH01, ND03 dùng tên này để gắn nhãn bộ phận. */
  tenMesh: string[];
};

/**
 * Khoảng cách từ camera tới tâm mô hình để cả khối cầu bao (bán kính `banKinh`) nằm trọn trong khung,
 * với góc nhìn dọc `fovDocDo` (độ) và tỉ lệ khung `tiLe` (rộng / cao). `le` > 1 chừa khoảng trống quanh mô hình.
 */
export function khoangCachVuaKhung(banKinh: number, fovDocDo: number, tiLe: number, le = 1.15): number {
  if (!(banKinh > 0) || !(tiLe > 0)) return 1;
  const fovDoc = (fovDocDo * Math.PI) / 180;
  const fovNgang = 2 * Math.atan(Math.tan(fovDoc / 2) * tiLe);
  const fovHep = Math.min(fovDoc, fovNgang);
  return (banKinh / Math.sin(fovHep / 2)) * le;
}

/** Đếm mesh và tam giác (geometry có index thì tính theo index, không thì theo số đỉnh). */
export function thongKeMoHinh(goc: Object3D): ThongKeMoHinh {
  const ketQua: ThongKeMoHinh = { soMesh: 0, soTamGiac: 0, tenMesh: [] };
  goc.traverse((vat) => {
    if (!(vat instanceof Mesh)) return;
    const hinh = vat.geometry;
    const soDinh = hinh.index ? hinh.index.count : (hinh.getAttribute("position")?.count ?? 0);
    ketQua.soMesh += 1;
    ketQua.soTamGiac += Math.floor(soDinh / 3);
    ketQua.tenMesh.push(vat.name || "(không tên)");
  });
  return ketQua;
}

function laTexture(x: unknown): x is Texture {
  return typeof x === "object" && x !== null && (x as Texture).isTexture === true;
}

/**
 * Giải phóng bộ nhớ đồ họa của mô hình (geometry, vật liệu, texture). Gọi khi rời trang hoặc đổi mô hình;
 * không gọi thì mỗi lần mở bài mới lại giữ thêm bộ nhớ – máy yếu sẽ chậm dần (BH02).
 */
export function giaiPhong(goc: Object3D): void {
  const daGiaiPhong = new Set<object>();
  const mot = (x: { dispose: () => void }) => {
    if (daGiaiPhong.has(x)) return;
    daGiaiPhong.add(x);
    x.dispose();
  };
  goc.traverse((vat) => {
    // GLB có thể chứa cả điểm (Points) và đường (Line, LineSegments), không chỉ mesh.
    if (!(vat instanceof Mesh || vat instanceof Points || vat instanceof Line)) return;
    mot(vat.geometry);
    const dsVatLieu: Material[] = Array.isArray(vat.material) ? vat.material : [vat.material];
    for (const vl of dsVatLieu) {
      for (const giaTri of Object.values(vl)) if (laTexture(giaTri)) mot(giaTri);
      mot(vl);
    }
  });
}

/** Phần trăm đã tải; máy chủ không báo tổng dung lượng thì trả null (hiện "Đang tải" không kèm số). */
export function phanTramDaTai(daTai: number, tong: number): number | null {
  if (!(tong > 0)) return null;
  return Math.min(100, Math.max(0, Math.round((daTai / tong) * 100)));
}

/** Đếm số khung hình mỗi giây trong cửa sổ trượt `cuaSoMs` mili giây gần nhất. */
export class DemKhungHinh {
  private moc: number[] = [];
  constructor(private readonly cuaSoMs = 1000) {}

  ghi(thoiDiemMs: number): void {
    this.moc.push(thoiDiemMs);
    const nguong = thoiDiemMs - this.cuaSoMs;
    while (this.moc.length > 0 && this.moc[0] <= nguong) this.moc.shift();
  }

  /** Số khung hình/giây; chưa đủ 2 mốc thì trả 0. */
  fps(): number {
    if (this.moc.length < 2) return 0;
    const khoang = this.moc[this.moc.length - 1] - this.moc[0];
    return khoang > 0 ? ((this.moc.length - 1) * 1000) / khoang : 0;
  }
}
