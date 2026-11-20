/**
 * Khung hiển thị một mô hình GLB trên nền lưới ô li: kéo để xoay, cuộn hoặc chụm hai ngón để phóng to.
 * Có ba trạng thái: đang tải (kèm phần trăm nếu biết), lỗi (kèm nút thử lại khi thử lại có ích), đã hiển thị.
 * Rời trang hoặc đổi mô hình thì giải phóng toàn bộ bộ nhớ đồ họa và ngữ cảnh WebGL.
 *
 * Gắn nhãn bộ phận (ND03): `onBamPhan` báo tên phần vừa bấm (tên gốc trong file, như `assets.mesh_names`),
 * `phanToSang` tô sáng các phần, `ref` cho lấy / đặt góc camera (`GocNhin`, theo tọa độ gốc của file).
 *
 * Đọc file trên máy bằng `GLTFLoader.parse` (không tạo đường dẫn blob: cho cả file GLB). Texture nhúng trong GLB
 * vẫn được GLTFLoader đọc bằng fetch(blob:...), nên CSP cần `connect-src blob:` (nginx/security-headers.conf).
 */
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
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
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  banDoTenPhan,
  DemKhungHinh,
  emDan,
  giaiPhong,
  type GltfJson,
  type GocNhin,
  khoangCachVuaKhung,
  phanTramDaTai,
  type ThongKeMoHinh,
  thongKeMoHinh,
} from "./tinh-toan";

export type NguonMoHinh = { loai: "url"; url: string; ten: string } | { loai: "tep"; tep: File; ten: string };

export type ThongTinTai = ThongKeMoHinh & {
  /** Từ lúc bắt đầu tải (hoặc đọc file) tới khi khung hình đầu tiên có mô hình được vẽ xong. */
  thoiGianMs: number;
  /** Dung lượng file (byte); null nếu máy chủ không báo. */
  dungLuong: number | null;
  /** Tên bộ xử lý đồ họa trình duyệt báo (để ghi kèm số liệu đo); null nếu trình duyệt ẩn. */
  gpu: string | null;
};

/** Điều khiển camera từ ngoài (qua `ref`). Các hàm không làm gì khi mô hình chưa tải xong. */
export type DieuKhien3D = {
  /** Góc camera hiện tại theo tọa độ gốc của file; null khi chưa có mô hình. */
  layGocNhin: () => GocNhin | null;
  /** Camera bay tới góc nhìn đã lưu. */
  bayToi: (goc: GocNhin) => void;
  /** Camera bay về góc nhìn mặc định (cả mô hình vừa khung). */
  gocChuan: () => void;
};

type TrangThai =
  | { loai: "dang-tai"; phanTram: number | null }
  | { loai: "loi"; tieuDe: string; huongDan: string; coTheThuLai: boolean }
  | { loai: "xong" };

const FOV = 45;
const THOI_GIAN_BAY_MS = 450;
// Màu nhấn của giao diện (#0e7a55) – tô lên phần đang chọn.
const MAU_TO_SANG = new Color(0x0e7a55);
// Nhấn rồi nhả trong phạm vi này (px) mới tính là bấm chọn; xa hơn là kéo xoay.
const NGUONG_BAM_PX = 5;

function tenGpu(renderer: WebGLRenderer): string | null {
  const gl = renderer.getContext();
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
}

/** Bản sao vật liệu ngả sang màu nhấn (chỉ đổi màu, không phát sáng – quy ước 3.2.1). */
function vatLieuToSang(goc: Material): Material {
  const vl = goc.clone() as Material & { color?: Color; map?: unknown };
  if (vl.color) {
    // Có ảnh texture thì màu nhân với ảnh: bỏ ảnh để màu nhấn hiện rõ.
    vl.map = null;
    vl.color.lerp(MAU_TO_SANG, 0.7);
  }
  return vl;
}

export function MoHinh3D({
  nguon,
  nhan,
  onDaTai,
  onFps,
  onBamPhan,
  phanToSang,
  ref,
  className,
}: {
  nguon: NguonMoHinh;
  /** Mô tả cho trình đọc màn hình, ví dụ "Mô hình 3D phân tử nước". */
  nhan: string;
  onDaTai?: (thongTin: ThongTinTai) => void;
  /** Gọi khoảng 2 lần mỗi giây với số khung hình/giây hiện tại. */
  onFps?: (fps: number) => void;
  /**
   * Bấm (không kéo) lên mô hình: `ten` là tên gốc của phần bị bấm, null khi bấm vào nền hoặc phần không tên.
   * `giuShift`: người dùng giữ Shift (chọn thêm phần).
   */
  onBamPhan?: (ten: string | null, giuShift: boolean) => void;
  /** Tên gốc các phần cần tô sáng (phần đang chọn). */
  phanToSang?: readonly string[];
  ref?: Ref<DieuKhien3D>;
  className?: string;
}) {
  const khungRef = useRef<HTMLDivElement>(null);
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: "dang-tai", phanTram: null });
  const [lanThu, setLanThu] = useState(0);

  // Giữ hàm gọi lại trong ref để đổi hàm không làm tải lại mô hình.
  const goiLai = useRef({ onDaTai, onFps, onBamPhan });
  goiLai.current = { onDaTai, onFps, onBamPhan };

  // Cầu nối giữa vòng đời mô hình (effect chính) và các thao tác từ ngoài (tô sáng, góc nhìn).
  const canhRef = useRef<{
    toSang: (ten: readonly string[]) => void;
    layGocNhin: () => GocNhin | null;
    bayToi: (vitri: Vector3, dich: Vector3) => void;
    gocChuan: () => void;
    doiTam: Vector3;
  } | null>(null);
  const toSangRef = useRef<readonly string[]>(phanToSang ?? []);
  toSangRef.current = phanToSang ?? [];

  useImperativeHandle(
    ref,
    () => ({
      layGocNhin: () => canhRef.current?.layGocNhin() ?? null,
      bayToi: (g) => {
        const c = canhRef.current;
        if (!c) return;
        // Tọa độ gốc của file → tọa độ trong khung (mô hình đã dời tâm về gốc tọa độ).
        c.bayToi(new Vector3(...g.position).add(c.doiTam), new Vector3(...g.target).add(c.doiTam));
      },
      gocChuan: () => canhRef.current?.gocChuan(),
    }),
    [],
  );

  const khoaToSang = (phanToSang ?? []).join("\u0000");
  useEffect(() => {
    canhRef.current?.toSang(toSangRef.current);
  }, [khoaToSang]);

  useEffect(() => {
    const khung = khungRef.current;
    if (!khung) return;
    let huy = false;
    setTrangThai({ loai: "dang-tai", phanTram: null });

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setTrangThai({
        loai: "loi",
        tieuDe: "Máy chưa hiển thị được 3D",
        huongDan: "Hãy bật tăng tốc phần cứng trong cài đặt trình duyệt hoặc dùng máy khác.",
        coTheThuLai: true,
      });
      return;
    }
    // Màn hình mật độ cao: giới hạn 2× để máy yếu không phải vẽ gấp 9 lần điểm ảnh.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // trong suốt để thấy nền lưới ô li của khung
    renderer.domElement.className = "block size-full touch-none";
    khung.appendChild(renderer.domElement);

    const canh = new Scene();
    const camera = new PerspectiveCamera(FOV, 1, 0.01, 1000);
    canh.add(new HemisphereLight(0xffffff, 0x8a8f8c, 1.6));
    const denChinh = new DirectionalLight(0xffffff, 1.6);
    denChinh.position.set(2, 3, 4);
    camera.add(denChinh); // đèn đi theo camera: xoay tới đâu mặt nhìn thấy cũng đủ sáng
    canh.add(camera);

    const dieuKhien = new OrbitControls(camera, renderer.domElement);
    dieuKhien.enableDamping = true;
    dieuKhien.enablePan = false;

    const capNhatKichThuoc = () => {
      const rong = khung.clientWidth;
      const cao = khung.clientHeight;
      if (rong === 0 || cao === 0) return;
      renderer.setSize(rong, cao, false);
      camera.aspect = rong / cao;
      camera.updateProjectionMatrix();
    };
    capNhatKichThuoc();
    const theoDoiKichThuoc = new ResizeObserver(capNhatKichThuoc);
    theoDoiKichThuoc.observe(khung);

    let moHinh: Object3D | null = null;
    let tenPhan = new Map<Mesh, string>();
    // Vật liệu gốc của các mesh đang tô sáng (để trả lại) và bản sao tô sáng (để giải phóng).
    const vatLieuGoc = new Map<Mesh, Material | Material[]>();
    const doiTam = new Vector3();
    const gocMacDinh = { vitri: new Vector3(), dich: new Vector3() };
    let bay: { tu: Vector3; tuDich: Vector3; den: Vector3; denDich: Vector3; batDau: number } | null = null;
    let dungLuong: number | null = nguon.loai === "tep" ? nguon.tep.size : null;
    let soKhungDaVe = 0; // số khung đã vẽ kể từ khi có mô hình
    const batDau = performance.now();
    const dem = new DemKhungHinh();
    let lanBaoFps = 0;

    const boToSang = () => {
      for (const [mesh, vl] of vatLieuGoc) {
        const banSao = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const x of banSao) x.dispose();
        mesh.material = vl;
      }
      vatLieuGoc.clear();
    };
    const toSang = (ten: readonly string[]) => {
      boToSang();
      if (!moHinh || ten.length === 0) return;
      const can = new Set(ten);
      for (const [mesh, t] of tenPhan) {
        if (!can.has(t)) continue;
        vatLieuGoc.set(mesh, mesh.material);
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(vatLieuToSang)
          : vatLieuToSang(mesh.material);
      }
    };
    const batDauBay = (den: Vector3, denDich: Vector3) => {
      if (!moHinh) return;
      bay = {
        tu: camera.position.clone(),
        tuDich: dieuKhien.target.clone(),
        den,
        denDich,
        batDau: performance.now(),
      };
    };
    canhRef.current = {
      toSang,
      doiTam,
      layGocNhin: () => {
        if (!moHinh) return null;
        // Tọa độ trong khung → tọa độ gốc của file; làm tròn để JSON gọn mà không lệch thấy được.
        const tron = (v: Vector3) =>
          v
            .clone()
            .sub(doiTam)
            .toArray()
            .map((s) => Math.round(s * 1e5) / 1e5) as [number, number, number];
        return { position: tron(camera.position), target: tron(dieuKhien.target) };
      },
      bayToi: batDauBay,
      gocChuan: () => batDauBay(gocMacDinh.vitri.clone(), gocMacDinh.dich.clone()),
    };

    renderer.setAnimationLoop((t) => {
      if (bay) {
        const k = emDan((performance.now() - bay.batDau) / THOI_GIAN_BAY_MS);
        camera.position.lerpVectors(bay.tu, bay.den, k);
        dieuKhien.target.lerpVectors(bay.tuDich, bay.denDich, k);
        if (k >= 1) bay = null;
      }
      dieuKhien.update();
      renderer.render(canh, camera);
      if (moHinh) {
        soKhungDaVe += 1;
        // Khung thứ 2 bắt đầu nghĩa là khung đầu (có mô hình) đã vẽ xong.
        if (soKhungDaVe === 2)
          goiLai.current.onDaTai?.({
            ...thongKeMoHinh(moHinh),
            thoiGianMs: performance.now() - batDau,
            dungLuong,
            gpu: tenGpu(renderer),
          });
      }
      dem.ghi(t);
      if (t - lanBaoFps >= 500) {
        lanBaoFps = t;
        goiLai.current.onFps?.(dem.fps());
      }
    });

    // Bấm chọn phần: nhấn rồi nhả gần chỗ cũ (kéo để xoay thì không tính). Kéo xoay thì dừng camera đang bay.
    const tia = new Raycaster();
    let diemNhan: { x: number; y: number } | null = null;
    const khiNhan = (e: PointerEvent) => {
      bay = null;
      diemNhan = e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
    };
    const khiNha = (e: PointerEvent) => {
      const nhan = diemNhan;
      diemNhan = null;
      const bam = goiLai.current.onBamPhan;
      if (!bam || !moHinh || !nhan || !e.isPrimary) return;
      if (Math.hypot(e.clientX - nhan.x, e.clientY - nhan.y) > NGUONG_BAM_PX) return;
      const khungChu = renderer.domElement.getBoundingClientRect();
      const toaDo = new Vector2(
        ((e.clientX - khungChu.left) / khungChu.width) * 2 - 1,
        -((e.clientY - khungChu.top) / khungChu.height) * 2 + 1,
      );
      tia.setFromCamera(toaDo, camera);
      const trung = tia
        .intersectObject(moHinh, true)
        .find((x) => x.object instanceof Mesh && x.object.visible);
      bam(trung ? (tenPhan.get(trung.object as Mesh) ?? null) : null, e.shiftKey);
    };
    renderer.domElement.addEventListener("pointerdown", khiNhan);
    renderer.domElement.addEventListener("pointerup", khiNha);

    const baoLoi = (tieuDe: string, huongDan: string, coTheThuLai: boolean) => (loi: unknown) => {
      if (huy) return;
      console.error(loi);
      setTrangThai({ loai: "loi", tieuDe, huongDan, coTheThuLai });
    };
    // Lỗi mạng thì thử lại có thể được; file trên máy hỏng thì đọc lại vẫn hỏng, phải chọn file khác.
    const loiTai =
      nguon.loai === "url"
        ? baoLoi("Không tải được mô hình", "Hãy kiểm tra mạng rồi bấm Thử lại.", true)
        : baoLoi("Không mở được file", "Hãy chọn file khác, định dạng GLB.", false);
    const loiMoHinhRong = baoLoi(
      "Mô hình không có hình nào để hiển thị",
      "File không chứa hình nào. Hãy kiểm tra lại file mô hình.",
      false,
    );

    const datMoHinh = (gltf: GLTF) => {
      if (huy) {
        giaiPhong(gltf.scene);
        return;
      }
      const goc = gltf.scene;
      const hop = new Box3().setFromObject(goc);
      if (hop.isEmpty()) {
        giaiPhong(goc);
        loiMoHinhRong(new Error("Mô hình rỗng"));
        return;
      }
      // Đưa tâm mô hình về gốc tọa độ để xoay quanh chính giữa, rồi lùi camera cho vừa khung.
      doiTam.copy(hop.getCenter(new Vector3())).negate();
      goc.position.add(doiTam);
      const banKinh = hop.getBoundingSphere(new Sphere()).radius;
      const khoangCach = khoangCachVuaKhung(banKinh, FOV, camera.aspect);
      camera.position.set(0, 0.25, 1).normalize().multiplyScalar(khoangCach);
      camera.near = khoangCach / 100;
      camera.far = khoangCach * 100;
      camera.updateProjectionMatrix();
      dieuKhien.target.set(0, 0, 0);
      dieuKhien.minDistance = banKinh * 0.8;
      dieuKhien.maxDistance = khoangCach * 3;
      dieuKhien.update();
      gocMacDinh.vitri.copy(camera.position);
      gocMacDinh.dich.set(0, 0, 0);

      tenPhan = banDoTenPhan(
        goc,
        gltf.parser.associations as Map<unknown, { nodes?: number }>,
        gltf.parser.json as GltfJson,
      );
      canh.add(goc);
      moHinh = goc;
      toSang(toSangRef.current);
      setTrangThai({ loai: "xong" });
    };

    const taiMoHinh = new GLTFLoader();
    if (nguon.loai === "url") {
      let phanTramCu: number | null = null;
      taiMoHinh.load(
        nguon.url,
        datMoHinh,
        (e) => {
          if (huy) return;
          if (e.total > 0) dungLuong = e.total;
          const phanTram = phanTramDaTai(e.loaded, e.total);
          if (phanTram === phanTramCu) return;
          phanTramCu = phanTram;
          setTrangThai({ loai: "dang-tai", phanTram });
        },
        loiTai,
      );
    } else {
      nguon.tep
        .arrayBuffer()
        .then((duLieu) => {
          // File không phải GLB (ví dụ ảnh) thì parse ném lỗi ngay chứ không gọi loiTai.
          if (!huy) taiMoHinh.parse(duLieu, "", datMoHinh, loiTai);
        })
        .catch(loiTai);
    }

    return () => {
      huy = true;
      canhRef.current = null;
      theoDoiKichThuoc.disconnect();
      renderer.domElement.removeEventListener("pointerdown", khiNhan);
      renderer.domElement.removeEventListener("pointerup", khiNha);
      renderer.setAnimationLoop(null);
      dieuKhien.dispose();
      boToSang(); // trả vật liệu gốc để giaiPhong giải phóng đúng vật liệu của mô hình
      if (moHinh) giaiPhong(moHinh);
      renderer.dispose();
      // Trình duyệt chỉ cho giữ khoảng 16 ngữ cảnh WebGL; trả lại ngay thay vì chờ dọn rác.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [nguon, lanThu]);

  return (
    <div className={cn("relative overflow-hidden grid3d", className)}>
      <div ref={khungRef} className="absolute inset-0" role="img" aria-label={nhan} />
      {/* Trình đọc màn hình chỉ nghe câu cố định, không nghe từng phần trăm khi tải. */}
      <p aria-live="polite" className="sr-only">
        {trangThai.loai === "dang-tai"
          ? "Đang tải mô hình"
          : trangThai.loai === "loi"
            ? `${trangThai.tieuDe}. ${trangThai.huongDan}`
            : ""}
      </p>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
        {trangThai.loai === "dang-tai" && (
          <p
            aria-hidden
            className="rounded-card border border-line bg-surface px-4 py-3 text-[14px] text-text-2"
          >
            Đang tải mô hình{trangThai.phanTram === null ? "" : ` ${trangThai.phanTram}%`}
          </p>
        )}
        {trangThai.loai === "loi" && (
          <div className="pointer-events-auto max-w-sm rounded-card border border-line bg-surface p-6 text-center">
            <p className="font-medium">{trangThai.tieuDe}</p>
            <p className="mt-1 text-[14px] text-text-2">{trangThai.huongDan}</p>
            {trangThai.coTheThuLai && (
              <Button variant="primary" className="mt-4" onClick={() => setLanThu((n) => n + 1)}>
                Thử lại
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
