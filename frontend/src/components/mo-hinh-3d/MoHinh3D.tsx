/**
 * Khung hiển thị một mô hình GLB trên nền lưới ô li (trang thử NT08): kéo để xoay, cuộn hoặc chụm hai ngón để
 * phóng to. Dựng trên lõi `CanhBaiHoc` (dùng chung với khung bài học BH01); rời trang hoặc đổi mô hình thì lõi giải
 * phóng toàn bộ bộ nhớ đồ họa và ngữ cảnh WebGL.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CanhBaiHoc, type NguonMoHinh } from "./canh-bai-hoc";
import { LopTrangThai, type TrangThaiTai, trangThaiLoi } from "./LopTrangThai";
import { type ThongKeMoHinh, thongKeMoHinh } from "./tinh-toan";

export type { NguonMoHinh } from "./canh-bai-hoc";

export type ThongTinTai = ThongKeMoHinh & {
  /** Từ lúc bắt đầu tải (hoặc đọc file) tới khi khung hình đầu tiên có mô hình được vẽ xong. */
  thoiGianMs: number;
  /** Dung lượng file (byte); null nếu máy chủ không báo. */
  dungLuong: number | null;
  /** Tên bộ xử lý đồ họa trình duyệt báo (để ghi kèm số liệu đo); null nếu trình duyệt ẩn. */
  gpu: string | null;
};

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
  /** Gọi khoảng 2 lần mỗi giây với số khung hình/giây hiện tại. */
  onFps?: (fps: number) => void;
  className?: string;
}) {
  const khungRef = useRef<HTMLDivElement>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiTai>({ loai: "dang-tai", phanTram: null });
  const [lanThu, setLanThu] = useState(0);

  // Giữ hàm gọi lại trong ref để đổi hàm không làm tải lại mô hình.
  const goiLai = useRef({ onDaTai, onFps });
  goiLai.current = { onDaTai, onFps };

  useEffect(() => {
    const khung = khungRef.current;
    if (!khung) return;
    let huy = false;
    setTrangThai({ loai: "dang-tai", phanTram: null });

    let soKhungDaVe = -1; // -1: chưa có mô hình
    let baoXong: (() => void) | null = null;
    let canh: CanhBaiHoc;
    try {
      canh = new CanhBaiHoc(khung, {
        onFps: (fps) => goiLai.current.onFps?.(fps),
        onKhungHinh: () => {
          if (soKhungDaVe < 0) return;
          soKhungDaVe += 1;
          // Khung thứ 2 bắt đầu nghĩa là khung đầu (có mô hình) đã vẽ xong.
          if (soKhungDaVe === 2) baoXong?.();
        },
      });
    } catch (loi) {
      setTrangThai(trangThaiLoi(loi));
      return;
    }

    const batDau = performance.now();
    let dungLuong: number | null = nguon.loai === "tep" ? nguon.tep.size : null;
    let phanTramCu: number | null = null;
    canh
      .tai(nguon, (phanTram, tong) => {
        if (huy) return;
        if (tong !== null) dungLuong = tong;
        if (phanTram === phanTramCu) return;
        phanTramCu = phanTram;
        setTrangThai({ loai: "dang-tai", phanTram });
      })
      .then((goc) => {
        if (huy) return;
        baoXong = () =>
          goiLai.current.onDaTai?.({
            ...thongKeMoHinh(goc),
            thoiGianMs: performance.now() - batDau,
            dungLuong,
            gpu: canh.tenGpu(),
          });
        soKhungDaVe = 0;
        setTrangThai({ loai: "xong" });
      })
      .catch((loi: unknown) => {
        if (huy) return;
        console.error(loi);
        setTrangThai(trangThaiLoi(loi));
      });

    return () => {
      huy = true;
      canh.huy();
    };
  }, [nguon, lanThu]);

  return (
    <div className={cn("relative overflow-hidden grid3d", className)}>
      <div ref={khungRef} className="absolute inset-0" role="img" aria-label={nhan} />
      <LopTrangThai trangThai={trangThai} onThuLai={() => setLanThu((n) => n + 1)} />
    </div>
  );
}
