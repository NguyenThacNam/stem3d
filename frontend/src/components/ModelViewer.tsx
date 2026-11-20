/**
 * Khung xem trước mô hình GLB (UC 21 bước 4 – "báo cáo kiểm tra và bản xem trước 3D").
 * - Nguồn: `url` (file đã nạp, /content/models/...) hoặc `file` (file trên máy, chưa gửi – đọc thẳng, không tải lên).
 * - Xoay bằng chuột / chạm, phóng to bằng con lăn; mũi tên bàn phím xoay khi khung đang được chọn.
 * - Chỉ vẽ lại khi có thay đổi (không chạy vòng lặp liên tục) để không tốn máy yếu.
 * - Máy không có WebGL: báo lỗi trong khung, không làm hỏng cả trang.
 * - Đóng khung: hủy tải file, giải phóng hình khối / texture và trả ngữ cảnh WebGL ngay (trình duyệt chỉ cho
 *   khoảng 16 ngữ cảnh cùng lúc).
 * Dùng qua `ModelViewerLazy` để Three.js chỉ tải khi cần.
 */
import { LoaderCircle, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { downloadBinary } from "@/api/client";
import { cn } from "@/lib/utils";

export interface ModelViewerProps {
  url?: string;
  file?: File;
  /** Nhãn cho trình đọc màn hình, ví dụ tên mô hình. */
  label: string;
  className?: string;
}

type TrangThai =
  | { kind: "loading"; percent: number | null }
  | { kind: "ready" }
  | { kind: "error"; message: string; retry: boolean };

const LOI_DOC = "Không hiển thị được mô hình, hãy kiểm tra file GLB rồi thử lại";
const LOI_WEBGL =
  "Máy này không hiển thị được 3D (trình duyệt tắt WebGL). Hãy dùng Chrome hoặc Edge bản mới.";

/** Giải phóng hình khối, vật liệu, texture của một cây đối tượng. */
function giaiPhong(goc: THREE.Object3D): void {
  goc.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const vatLieu = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of vatLieu) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}

export default function ModelViewer({ url, file, label, className }: ModelViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const [trangThai, setTrangThai] = useState<TrangThai>({ kind: "loading", percent: null });
  const [lan, setLan] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let huy = false;
    setTrangThai({ kind: "loading", percent: null });

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setTrangThai({ kind: "error", message: LOI_WEBGL, retry: false });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = "block";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const moiTruong = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = moiTruong;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.listenToKeyEvents(host);

    const ve = () => renderer.render(scene, camera);
    controls.addEventListener("change", ve);

    const doiCo = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ve();
    };
    const quanSat = new ResizeObserver(doiCo);
    quanSat.observe(host);
    doiCo();

    let goc: THREE.Object3D | null = null;
    const datGocNhin = () => {
      if (!goc) return;
      const hop = new THREE.Box3().setFromObject(goc);
      const tam = hop.getCenter(new THREE.Vector3());
      const kichThuoc = hop.getSize(new THREE.Vector3()).length() || 1;
      const khoangCach = kichThuoc / (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.near = kichThuoc / 100;
      camera.far = kichThuoc * 100;
      camera.position
        .copy(tam)
        .add(new THREE.Vector3(0.6, 0.35, 1).normalize().multiplyScalar(khoangCach * 0.85));
      camera.updateProjectionMatrix();
      controls.target.copy(tam);
      controls.update();
      ve();
    };
    resetRef.current = datGocNhin;

    const loiTai = () => {
      if (!huy) setTrangThai({ kind: "error", message: LOI_DOC, retry: true });
    };
    const docGlb = (buf: ArrayBuffer) => {
      if (huy) return;
      new GLTFLoader().parse(
        buf,
        "",
        (gltf) => {
          // Đã đóng khung hoặc đổi file trong lúc đọc: giải phóng ngay, không thêm vào cảnh.
          if (huy) {
            giaiPhong(gltf.scene);
            return;
          }
          goc = gltf.scene;
          scene.add(goc);
          datGocNhin();
          setTrangThai({ kind: "ready" });
        },
        loiTai,
      );
    };

    const ctrl = new AbortController();
    let phanTram = -1;
    if (file) {
      file.arrayBuffer().then(docGlb).catch(loiTai);
    } else if (url) {
      downloadBinary(url, {
        signal: ctrl.signal,
        onProgress: (f) => {
          const p = Math.round(f * 100);
          if (huy || p === phanTram) return;
          phanTram = p;
          setTrangThai({ kind: "loading", percent: p });
        },
      })
        .then(docGlb)
        .catch(loiTai);
    } else {
      setTrangThai({ kind: "error", message: LOI_DOC, retry: false });
    }

    return () => {
      huy = true;
      ctrl.abort();
      quanSat.disconnect();
      controls.dispose();
      if (goc) giaiPhong(goc);
      moiTruong.dispose();
      pmrem.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, file, lan]);

  return (
    <div className={cn("relative overflow-hidden rounded-card border border-line grid3d", className)}>
      <div
        ref={hostRef}
        tabIndex={0}
        role="img"
        aria-label={`Bản xem trước 3D: ${label}. Dùng phím mũi tên để xoay.`}
        className="absolute inset-0 focus-visible:outline-offset-[-2px]"
      />
      {trangThai.kind === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-ctl bg-surface px-3 py-2 text-[14px] text-text-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
            <LoaderCircle className="size-4 animate-spin text-muted" strokeWidth={1.5} aria-hidden />
            {trangThai.percent === null ? "Đang đọc mô hình" : `Đang tải mô hình ${trangThai.percent}%`}
          </div>
        </div>
      )}
      {trangThai.kind === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-surface/80 p-4" role="status">
          <div className="flex max-w-xs flex-col items-center gap-3 text-center text-[14px] text-text-2">
            <TriangleAlert className="size-[18px] text-danger" strokeWidth={1.5} aria-hidden />
            {trangThai.message}
            {trangThai.retry && (
              <button
                type="button"
                onClick={() => setLan((x) => x + 1)}
                className="h-8 rounded-ctl border border-line-2 bg-surface px-3 text-[13px] font-medium text-text hover:bg-surface-2"
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      )}
      {trangThai.kind === "ready" && (
        <button
          type="button"
          onClick={() => resetRef.current()}
          className="absolute bottom-3 left-3 flex h-8 items-center gap-1.5 rounded-ctl border border-line-2 bg-surface px-3 text-[13px] font-medium text-text hover:bg-surface-2"
        >
          <RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />
          Góc nhìn chuẩn
        </button>
      )}
    </div>
  );
}
