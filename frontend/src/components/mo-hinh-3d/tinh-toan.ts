/**
 * Phần tính toán thuần của khung 3D (không cần WebGL) – tách riêng để viết test.
 */
import type { Material, Object3D, Texture } from "three";
import { Box3, Line, Mesh, Points, PropertyBinding, Sphere, Vector3 } from "three";

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

/**
 * Giới hạn camera theo cỡ mô hình (bán kính `banKinh`, đơn vị gì cũng được – file GLB tính bằng mm hay m đều đúng):
 * mặt cắt gần / xa đủ rộng để không cắt mô hình, khoảng phóng to từ sát mặt mô hình tới 3 lần khoảng nhìn vừa khung.
 */
export function gioiHanCamera(
  banKinh: number,
  fovDocDo: number,
  tiLe: number,
): { near: number; far: number; minDistance: number; maxDistance: number } {
  const vua = khoangCachVuaKhung(banKinh, fovDocDo, tiLe);
  return { near: vua / 100, far: vua * 100, minDistance: banKinh * 0.8, maxDistance: vua * 3 };
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

/**
 * Quy tắc tọa độ dùng chung cho xem bài (BH01) và gắn nhãn (ND03): dời gốc mô hình sao cho TÂM KHỐI BAO của toàn bộ
 * mô hình nằm ở gốc tọa độ, KHÔNG co giãn, không xoay. `camera_view` của bài và bộ phận lưu theo hệ tọa độ này, nên
 * hai màn hình phải dựng mô hình bằng đúng hàm này thì góc nhìn mới khớp.
 * Gọi trên mô hình vừa tải (gốc chưa gắn vào cha có biến đổi). Trả null nếu mô hình không có hình nào.
 */
export function duaTamVeGoc(goc: Object3D): { banKinh: number } | null {
  goc.updateWorldMatrix(true, true);
  const hop = new Box3().setFromObject(goc);
  if (hop.isEmpty()) return null;
  goc.position.sub(hop.getCenter(new Vector3()));
  goc.updateWorldMatrix(true, true);
  return { banKinh: hop.getBoundingSphere(new Sphere()).radius };
}

/**
 * Tên mesh như Three.js đặt khi đọc GLB: khoảng trắng thành "_", bỏ các ký tự [ ] . : /
 * (`PropertyBinding.sanitizeNodeName`). `mesh_names` trong CSDL giữ tên gốc trong file; so khớp qua hàm này.
 */
export function chuanHoaTenMesh(ten: string): string {
  return PropertyBinding.sanitizeNodeName(ten);
}

/**
 * Tìm mesh theo danh sách tên: đối tượng nào có tên khớp (sau chuẩn hóa) thì lấy nó và mọi mesh con
 * (một node GLB có nhiều phần hình được Three.js dựng thành nhóm). Trả kèm các tên không tìm thấy.
 */
export function timMeshTheoTen(goc: Object3D, dsTen: string[]): { meshes: Mesh[]; thieu: string[] } {
  const canTim = new Map(dsTen.map((t) => [chuanHoaTenMesh(t), t]));
  const daThay = new Set<string>();
  const meshes = new Set<Mesh>();
  goc.traverse((vat) => {
    if (!canTim.has(vat.name)) return;
    daThay.add(vat.name);
    vat.traverse((con) => {
      if (con instanceof Mesh) meshes.add(con);
    });
  });
  const thieu = [...canTim].filter(([chuan]) => !daThay.has(chuan)).map(([, goc]) => goc);
  return { meshes: [...meshes], thieu };
}

/** Chuyển động chậm – nhanh – chậm cho tách bộ phận, camera bay; t trong [0, 1]. */
export function chuyenDongMem(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Hướng tách một bộ phận: từ tâm mô hình ra tâm bộ phận. Bộ phận nằm gần tâm (dưới 5 % bán kính mô hình) thì
 * dùng `huongDuPhong` (hướng về phía camera) để bộ phận vẫn tách ra trước mặt người xem.
 */
export function huongTach(tamBoPhan: Vector3, banKinhMoHinh: number, huongDuPhong: Vector3): Vector3 {
  if (tamBoPhan.length() < 0.05 * banKinhMoHinh) return huongDuPhong.clone().normalize();
  return tamBoPhan.clone().normalize();
}

/** Khoảng tách bộ phận khỏi chỗ cũ: 25 % bán kính mô hình (TIEN_DO.md mục 5). */
export const TI_LE_TACH = 0.25;

/**
 * Màn gắn nhãn (ND03): phần bị bấm ứng với tên nào trong `mesh_names` của mô hình (tên gốc trong file). Đi ngược từ
 * đối tượng trúng lên cha, gặp đối tượng đầu tiên có tên khớp (qua `chuanHoaTenMesh`) thì trả tên gốc đó – cùng quy
 * tắc với `timMeshTheoTen`, nên phần gắn nhãn ở màn soạn đúng là phần học sinh thấy. Không khớp tên nào thì null.
 */
export function tenPhanCuaVat(vat: Object3D | null, meshNames: readonly string[]): string | null {
  const theoTen = new Map(meshNames.map((t) => [chuanHoaTenMesh(t), t]));
  for (let x = vat; x; x = x.parent) {
    const ten = theoTen.get(x.name);
    if (ten !== undefined) return ten;
  }
  return null;
}
