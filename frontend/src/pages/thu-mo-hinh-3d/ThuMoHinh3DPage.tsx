/**
 * Trang thử hiển thị mô hình 3D (NT08). CHỈ có khi chạy `npm run dev`, không có trong menu và bản build.
 * Mở mô hình mẫu (scripts/tao-mo-hinh-mau.mjs) hoặc một file GLB trên máy để đo thời gian tải, số khung hình/giây khi xoay
 * (số liệu tham khảo cho BH02) và xem tên các mesh (để gắn nhãn bộ phận ở BH01, ND03).
 */
import { FolderOpen, RotateCcw } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import urlMoHinhMau from "@/assets/mo-hinh-thu/phan-tu-nuoc.v1.glb?url";
import { MoHinh3D, type NguonMoHinh, type ThongTinTai } from "@/components/mo-hinh-3d/MoHinh3D";
import { Button } from "@/components/ui/button";

const MO_HINH_MAU: NguonMoHinh = {
  loai: "url",
  url: urlMoHinhMau,
  ten: "Phân tử nước (mô hình mẫu)",
};

const so = (n: number, chuSoLe = 0) =>
  n.toLocaleString("vi-VN", { minimumFractionDigits: chuSoLe, maximumFractionDigits: chuSoLe });

function dungLuong(byte: number | null): string {
  if (byte === null) return "Không rõ";
  // Đơn vị thập phân (1 MB = 1.000.000 byte) như ngưỡng 150 MB khi nạp mô hình (ND01).
  if (byte < 1e6) return `${so(byte / 1e3, 1)} KB`;
  return `${so(byte / 1e6, 1)} MB`;
}

function DongThongTin({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-text-2">{nhan}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{giaTri}</dd>
    </div>
  );
}

export default function ThuMoHinh3DPage() {
  const [nguon, setNguon] = useState<NguonMoHinh>(MO_HINH_MAU);
  const [thongTin, setThongTin] = useState<ThongTinTai | null>(null);
  const [fps, setFps] = useState(0);
  const oChonTep = useRef<HTMLInputElement>(null);

  const doiNguon = (moi: NguonMoHinh) => {
    setThongTin(null);
    setFps(0);
    setNguon(moi);
  };

  const chonTep = (e: ChangeEvent<HTMLInputElement>) => {
    const tep = e.target.files?.[0];
    e.target.value = ""; // chọn lại cùng file vẫn mở lại được
    if (tep) doiNguon({ loai: "tep", tep, ten: tep.name });
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-3">
        <div>
          <h1 className="text-[18px] leading-snug font-medium">Thử hiển thị mô hình 3D</h1>
          <p className="text-[14px] text-text-2">Trang thử, chỉ có khi chạy trên máy phát triển</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => doiNguon({ ...MO_HINH_MAU })}>
            <RotateCcw aria-hidden />
            Mô hình mẫu
          </Button>
          <Button variant="primary" onClick={() => oChonTep.current?.click()}>
            <FolderOpen aria-hidden />
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
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <MoHinh3D
            nguon={nguon}
            nhan={`Mô hình 3D: ${nguon.ten}`}
            onDaTai={setThongTin}
            onFps={setFps}
            className="absolute inset-0"
          />
          <p className="pointer-events-none absolute bottom-3 left-4 text-[13px] text-text-2">
            Kéo để xoay · cuộn hoặc chụm hai ngón để phóng to
          </p>
        </main>

        <aside className="flex w-[320px] shrink-0 flex-col gap-6 overflow-y-auto border-l border-line p-6 text-[14px]">
          <section>
            <h2 className="mb-2 text-[15px] font-medium">Thông tin</h2>
            <dl>
              <DongThongTin nhan="Mô hình" giaTri={nguon.ten} />
              {thongTin ? (
                <>
                  <DongThongTin nhan="Dung lượng" giaTri={dungLuong(thongTin.dungLuong)} />
                  <DongThongTin nhan="Thời gian tải và dựng" giaTri={`${so(thongTin.thoiGianMs)} ms`} />
                  <DongThongTin nhan="Số bộ phận (mesh)" giaTri={so(thongTin.soMesh)} />
                  <DongThongTin nhan="Phần chưa đặt tên" giaTri={so(thongTin.soKhongTen)} />
                  <DongThongTin nhan="Số tam giác" giaTri={so(thongTin.soTamGiac)} />
                  <DongThongTin nhan="Khung hình/giây" giaTri={so(fps)} />
                  <DongThongTin nhan="Bộ xử lý đồ họa" giaTri={thongTin.gpu ?? "Trình duyệt không báo"} />
                </>
              ) : (
                <p className="py-1.5 text-text-2">Số liệu hiện sau khi mô hình tải xong.</p>
              )}
            </dl>
          </section>

          {thongTin && (
            <section>
              <h2 className="mb-2 flex justify-between text-[15px] font-medium">
                Tên các mesh <span className="font-normal text-text-2">{thongTin.tenMesh.length}</span>
              </h2>
              <ul>
                {thongTin.tenMesh.map((ten, i) => (
                  <li key={i} className="py-1 break-all">
                    {ten}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
