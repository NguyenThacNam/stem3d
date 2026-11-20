/**
 * Phần tính toán thuần của khung 3D (không cần WebGL) – tách riêng để viết test.
 */
import type { Material, Object3D, Texture } from "three";
import { Line, Mesh, Points } from "three";

export type ThongKeMoHinh = {
  soMesh: number;
  soTamGiac: number;
  /**
   * Tên các phần theo thứ tự trong file, không trùng – CÙNG cách với bộ đọc GLB phía máy chủ (`mesh_names`,
   * backend/app/services/glb.py) để BH01, ND03 so được với `lesson_parts.mesh_names`.
   */
  tenMesh: string[];
  /** Số phần có hình mà cả node lẫn mesh đều không có tên (không gắn nhãn được) – như `unnamed_meshes` của máy chủ. */
  soKhongTen: number;
};

/** Khóa trong `userData` của mỗi đối tượng có hình chứa tên phần gốc (do `ganTenPhan` gán). */
export const KHOA_TEN_PHAN = "tenPhan";
/** Khóa trong `userData` chứa chỉ số node của phần (để đếm mỗi node một lần, như máy chủ). */
export const KHOA_NODE = "chiSoNode";

/** Một phần JSON của file glTF đủ để lấy tên: `nodes[i].name`, `nodes[i].mesh`, `meshes[j].name`. */
export type JsonTenGltf = {
  nodes?: { name?: unknown; mesh?: number }[];
  meshes?: { name?: unknown }[];
};

/** Tham chiếu GLTFLoader gắn cho mỗi đối tượng (`parser.associations`): chỉ số node / mesh trong file. */
export type ThamChieuGltf = { nodes?: number; meshes?: number };

/** Đối tượng có hình: mặt (Mesh), điểm (Points), đường (Line, LineSegments…) – primitive glTF mọi `mode`. */
export function coHinh(vat: Object3D): vat is Mesh | Points | Line {
  return vat instanceof Mesh || vat instanceof Points || vat instanceof Line;
}

/** Tên hợp lệ như máy chủ: vắng, rỗng hoặc toàn khoảng trắng → "" (không tên). Giữ nguyên chuỗi gốc. */
function tenHopLe(ten: unknown): string {
  return typeof ten === "string" && ten.trim() ? ten : "";
}

/**
 * Gán tên phần GỐC (như ghi trong file) vào `userData[KHOA_TEN_PHAN]` của từng đối tượng có hình.
 *
 * Không dùng `Object3D.name`: GLTFLoader đổi tên (khoảng trắng → "_", bỏ ký tự `[]:./`, thêm hậu tố khi trùng) và
 * tự đặt "mesh_<số>" cho phần không tên, nên không khớp tên máy chủ đọc từ file. Quy tắc giống máy chủ
 * (`backend/app/services/glb.py`, `_dem_mesh`): mỗi node có mesh là MỘT phần (mọi primitive, mọi `mode`),
 * tên = tên node, node không tên thì tên mesh.
 *
 * Cấu trúc GLTFLoader tạo: node một primitive → chính đối tượng là Mesh / Points / Line; nhiều primitive → Group mang
 * tham chiếu node, primitive là con; node vừa có camera vừa có mesh → thêm một Group bọc. Vì vậy lấy mọi đối tượng
 * có hình bên dưới node, dừng ở node con (đối tượng có tham chiếu `nodes` riêng).
 */
export function ganTenPhan(goc: Object3D, json: JsonTenGltf, thamChieu: Map<Object3D, ThamChieuGltf>): void {
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const cuaNode = (vat: Object3D, ketQua: Object3D[]) => {
    if (coHinh(vat)) ketQua.push(vat);
    for (const con of vat.children) if (thamChieu.get(con)?.nodes === undefined) cuaNode(con, ketQua);
    return ketQua;
  };
  goc.traverse((vat) => {
    const chiSoNode = thamChieu.get(vat)?.nodes;
    if (chiSoNode === undefined) return;
    const node = nodes[chiSoNode];
    if (!node || node.mesh === undefined) return;
    const ten = tenHopLe(node.name) || tenHopLe(meshes[node.mesh]?.name);
    for (const m of cuaNode(vat, [])) {
      m.userData[KHOA_TEN_PHAN] = ten;
      m.userData[KHOA_NODE] = chiSoNode;
    }
  });
}

/** Tên phần gốc của một đối tượng có hình; mô hình không qua `ganTenPhan` (tự dựng bằng code) thì dùng `name`. */
export function tenPhanCua(vat: Object3D): string {
  const ten: unknown = vat.userData[KHOA_TEN_PHAN];
  return typeof ten === "string" ? ten : tenHopLe(vat.name);
}

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
 * Đếm Mesh và tam giác (geometry có index thì tính theo index, không thì theo số đỉnh); liệt kê tên phần không trùng
 * (gồm cả phần là điểm, đường) và đếm phần không tên – mỗi node một lần như `unnamed_meshes` của máy chủ (mesh nhiều
 * primitive là nhiều Mesh nhưng một phần).
 */
export function thongKeMoHinh(goc: Object3D): ThongKeMoHinh {
  const ketQua: ThongKeMoHinh = { soMesh: 0, soTamGiac: 0, tenMesh: [], soKhongTen: 0 };
  const daCo = new Set<string>();
  const nodeKhongTen = new Set<unknown>();
  goc.traverse((vat) => {
    if (!coHinh(vat)) return;
    if (vat instanceof Mesh) {
      const hinh = vat.geometry;
      const soDinh = hinh.index ? hinh.index.count : (hinh.getAttribute("position")?.count ?? 0);
      ketQua.soMesh += 1;
      ketQua.soTamGiac += Math.floor(soDinh / 3);
    }
    const ten = tenPhanCua(vat);
    if (!ten) {
      // Mô hình không qua ganTenPhan thì không có chỉ số node: mỗi đối tượng là một phần.
      const node: unknown = vat.userData[KHOA_NODE];
      nodeKhongTen.add(typeof node === "number" ? node : vat);
    } else if (!daCo.has(ten)) {
      daCo.add(ten);
      ketQua.tenMesh.push(ten);
    }
  });
  ketQua.soKhongTen = nodeKhongTen.size;
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
    // texture.dispose() chỉ trả bộ nhớ GPU; ảnh đã giải mã (ImageBitmap – GLTFLoader dùng mặc định) không tự được
    // dọn, phải đóng riêng, không thì mỗi lần đổi mô hình rò thêm hàng chục – hàng trăm MB với texture 4096 px.
    if (laTexture(x)) {
      const anh: unknown = x.image;
      if (typeof ImageBitmap !== "undefined" && anh instanceof ImageBitmap) anh.close();
    }
  };
  goc.traverse((vat) => {
    // GLB có thể chứa cả điểm (Points) và đường (Line, LineSegments), không chỉ mesh.
    if (!coHinh(vat)) return;
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
