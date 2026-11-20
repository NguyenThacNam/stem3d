/**
 * Khung hiển thị một mô hình GLB trên nền lưới ô li: kéo để xoay, cuộn hoặc chụm hai ngón để phóng to.
 * Có ba trạng thái: đang tải (kèm phần trăm nếu biết), lỗi (kèm nút thử lại khi thử lại có ích), đã hiển thị.
 * Rời trang hoặc đổi mô hình thì giải phóng toàn bộ bộ nhớ đồ họa và ngữ cảnh WebGL. Phần lõi Three.js ở `Canh3D`
 * (`canh-3d.ts`): vẽ theo yêu cầu, chỉ vẽ khi xoay, phóng to hoặc có hoạt cảnh.
 *
 * Đọc file trên máy bằng `GLTFLoader.parse` (không tạo đường dẫn blob: cho cả file GLB). Texture nhúng trong GLB
 * vẫn được GLTFLoader đọc bằng fetch(blob:...), nên CSP cần `connect-src blob:` (nginx/security-headers.conf).
 */
import { useEffect, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Canh3D, LoiMoHinhRong, LoiWebGL } from "./canh-3d";
import { DemKhungHinh, type ThongKeMoHinh, thongKeMoHinh } from "./tinh-toan";

export type NguonMoHinh = { loai: "url"; url: string; ten: string } | { loai: "tep"; tep: File; ten: string };

export type ThongTinTai = ThongKeMoHinh & {
  /** Từ lúc bắt đầu tải (hoặc đọc file) tới khi khung hình đầu tiên có mô hình được vẽ xong. */
  thoiGianMs: number;
  /** Dung lượng file (byte); null nếu máy chủ không báo. */
  dungLuong: number | null;
  /** Tên bộ xử lý đồ họa trình duyệt báo (để ghi kèm số liệu đo); null nếu trình duyệt ẩn. */
  gpu: string | null;
};

type TrangThai =
  | { loai: "dang-tai"; phanTram: number | null }
  | { loai: "loi"; tieuDe: string; huongDan: string; coTheThuLai: boolean }
  | { loai: "xong" };

function tenGpu(renderer: WebGLRenderer): string | null {
  const gl = renderer.getContext();
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
}

export function MoHinh3D({
  nguon,
  nhan,
  onDaTai,
  onFps,
  className,
}: {
  nguon: NguonMoHinh;
  /** Mô tả cho trình đọc màn hình, ví dụ "Mô hình 3D phân tử nước". */
  nhan: string;
  onDaTai?: (thongTin: ThongTinTai) => void;
  /**
   * Số khung hình/giây, báo khoảng 2 lần mỗi giây KHI ĐANG VẼ (xoay, phóng to). Khung vẽ theo yêu cầu nên đứng yên
   * thì không vẽ và không báo – giữ số đo lần xoay gần nhất.
   */
  onFps?: (fps: number) => void;
  className?: string;
}) {
  const khungRef = useRef<HTMLDivElement>(null);
  const [trangThai, setTrangThai] = useState<TrangThai>({ loai: "dang-tai", phanTram: null });
  const [lanThu, setLanThu] = useState(0);

  // Giữ hàm gọi lại trong ref để đổi hàm không làm tải lại mô hình.
  const goiLai = useRef({ onDaTai, onFps });
  goiLai.current = { onDaTai, onFps };

  useEffect(() => {
    const khung = khungRef.current;
    if (!khung) return;
    let huy = false;
    setTrangThai({ loai: "dang-tai", phanTram: null });

    let canh: Canh3D;
    try {
      canh = new Canh3D(khung);
    } catch (e) {
      if (!(e instanceof LoiWebGL)) throw e;
      setTrangThai({
        loai: "loi",
        tieuDe: "Máy chưa hiển thị được 3D",
        huongDan: "Hãy bật tăng tốc phần cứng trong cài đặt trình duyệt hoặc dùng máy khác.",
        coTheThuLai: true,
      });
      return;
    }

    const batDau = performance.now();
    let dungLuong: number | null = nguon.loai === "tep" ? nguon.tep.size : null;
    const dem = new DemKhungHinh();
    let lanBaoFps = 0;
    canh.onDaVe = (t) => {
      dem.ghi(t);
      if (t - lanBaoFps >= 500) {
        lanBaoFps = t;
        goiLai.current.onFps?.(dem.fps());
      }
    };

    let phanTramCu: number | null = null;
    const viec =
      nguon.loai === "url"
        ? canh.napUrl(nguon.url, (phanTram, tong) => {
            if (huy) return;
            if (tong !== null) dungLuong = tong;
            if (phanTram === phanTramCu) return;
            phanTramCu = phanTram;
            setTrangThai({ loai: "dang-tai", phanTram });
          })
        : nguon.tep.arrayBuffer().then((duLieu) => canh.napDuLieu(duLieu));

    viec.then(
      ({ goc }) => {
        if (huy) return;
        setTrangThai({ loai: "xong" });
        // Báo số liệu khi khung hình đầu tiên có mô hình đã vẽ xong.
        canh.sauKhiVe(() => {
          if (huy) return;
          goiLai.current.onDaTai?.({
            ...thongKeMoHinh(goc),
            thoiGianMs: performance.now() - batDau,
            dungLuong,
            gpu: tenGpu(canh.renderer),
          });
        });
      },
      (loi: unknown) => {
        if (huy) return;
        console.error(loi);
        if (loi instanceof LoiMoHinhRong)
          setTrangThai({
            loai: "loi",
            tieuDe: "Mô hình không có hình nào để hiển thị",
            huongDan: "File không chứa hình nào. Hãy kiểm tra lại file mô hình.",
            coTheThuLai: false,
          });
        // Lỗi mạng thì thử lại có thể được; file trên máy hỏng thì đọc lại vẫn hỏng, phải chọn file khác.
        else if (nguon.loai === "url")
          setTrangThai({
            loai: "loi",
            tieuDe: "Không tải được mô hình",
            huongDan: "Hãy kiểm tra mạng rồi bấm Thử lại.",
            coTheThuLai: true,
          });
        else
          setTrangThai({
            loai: "loi",
            tieuDe: "Không mở được file",
            huongDan: "Hãy chọn file khác, định dạng GLB.",
            coTheThuLai: false,
          });
      },
    );

    return () => {
      huy = true;
      canh.huy();
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
