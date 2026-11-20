/**
 * Lõi 3D của khung bài học (BH01), không phụ thuộc React: dựng cảnh, tải GLB, xoay / phóng to, chọn bộ phận bằng tia
 * chiếu, làm nổi bật, tách bộ phận ra và lắp lại, camera bay tới góc nhìn, tính điểm neo trên màn hình cho thẻ chú thích.
 * `MoHinh3D` (trang thử NT08) và `KhungBaiHoc` cùng dùng lớp này. LH05 (điều khiển lớp) gọi `chon`, `datGocNhin`,
 * `khoaThaoTac` từ bên ngoài.
 *
 * Tọa độ: mô hình được đưa tâm khối bao về gốc, không co giãn (`duaTamVeGoc`) – `camera_view` lưu theo hệ này.
 */
import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CameraView } from "@/api/types";
import {
  chuyenDongMem,
  DemKhungHinh,
  duaTamVeGoc,
  giaiPhong,
  gioiHanCamera,
  huongTach,
  khoangCachVuaKhung,
  phanTramDaTai,
  TI_LE_TACH,
  timMeshTheoTen,
} from "./tinh-toan";

export type NguonMoHinh = { loai: "url"; url: string; ten: string } | { loai: "tep"; tep: File; ten: string };

/** Lỗi khi tải: `mang` (thử lại có thể được), `tep` (file hỏng), `rong` (file không có hình), `webgl`. */
export class LoiMoHinh extends Error {
  constructor(
    readonly loai: "mang" | "tep" | "rong" | "webgl",
    nguyenNhan?: unknown,
  ) {
    super(loai, { cause: nguyenNhan });
  }
}

export type SuKienCanh = {
  /** Người dùng bấm vào mô hình: id bộ phận, hoặc null khi bấm vùng trống. */
  onBam?: (idBoPhan: number | null) => void;
  /**
   * Màn gắn nhãn (ND03): báo đối tượng trúng đầu tiên, kể cả phần chưa gắn nhãn (null khi bấm vùng trống), và có
   * giữ Shift không. Có hàm này thì `onBam` không được gọi.
   */
  onBamVat?: (vat: Object3D | null, giuShift: boolean) => void;
  /** Gọi sau mỗi khung hình đã vẽ (để cập nhật thẻ chú thích theo camera). */
  onKhungHinh?: () => void;
  /** Khoảng 2 lần mỗi giây. */
  onFps?: (fps: number) => void;
};

export type NeoBoPhan = { id: number; x: number; y: number; truocCamera: boolean };

const FOV = 45;
const MAU_NHAN = new Color(0x0e7a55); // màu nhấn của dự án (#0e7a55)
const DO_SANG_NHAN = 0.35;
const DO_MO_BO_PHAN_KHAC = 0.35;
const THOI_GIAN_TACH = 0.4; // giây
const THOI_GIAN_BAY = 0.6; // giây
const BUOC_XOAY_PHIM = Math.PI / 24; // 7,5° mỗi lần bấm phím mũi tên
const NGUONG_BAM_PX = 5; // di chuột quá ngưỡng này là kéo xoay, không phải bấm chọn

type GocVatLieu = { opacity: number; transparent: boolean; depthWrite: boolean; emissive: Color | null };

type BoPhan = {
  id: number;
  meshes: Mesh[];
  /** Tâm khối bao của bộ phận lúc chưa tách (hệ tọa độ mô hình) – để tính hướng tách. */
  tam: Vector3;
  /** Điểm gắn chấm ghim: tâm mesh gần tâm bộ phận nhất (bộ phận gồm nhiều mesh rời, như hai mắt, thì tâm khối bao
   * có thể nằm giữa khoảng trống). */
  neo: Vector3;
  banKinh: number;
  viTriGoc: Map<Mesh, Vector3>;
  /** Độ dời của từng mesh (hệ tọa độ của cha mesh) khi tách hết. */
  doiCucBo: Map<Mesh, Vector3>;
  /** Độ dời của tâm (hệ tọa độ mô hình) khi tách hết. */
  doiTam: Vector3;
  tach: number; // 0 = ở chỗ cũ, 1 = đã tách hết
  dich: 0 | 1;
};

type ChuyenCamera = { tuViTri: Vector3; tuDich: Vector3; denViTri: Vector3; denDich: Vector3; t: number };

export class CanhBaiHoc {
  readonly camera = new PerspectiveCamera(FOV, 1, 0.01, 1000);
  private readonly renderer: WebGLRenderer;
  private readonly canh = new Scene();
  private readonly dieuKhien: OrbitControls;
  private readonly theoDoiKichThuoc: ResizeObserver;
  private readonly dem = new DemKhungHinh();
  private readonly tia = new Raycaster();
  private moHinh: Object3D | null = null;
  private banKinh = 1;
  private gocTongQuan: CameraView | null = null;
  private boPhan = new Map<number, BoPhan>();
  private meshThuocBoPhan = new Map<Mesh, number>();
  private gocVatLieu = new Map<Material, GocVatLieu>();
  private dangChon: number | null = null;
  private chuyenCamera: ChuyenCamera | null = null;
  private lanTruoc = 0;
  private lanBaoFps = 0;
  private bamXuong: { x: number; y: number } | null = null;
  private daHuy = false;

  constructor(
    private readonly khung: HTMLElement,
    private readonly suKien: SuKienCanh = {},
  ) {
    try {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch (loi) {
      throw new LoiMoHinh("webgl", loi);
    }
    // Màn hình mật độ cao: giới hạn 2× để máy yếu không phải vẽ gấp 9 lần điểm ảnh.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // trong suốt để thấy nền lưới ô li
    const canvas = this.renderer.domElement;
    canvas.className = "block size-full touch-none";
    khung.appendChild(canvas);

    this.canh.add(new HemisphereLight(0xffffff, 0x8a8f8c, 1.6));
    const denChinh = new DirectionalLight(0xffffff, 1.6);
    denChinh.position.set(2, 3, 4);
    this.camera.add(denChinh); // đèn đi theo camera: xoay tới đâu mặt nhìn thấy cũng đủ sáng
    this.canh.add(this.camera);

    this.dieuKhien = new OrbitControls(this.camera, canvas);
    this.dieuKhien.enableDamping = true;
    this.dieuKhien.enablePan = false; // Hình 3-5: chỉ xoay và phóng to
    this.dieuKhien.addEventListener("start", () => (this.chuyenCamera = null)); // người dùng tự xoay thì dừng bay

    canvas.addEventListener("pointerdown", this.khiBamXuong);
    canvas.addEventListener("pointerup", this.khiThaRa);

    this.theoDoiKichThuoc = new ResizeObserver(() => this.capNhatKichThuoc());
    this.theoDoiKichThuoc.observe(khung);
    this.capNhatKichThuoc();
    this.renderer.setAnimationLoop(this.ve);
  }

  /** Tải mô hình; trả về gốc mô hình đã đưa tâm về gốc tọa độ. Ném `LoiMoHinh` khi lỗi. */
  async tai(
    nguon: NguonMoHinh,
    onTienDo?: (phanTram: number | null, tong: number | null) => void,
  ): Promise<Object3D> {
    const taiMoHinh = new GLTFLoader();
    let gltf: GLTF;
    if (nguon.loai === "url") {
      try {
        gltf = await taiMoHinh.loadAsync(nguon.url, (e) => {
          if (!this.daHuy) onTienDo?.(phanTramDaTai(e.loaded, e.total), e.total > 0 ? e.total : null);
        });
      } catch (loi) {
        throw new LoiMoHinh("mang", loi);
      }
    } else {
      try {
        // File trên máy: đọc bằng parse, không tạo đường dẫn blob: cho cả file GLB.
        gltf = await taiMoHinh.parseAsync(await nguon.tep.arrayBuffer(), "");
      } catch (loi) {
        throw new LoiMoHinh("tep", loi);
      }
    }
    const goc = gltf.scene;
    if (this.daHuy) {
      giaiPhong(goc);
      throw new LoiMoHinh("mang", new Error("Đã hủy"));
    }
    const kq = duaTamVeGoc(goc);
    if (!kq) {
      giaiPhong(goc);
      throw new LoiMoHinh("rong");
    }
    this.banKinh = kq.banKinh;
    this.datGioiHanCamera();
    this.chuanBiVatLieu(goc);
    this.canh.add(goc);
    this.moHinh = goc;
    this.datGocNhin(this.gocTongQuanHieuLuc(), false);
    return goc;
  }

  /** Góc nhìn tổng quan của bài (`config.camera_view`); null thì tự canh vừa khung. */
  datGocTongQuan(goc: CameraView | null): void {
    this.gocTongQuan = goc;
  }

  /**
   * Khai báo bộ phận của bài: mỗi bộ phận gồm các mesh có tên trong `mesh_names`. Trả về tên mesh không tìm thấy
   * trong mô hình (để báo người soạn bài); bộ phận không có mesh nào vẫn hiện trong danh sách nhưng không tách được.
   */
  datBoPhan(ds: { id: number; mesh_names: string[] }[]): string[] {
    if (!this.moHinh) return [];
    this.chon(null, false);
    for (const bp of this.boPhan.values()) for (const [m, p] of bp.viTriGoc) m.position.copy(p); // lắp hết về chỗ cũ
    this.boPhan.clear();
    this.meshThuocBoPhan.clear();
    const thieu: string[] = [];
    for (const bp of ds) {
      const tim = timMeshTheoTen(this.moHinh, bp.mesh_names);
      thieu.push(...tim.thieu);
      const meshes = tim.meshes.filter((m) => !this.meshThuocBoPhan.has(m)); // một mesh chỉ thuộc một bộ phận
      if (meshes.length === 0) continue;
      const hop = khoiBao(meshes);
      this.boPhan.set(bp.id, {
        id: bp.id,
        meshes,
        tam: hop.tam,
        neo: diemNeo(meshes, hop.tam),
        banKinh: hop.banKinh,
        viTriGoc: new Map(meshes.map((m) => [m, m.position.clone()])),
        doiCucBo: new Map(),
        doiTam: new Vector3(),
        tach: 0,
        dich: 0,
      });
      for (const m of meshes) this.meshThuocBoPhan.set(m, bp.id);
    }
    this.apDungVatLieu();
    return thieu;
  }

  /** Bộ phận có mesh trong mô hình (chọn được trên mô hình). */
  coTrenMoHinh(id: number): boolean {
    return this.boPhan.has(id);
  }

  /**
   * Chọn bộ phận: làm nổi bật, tách ra, camera bay tới `gocNhin` (hoặc tự canh). null = bỏ chọn, lắp bộ phận về chỗ cũ.
   * `bay = false` thì giữ nguyên camera.
   */
  chon(id: number | null, bay = true, gocNhin: CameraView | null = null): void {
    const moi = id !== null && this.boPhan.has(id) ? id : null;
    if (this.dangChon !== null && this.dangChon !== moi) this.boPhan.get(this.dangChon)!.dich = 0;
    this.dangChon = moi;
    if (moi !== null) {
      const bp = this.boPhan.get(moi)!;
      if (bp.tach === 0) this.tinhDoTach(bp);
      bp.dich = 1;
      if (bay) this.datGocNhin(gocNhin ?? this.gocNhinBoPhan(bp), true);
    } else if (bay) {
      this.datGocNhin(this.gocTongQuanHieuLuc(), true);
    }
    this.apDungVatLieu();
  }

  /** Đưa camera về góc tổng quan, giữ bộ phận đang chọn. */
  datLaiGocNhin(): void {
    this.datGocNhin(this.gocTongQuanHieuLuc(), true);
  }

  /** Góc nhìn hiện tại (để ND03 "Lưu góc nhìn", LH05 gửi cho học sinh). */
  gocNhinHienTai(): CameraView {
    const p = this.camera.position;
    const t = this.dieuKhien.target;
    return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
  }

  datGocNhin(goc: CameraView, bay: boolean): void {
    const denViTri = new Vector3(...goc.position);
    const denDich = new Vector3(...goc.target);
    if (bay) {
      this.chuyenCamera = {
        tuViTri: this.camera.position.clone(),
        tuDich: this.dieuKhien.target.clone(),
        denViTri,
        denDich,
        t: 0,
      };
    } else {
      this.chuyenCamera = null;
      this.camera.position.copy(denViTri);
      this.dieuKhien.target.copy(denDich);
      this.dieuKhien.update();
    }
  }

  /** Xoay bằng bàn phím: `ngang`, `doc` là số bước (âm / dương). */
  xoay(ngang: number, doc: number): void {
    this.chuyenCamera = null;
    const tuongDoi = this.camera.position.clone().sub(this.dieuKhien.target);
    const cau = new Spherical().setFromVector3(tuongDoi);
    cau.theta -= ngang * BUOC_XOAY_PHIM;
    cau.phi = Math.min(Math.PI - 0.01, Math.max(0.01, cau.phi - doc * BUOC_XOAY_PHIM));
    this.camera.position.copy(this.dieuKhien.target).add(new Vector3().setFromSpherical(cau));
    this.dieuKhien.update();
  }

  /** Phóng to (`heSo` < 1) hoặc thu nhỏ (> 1) bằng bàn phím, trong giới hạn khoảng cách của điều khiển. */
  phongTo(heSo: number): void {
    this.chuyenCamera = null;
    const tuongDoi = this.camera.position.clone().sub(this.dieuKhien.target);
    const d = Math.min(
      this.dieuKhien.maxDistance,
      Math.max(this.dieuKhien.minDistance, tuongDoi.length() * heSo),
    );
    this.camera.position.copy(this.dieuKhien.target).add(tuongDoi.setLength(d));
    this.dieuKhien.update();
  }

  /** LH05: khi giáo viên điều khiển lớp, học sinh không tự xoay, không tự chọn được. */
  khoaThaoTac(khoa: boolean): void {
    this.dieuKhien.enabled = !khoa;
  }

  /** Vị trí trên màn hình (px, tính từ góc trên trái khung) của tâm từng bộ phận, theo trạng thái tách hiện tại. */
  neoBoPhan(): NeoBoPhan[] {
    const rong = this.khung.clientWidth;
    const cao = this.khung.clientHeight;
    const ds: NeoBoPhan[] = [];
    for (const bp of this.boPhan.values()) {
      const p = bp.neo.clone().addScaledVector(bp.doiTam, chuyenDongMem(bp.tach)).project(this.camera);
      ds.push({ id: bp.id, x: ((p.x + 1) / 2) * rong, y: ((1 - p.y) / 2) * cao, truocCamera: p.z < 1 });
    }
    return ds;
  }

  /** Mép trái / phải của mô hình trên màn hình (px) – để đặt cột thẻ chú thích sát hai bên mô hình. */
  bienNgangMoHinh(): { trai: number; phai: number } {
    const rong = this.khung.clientWidth;
    const tam = this.dieuKhien.target.clone().project(this.camera);
    const ben = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).setLength(this.banKinh);
    const p = this.dieuKhien.target.clone().add(ben).project(this.camera);
    const nuaRong = Math.abs(p.x - tam.x) * (rong / 2);
    const giua = ((tam.x + 1) / 2) * rong;
    return { trai: giua - nuaRong, phai: giua + nuaRong };
  }

  huy(): void {
    this.daHuy = true;
    this.theoDoiKichThuoc.disconnect();
    this.renderer.setAnimationLoop(null);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.khiBamXuong);
    canvas.removeEventListener("pointerup", this.khiThaRa);
    this.dieuKhien.dispose();
    if (this.moHinh) giaiPhong(this.moHinh);
    this.renderer.dispose();
    // Trình duyệt chỉ cho giữ khoảng 16 ngữ cảnh WebGL; trả lại ngay thay vì chờ dọn rác.
    this.renderer.forceContextLoss();
    canvas.remove();
  }

  /** Tên bộ xử lý đồ họa (ghi kèm số liệu đo); null nếu trình duyệt ẩn. */
  tenGpu(): string | null {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
  }

  // ---------------------------------------------------------------------------------------------------------------

  private ve = (t: number) => {
    const dt = this.lanTruoc === 0 ? 0 : Math.min(0.1, (t - this.lanTruoc) / 1000);
    this.lanTruoc = t;
    this.capNhatTach(dt);
    this.capNhatCamera(dt);
    this.dieuKhien.update();
    this.renderer.render(this.canh, this.camera);
    this.suKien.onKhungHinh?.();
    this.dem.ghi(t);
    if (t - this.lanBaoFps >= 500) {
      this.lanBaoFps = t;
      this.suKien.onFps?.(this.dem.fps());
    }
  };

  private capNhatKichThuoc() {
    const rong = this.khung.clientWidth;
    const cao = this.khung.clientHeight;
    if (rong === 0 || cao === 0) return;
    this.renderer.setSize(rong, cao, false);
    this.camera.aspect = rong / cao;
    if (this.moHinh) this.datGioiHanCamera(); // khung đổi tỉ lệ thì khoảng nhìn vừa khung cũng đổi
    this.camera.updateProjectionMatrix();
  }

  /** Mặt cắt gần / xa và khoảng phóng to theo cỡ mô hình (mô hình tính bằng mm hay m đều hiện đúng). */
  private datGioiHanCamera() {
    const gh = gioiHanCamera(this.banKinh, FOV, this.camera.aspect);
    this.camera.near = gh.near;
    this.camera.far = gh.far;
    this.camera.updateProjectionMatrix();
    this.dieuKhien.minDistance = gh.minDistance;
    this.dieuKhien.maxDistance = gh.maxDistance;
  }

  private gocTongQuanHieuLuc(): CameraView {
    if (this.gocTongQuan) return this.gocTongQuan;
    const d = khoangCachVuaKhung(this.banKinh, FOV, this.camera.aspect);
    const p = new Vector3(0, 0.25, 1).normalize().multiplyScalar(d);
    return { position: [p.x, p.y, p.z], target: [0, 0, 0] };
  }

  /** Bộ phận chưa có góc nhìn định sẵn: nhìn vào chỗ bộ phận sau khi tách, giữ hướng nhìn hiện tại, lại gần vừa đủ. */
  private gocNhinBoPhan(bp: BoPhan): CameraView {
    const dich = bp.tam.clone().add(bp.doiTam);
    const huong = this.camera.position.clone().sub(this.dieuKhien.target).normalize();
    const hienTai = this.camera.position.distanceTo(this.dieuKhien.target);
    const vua = khoangCachVuaKhung(Math.max(bp.banKinh * 1.8, this.banKinh * 0.45), FOV, this.camera.aspect);
    const p = dich.clone().addScaledVector(huong, Math.min(hienTai, vua));
    return { position: [p.x, p.y, p.z], target: [dich.x, dich.y, dich.z] };
  }

  /** Hướng và độ dời khi tách (tính lúc bộ phận đang ở chỗ cũ). */
  private tinhDoTach(bp: BoPhan) {
    const veCamera = this.camera.position.clone().sub(this.dieuKhien.target);
    bp.doiTam = huongTach(bp.tam, this.banKinh, veCamera).multiplyScalar(TI_LE_TACH * this.banKinh);
    bp.doiCucBo.clear();
    for (const m of bp.meshes) {
      const cha = m.parent!;
      cha.updateWorldMatrix(true, false);
      const goc = m.getWorldPosition(new Vector3());
      const a = cha.worldToLocal(goc.clone());
      const b = cha.worldToLocal(goc.clone().add(bp.doiTam));
      bp.doiCucBo.set(m, b.sub(a));
    }
  }

  private capNhatTach(dt: number) {
    for (const bp of this.boPhan.values()) {
      if (bp.tach === bp.dich) continue;
      const buoc = dt / THOI_GIAN_TACH;
      bp.tach = bp.dich === 1 ? Math.min(1, bp.tach + buoc) : Math.max(0, bp.tach - buoc);
      const k = chuyenDongMem(bp.tach);
      for (const m of bp.meshes) {
        m.position.copy(bp.viTriGoc.get(m)!).addScaledVector(bp.doiCucBo.get(m) ?? new Vector3(), k);
      }
    }
  }

  private capNhatCamera(dt: number) {
    const c = this.chuyenCamera;
    if (!c) return;
    c.t = Math.min(1, c.t + dt / THOI_GIAN_BAY);
    const k = chuyenDongMem(c.t);
    this.camera.position.lerpVectors(c.tuViTri, c.denViTri, k);
    this.dieuKhien.target.lerpVectors(c.tuDich, c.denDich, k);
    if (c.t >= 1) this.chuyenCamera = null;
  }

  /**
   * Mỗi mesh dùng vật liệu riêng (sao chép) để làm nổi bật / làm mờ không ảnh hưởng mesh khác dùng chung vật liệu.
   * Texture vẫn dùng chung. Vật liệu gốc giải phóng ngay vì không còn mesh nào dùng.
   */
  private chuanBiVatLieu(goc: Object3D) {
    const cu = new Set<Material>();
    goc.traverse((vat) => {
      if (!(vat instanceof Mesh)) return;
      const saoChep = (vl: Material) => {
        cu.add(vl);
        const moi = vl.clone();
        const emissive = "emissive" in moi && moi.emissive instanceof Color ? moi.emissive.clone() : null;
        this.gocVatLieu.set(moi, {
          opacity: moi.opacity,
          transparent: moi.transparent,
          depthWrite: moi.depthWrite,
          emissive,
        });
        return moi;
      };
      vat.material = Array.isArray(vat.material) ? vat.material.map(saoChep) : saoChep(vat.material);
    });
    for (const vl of cu) vl.dispose();
  }

  private apDungVatLieu() {
    if (!this.moHinh) return;
    const coChon = this.dangChon !== null;
    this.moHinh.traverse((vat) => {
      if (!(vat instanceof Mesh)) return;
      const laDangChon = coChon && this.meshThuocBoPhan.get(vat) === this.dangChon;
      const ds: Material[] = Array.isArray(vat.material) ? vat.material : [vat.material];
      for (const vl of ds) {
        const goc = this.gocVatLieu.get(vl);
        if (!goc) continue;
        const mo = coChon && !laDangChon;
        vl.transparent = mo || goc.transparent;
        vl.opacity = mo ? goc.opacity * DO_MO_BO_PHAN_KHAC : goc.opacity;
        vl.depthWrite = mo ? false : goc.depthWrite;
        if (goc.emissive && "emissive" in vl && vl.emissive instanceof Color) {
          if (laDangChon) vl.emissive.copy(goc.emissive).lerp(MAU_NHAN, DO_SANG_NHAN);
          else vl.emissive.copy(goc.emissive);
        }
        vl.needsUpdate = true;
      }
    });
  }

  private khiBamXuong = (e: PointerEvent) => {
    this.bamXuong = e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
  };

  private khiThaRa = (e: PointerEvent) => {
    const bat = this.bamXuong;
    this.bamXuong = null;
    if (!bat || !this.dieuKhien.enabled || !this.moHinh) return;
    if (Math.hypot(e.clientX - bat.x, e.clientY - bat.y) > NGUONG_BAM_PX) return; // là kéo xoay
    const khung = this.renderer.domElement.getBoundingClientRect();
    const diem = new Vector2(
      ((e.clientX - khung.left) / khung.width) * 2 - 1,
      -((e.clientY - khung.top) / khung.height) * 2 + 1,
    );
    this.tia.setFromCamera(diem, this.camera);
    const dsTrung = this.tia.intersectObject(this.moHinh, true);
    if (this.suKien.onBamVat) {
      this.suKien.onBamVat(dsTrung[0]?.object ?? null, e.shiftKey);
      return;
    }
    if (dsTrung.length === 0) {
      this.suKien.onBam?.(null); // bấm vùng trống: bỏ chọn
      return;
    }
    // Bỏ qua phần chưa gắn nhãn để bấm được bộ phận nằm phía sau; trúng toàn phần chưa gắn nhãn thì không đổi gì.
    for (const x of dsTrung) {
      const id = x.object instanceof Mesh ? this.meshThuocBoPhan.get(x.object) : undefined;
      if (id !== undefined) {
        this.suKien.onBam?.(id);
        return;
      }
    }
  };
}

/** Tâm khối bao của mesh gần `tam` nhất. */
function diemNeo(meshes: Mesh[], tam: Vector3): Vector3 {
  let tot = tam;
  let ganNhat = Infinity;
  for (const m of meshes) {
    const c = new Box3().setFromObject(m).getCenter(new Vector3());
    const d = c.distanceTo(tam);
    if (d < ganNhat) {
      ganNhat = d;
      tot = c;
    }
  }
  return tot;
}

/** Tâm và bán kính khối bao của một nhóm mesh (hệ tọa độ thế giới = hệ mô hình). */
function khoiBao(meshes: Mesh[]): { tam: Vector3; banKinh: number } {
  const hop = new Box3();
  for (const m of meshes) hop.expandByObject(m);
  return { tam: hop.getCenter(new Vector3()), banKinh: hop.getSize(new Vector3()).length() / 2 };
}
