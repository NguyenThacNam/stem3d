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

// ---------------------------------------------------------------- gắn nhãn bộ phận (ND03, BH01)
/** Phần JSON của file glTF cần để lấy tên phần (GLTFLoader để ở `gltf.parser.json`). */
export type GltfJson = {
  nodes?: { name?: unknown; mesh?: unknown }[];
  meshes?: { name?: unknown }[];
};

function tenHopLe(x: unknown): string | null {
  return typeof x === "string" && x.trim() ? x : null;
}

/**
 * Tên gốc (chưa bị Three.js đổi) của node có hình số `nodeIndex`: tên node, node không tên thì tên mesh; không có
 * tên nào thì null. Phải khớp cách máy chủ lấy `assets.mesh_names` (backend `app/services/glb.py`), vì nhãn bộ phận
 * lưu theo tên này.
 */
export function tenPhanGoc(json: GltfJson, nodeIndex: number): string | null {
  const node = json.nodes?.[nodeIndex];
  if (!node) return null;
  const tenNode = tenHopLe(node.name);
  if (tenNode) return tenNode;
  return typeof node.mesh === "number" ? tenHopLe(json.meshes?.[node.mesh]?.name) : null;
}

/**
 * Gắn tên phần cho từng Mesh của mô hình. Node có mesh nhiều primitive thành một Group chứa nhiều Mesh con, nên
 * mỗi Mesh đi ngược lên cha tới đối tượng đầu tiên GLTFLoader ghi số node (`parser.associations`).
 */
export function banDoTenPhan(
  goc: Object3D,
  associations: Map<unknown, { nodes?: number }>,
  json: GltfJson,
): Map<Mesh, string> {
  const ketQua = new Map<Mesh, string>();
  goc.traverse((vat) => {
    if (!(vat instanceof Mesh)) return;
    for (let x: Object3D | null = vat; x && x !== goc.parent; x = x.parent) {
      const so = associations.get(x)?.nodes;
      if (so === undefined) continue;
      const ten = tenPhanGoc(json, so);
      if (ten) ketQua.set(vat, ten);
      return;
    }
  });
  return ketQua;
}

/**
 * Góc camera lưu cho một bộ phận (`lesson_parts.camera_view`), theo tọa độ GỐC của file GLB – trước khi khung 3D
 * dời tâm mô hình về gốc tọa độ. Nhờ vậy khung khác (BH01) canh mô hình cách khác vẫn dùng lại được.
 */
export type GocNhin = { position: [number, number, number]; target: [number, number, number] };

function laBoBaSo(x: unknown): x is [number, number, number] {
  return Array.isArray(x) && x.length === 3 && x.every((s) => typeof s === "number" && Number.isFinite(s));
}

export function laGocNhin(x: unknown): x is GocNhin {
  if (typeof x !== "object" || x === null) return false;
  const g = x as Record<string, unknown>;
  return laBoBaSo(g.position) && laBoBaSo(g.target);
}

/** Đường cong chậm – nhanh – chậm cho camera bay tới góc nhìn; `t` ngoài [0, 1] được kẹp lại. */
export function emDan(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
