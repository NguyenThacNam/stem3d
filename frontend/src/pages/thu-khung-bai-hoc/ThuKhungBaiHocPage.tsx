/**
 * Trang thử khung bài học 3D (BH01). CHỈ có khi chạy `npm run dev`, không có trong menu và bản build.
 * Chạy bằng dữ liệu mẫu theo khuôn dạng API 9; HT02 làm trang thật /bai-hoc/:id gọi API.
 * Thanh trên cùng chọn mẫu: kính hiển vi (8 bộ phận), phân tử nước (3 bộ phận), một file GLB trên máy (mỗi mesh
 * một bộ phận – để đo tốc độ), bật cỡ chữ Tiểu học, giả lập giáo viên điều khiển lớp (LH05).
 */
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { LessonDetail } from "@/api/types";
import type { NguonMoHinh } from "@/components/mo-hinh-3d/canh-bai-hoc";
import { Button } from "@/components/ui/button";
import { KhungBaiHoc, type ThongTinKhung } from "@/pages/khung-bai-hoc/KhungBaiHoc";
import { BAI_KINH_HIEN_VI, BAI_PHAN_TU_NUOC, baiTuTep } from "./du-lieu-mau";

type Mau = { loai: "bai"; bai: LessonDetail } | { loai: "tep"; tep: File; tenMesh: string[] | null };

const so = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });

export default function ThuKhungBaiHocPage() {
  const navigate = useNavigate();
  const [mau, setMau] = useState<Mau>({ loai: "bai", bai: BAI_KINH_HIEN_VI });
  const [tieuHoc, setTieuHoc] = useState(false);
  const [dieuKhien, setDieuKhien] = useState(false);
  const [thongTin, setThongTin] = useState<ThongTinKhung | null>(null);
  const [fps, setFps] = useState(0);
  const oChonTep = useRef<HTMLInputElement>(null);

  // Chỉ đổi nguồn khi đổi file (biết tên mesh rồi cập nhật `mau` không được làm tải lại mô hình).
  const tep = mau.loai === "tep" ? mau.tep : null;
  const nguon = useMemo<NguonMoHinh | undefined>(
    () => (tep ? { loai: "tep", tep, ten: tep.name } : undefined),
    [tep],
  );
  const bai = useMemo<LessonDetail>(() => {
    const goc = mau.loai === "bai" ? mau.bai : baiTuTep(mau.tep.name, mau.tenMesh ?? []);
    return tieuHoc ? { ...goc, grade: 4 } : goc;
  }, [mau, tieuHoc]);

  const doiMau = (moi: Mau) => {
    setThongTin(null);
    setFps(0);
    setMau(moi);
  };

  const chonTep = (e: ChangeEvent<HTMLInputElement>) => {
    const tep = e.target.files?.[0];
    e.target.value = "";
    if (tep) doiMau({ loai: "tep", tep, tenMesh: null });
  };

  const daTai = (tt: ThongTinKhung) => {
    setThongTin(tt);
    // File trên máy: biết tên mesh rồi mới dựng danh sách bộ phận (mỗi mesh một bộ phận).
    setMau((m) => (m.loai === "tep" && m.tenMesh === null ? { ...m, tenMesh: tt.tenMesh } : m));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-4 py-2 text-[14px]">
        <span className="mr-2 font-medium">Trang thử khung bài học (chỉ bản dev)</span>
        <Button size="sm" onClick={() => doiMau({ loai: "bai", bai: BAI_KINH_HIEN_VI })}>
          Kính hiển vi
        </Button>
        <Button size="sm" onClick={() => doiMau({ loai: "bai", bai: BAI_PHAN_TU_NUOC })}>
          Phân tử nước
        </Button>
        <Button size="sm" onClick={() => oChonTep.current?.click()}>
          Mở file GLB trên máy
        </Button>
        <input
          ref={oChonTep}
          type="file"
          accept=".glb,model/gltf-binary"
          className="hidden"
          onChange={chonTep}
          aria-label="Chọn file GLB"
        />
        <label className="ml-2 flex items-center gap-1.5">
          <input type="checkbox" checked={tieuHoc} onChange={(e) => setTieuHoc(e.target.checked)} />
          Cỡ Tiểu học
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={dieuKhien} onChange={(e) => setDieuKhien(e.target.checked)} />
          Giả lập giáo viên điều khiển
        </label>
        <span className="ml-auto text-text-2" data-testid="so-lieu">
          {thongTin
            ? `${so(thongTin.soTamGiac)} tam giác · tải và dựng ${so(thongTin.thoiGianMs)} ms · ${so(fps)} khung hình/giây`
            : "Đang tải"}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <KhungBaiHoc
          bai={bai}
          nguon={nguon}
          onQuayLai={() => navigate("/thu-mo-hinh-3d")}
          dangBiDieuKhien={dieuKhien}
          onDaTai={daTai}
          onFps={setFps}
        />
      </div>
    </div>
  );
}
