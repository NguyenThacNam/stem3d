/**
 * Lõi khung 3D dùng chung (không phụ thuộc React): renderer, cảnh, camera, đèn, điều khiển xoay / phóng to,
 * nạp một mô hình GLB, vẽ THEO YÊU CẦU và giải phóng toàn bộ khi hủy. `MoHinh3D` (trang thử) và khung bài học (BH01)
 * cùng dùng lớp này.
 *
 * Vẽ theo yêu cầu: chỉ vẽ khi có thay đổi (kéo xoay, phóng to, quán tính sau khi thả tay, hoạt cảnh, đổi cỡ khung);
 * đứng yên thì không vẽ – máy tính bảng không tốn pin cho 60 khung hình/giây vô ích.
 *
 * Mỗi đối tượng chỉ nạp MỘT mô hình; đổi mô hình thì hủy và tạo đối tượng mới (đơn giản, không lẫn lần nạp cũ).
 */
import {
  Box3,
  DirectionalLight,
  HemisphereLight,
  type Object3D,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ganTenPhan,
  giaiPhong,
  type JsonTenGltf,
  khoangCachVuaKhung,
  phanTramDaTai,
  type ThamChieuGltf,
} from "./tinh-toan";

const FOV = 45;
/** Hướng nhìn tổng quan: chính diện, hơi cao. */
const HUONG_TONG_QUAN = new Vector3(0, 0.25, 1).normalize();

/** Máy không tạo được ngữ cảnh WebGL (tắt tăng tốc phần cứng, trình duyệt quá cũ). */
export class LoiWebGL extends Error {}
/** File không đọc được hoặc không phải GLB. */
export class LoiDocMoHinh extends Error {}
/** File đọc được nhưng không có hình nào để vẽ. */
export class LoiMoHinhRong extends Error {}
/** Khung đã hủy (rời trang) trước khi bắt đầu nạp – người gọi bỏ qua. */
export class LoiDaHuy extends Error {}

export type GocNhin = { viTri: Vector3; dich: Vector3 };

export type KetQuaNap = {
  /** Gốc của mô hình đã đưa tâm về gốc tọa độ (tọa độ cảnh = tọa độ file − `doiTam`). */
  goc: Object3D;
  /** Vector đã trừ khỏi vị trí mô hình để đưa tâm về gốc tọa độ (đổi tọa độ trong file sang tọa độ cảnh). */
  doiTam: Vector3;
  banKinh: number;
  gocTongQuan: GocNhin;
};

/** Hoạt cảnh chạy mỗi khung hình; trả `true` khi còn chạy, `false` khi xong (bị gỡ). */
export type HoatCanh = (thoiDiemMs: number) => boolean;

export class Canh3D {
  readonly renderer: WebGLRenderer;
  readonly canh = new Scene();
  readonly camera = new PerspectiveCamera(FOV, 1, 0.01, 1000);
  readonly dieuKhien: OrbitControls;

  /** Gọi sau mỗi khung hình đã vẽ (đếm khung hình/giây ở trang thử). */
  onDaVe: ((thoiDiemMs: number) => void) | null = null;

  private moHinh: Object3D | null = null;
  private readonly hoatCanh = new Set<HoatCanh>();
  private readonly sauKhungToi: (() => void)[] = [];
  private raf = 0;
  private daHuy = false;
  private readonly theoDoiKichThuoc: ResizeObserver;
  private readonly veLaiKhiDoi = () => this.veLai();

  constructor(private readonly khung: HTMLElement) {
    try {
      this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      throw new LoiWebGL("Không tạo được ngữ cảnh WebGL");
    }
    // Màn hình mật độ cao: giới hạn 2× để máy yếu không phải vẽ gấp 9 lần điểm ảnh.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0); // trong suốt để thấy nền lưới ô li của khung
    this.renderer.domElement.className = "block size-full touch-none";
    // Mất ngữ cảnh rồi được trả lại (driver GPU khởi động lại, máy tính bảng thu hồi): vẽ theo yêu cầu nên phải tự vẽ
    // lại, không thì khung trắng cho tới khi học sinh chạm vào.
    this.renderer.domElement.addEventListener("webglcontextrestored", this.veLaiKhiDoi);
    khung.appendChild(this.renderer.domElement);

    this.canh.add(new HemisphereLight(0xffffff, 0x8a8f8c, 1.6));
    const denChinh = new DirectionalLight(0xffffff, 1.6);
    denChinh.position.set(2, 3, 4);
    this.camera.add(denChinh); // đèn đi theo camera: xoay tới đâu mặt nhìn thấy cũng đủ sáng
    this.canh.add(this.camera);

    this.dieuKhien = new OrbitControls(this.camera, this.renderer.domElement);
    this.dieuKhien.enableDamping = true;
    this.dieuKhien.enablePan = false; // Hình 3-5: chỉ xoay và phóng to
    this.dieuKhien.addEventListener("change", this.veLaiKhiDoi);

    this.theoDoiKichThuoc = new ResizeObserver(() => this.capNhatKichThuoc());
    this.theoDoiKichThuoc.observe(khung);
    this.capNhatKichThuoc();
  }

  /** Xin vẽ một khung hình (gộp nhiều lần gọi trong cùng một khung). */
  veLai(): void {
    if (this.daHuy || this.raf) return;
    this.raf = requestAnimationFrame(this.khungHinh);
  }

  /** Thêm hoạt cảnh (camera bay, bộ phận tách ra…); trả hàm gỡ hoạt cảnh. */
  themHoatCanh(hc: HoatCanh): () => void {
    this.hoatCanh.add(hc);
    this.veLai();
    return () => this.hoatCanh.delete(hc);
  }

  /** Gọi `fn` một lần ngay sau khi khung hình tới được vẽ xong. */
  sauKhiVe(fn: () => void): void {
    this.sauKhungToi.push(fn);
    this.veLai();
  }

  /** Nạp GLB theo đường dẫn; `onTienDo` nhận phần trăm (null khi máy chủ không báo dung lượng) và tổng byte. */
  napUrl(
    url: string,
    onTienDo?: (phanTram: number | null, tongByte: number | null) => void,
  ): Promise<KetQuaNap> {
    return new Promise((xong, loi) => {
      if (this.daHuy) return loi(new LoiDaHuy("Khung đã đóng"));
      new GLTFLoader().load(
        url,
        (gltf) => this.datMoHinh(gltf, xong, loi),
        (e) => {
          if (!this.daHuy) onTienDo?.(phanTramDaTai(e.loaded, e.total), e.total > 0 ? e.total : null);
        },
        () => loi(new LoiDocMoHinh("Không tải được mô hình")),
      );
    });
  }

  /** Nạp GLB từ dữ liệu đã đọc (file trên máy) – không tạo đường dẫn blob: cho cả file. */
  napDuLieu(duLieu: ArrayBuffer): Promise<KetQuaNap> {
    return new Promise((xong, loi) => {
      // Rời trang trong lúc đang đọc file: không phân tích, giải mã texture vô ích.
      if (this.daHuy) return loi(new LoiDaHuy("Khung đã đóng"));
      try {
        new GLTFLoader().parse(
          duLieu,
          "",
          (gltf) => this.datMoHinh(gltf, xong, loi),
          () => loi(new LoiDocMoHinh("Không đọc được file mô hình")),
        );
      } catch {
        // File không phải GLB (ví dụ ảnh) thì parse ném lỗi ngay chứ không gọi hàm báo lỗi.
        loi(new LoiDocMoHinh("Không đọc được file mô hình"));
      }
    });
  }

  /** Dừng vẽ, giải phóng mô hình, renderer, ngữ cảnh WebGL; gỡ canvas. Gọi nhiều lần vẫn an toàn. */
  huy(): void {
    if (this.daHuy) return;
    this.daHuy = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.hoatCanh.clear();
    this.sauKhungToi.length = 0;
    this.theoDoiKichThuoc.disconnect();
    this.dieuKhien.removeEventListener("change", this.veLaiKhiDoi);
    this.renderer.domElement.removeEventListener("webglcontextrestored", this.veLaiKhiDoi);
    this.dieuKhien.dispose();
    if (this.moHinh) giaiPhong(this.moHinh);
    this.moHinh = null;
    this.renderer.dispose();
    // Trình duyệt chỉ cho giữ khoảng 16 ngữ cảnh WebGL; trả lại ngay thay vì chờ dọn rác.
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private readonly khungHinh = (t: number) => {
    this.raf = 0;
    if (this.daHuy) return;
    // update() trả true khi camera còn đổi (đang kéo hoặc quán tính sau khi thả tay).
    let conChay = this.dieuKhien.update();
    for (const hc of this.hoatCanh) {
      if (hc(t)) conChay = true;
      else this.hoatCanh.delete(hc);
    }
    this.renderer.render(this.canh, this.camera);
    this.onDaVe?.(t);
    for (const fn of this.sauKhungToi.splice(0)) fn();
    if (conChay) this.veLai();
  };

  private capNhatKichThuoc(): void {
    const rong = this.khung.clientWidth;
    const cao = this.khung.clientHeight;
    if (rong === 0 || cao === 0) return;
    this.renderer.setSize(rong, cao, false);
    this.camera.aspect = rong / cao;
    this.camera.updateProjectionMatrix();
    this.veLai();
  }

  private datMoHinh(gltf: GLTF, xong: (kq: KetQuaNap) => void, loi: (e: Error) => void): void {
    const goc = gltf.scene;
    if (this.daHuy) {
      giaiPhong(goc);
      loi(new LoiDaHuy("Khung đã đóng"));
      return;
    }
    ganTenPhan(
      goc,
      gltf.parser.json as JsonTenGltf,
      gltf.parser.associations as unknown as Map<Object3D, ThamChieuGltf>,
    );
    const hop = new Box3().setFromObject(goc);
    if (hop.isEmpty()) {
      giaiPhong(goc);
      loi(new LoiMoHinhRong("Mô hình rỗng"));
      return;
    }
    // Đưa tâm mô hình về gốc tọa độ để xoay quanh chính giữa, rồi lùi camera cho vừa khung.
    const doiTam = hop.getCenter(new Vector3());
    goc.position.sub(doiTam);
    const banKinh = hop.getBoundingSphere(new Sphere()).radius;
    const khoangCach = khoangCachVuaKhung(banKinh, FOV, this.camera.aspect);
    const gocTongQuan: GocNhin = {
      viTri: HUONG_TONG_QUAN.clone().multiplyScalar(khoangCach),
      dich: new Vector3(0, 0, 0),
    };
    this.camera.position.copy(gocTongQuan.viTri);
    this.camera.near = khoangCach / 100;
    this.camera.far = khoangCach * 100;
    this.camera.updateProjectionMatrix();
    this.dieuKhien.target.copy(gocTongQuan.dich);
    this.dieuKhien.minDistance = banKinh * 0.8;
    this.dieuKhien.maxDistance = khoangCach * 3;
    this.dieuKhien.update();

    this.canh.add(goc);
    this.moHinh = goc;
    this.veLai();
    xong({ goc, doiTam, banKinh, gocTongQuan });
  }
}
