/**
 * Khung xem trước 3D của màn Mô hình 3D: dùng thành phần chung `MoHinh3D` (NT08), nạp lười để trang danh sách
 * không phải tải Three.js. Bọc ErrorBoundary: tải chunk lỗi (mất mạng, vừa triển khai bản mới) chỉ làm hỏng khung
 * này, không làm trắng cả trang.
 */
import { Component, lazy, Suspense, useMemo, useState, type ReactNode, type Ref } from "react";
import type { DieuKhien3D, NguonMoHinh } from "@/components/mo-hinh-3d/MoHinh3D";
import { cn } from "@/lib/utils";

// React giữ kết quả lỗi của một lazy(): thử lại phải tạo lazy mới để tải lại chunk.
const taoLazy = () =>
  lazy(() => import("@/components/mo-hinh-3d/MoHinh3D").then((m) => ({ default: m.MoHinh3D })));

class BatLoi extends Component<
  { className?: string; onRetry: () => void; children: ReactNode },
  { loi: boolean }
> {
  state = { loi: false };

  static getDerivedStateFromError() {
    return { loi: true };
  }

  render() {
    if (!this.state.loi) return this.props.children;
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-card border border-line grid3d px-6 text-center",
          this.props.className,
        )}
      >
        <span className="text-[14px] text-text-2">
          Không mở được khung xem 3D, hãy kiểm tra mạng rồi thử lại
        </span>
        <button
          type="button"
          onClick={() => {
            this.props.onRetry();
            this.setState({ loi: false });
          }}
          className="h-8 rounded-ctl border border-line-2 bg-surface px-3 text-[13px] font-medium text-text hover:bg-surface-2"
        >
          Thử lại
        </button>
      </div>
    );
  }
}

export function XemTruoc3D({
  url,
  file,
  ten,
  className,
  onBamPhan,
  phanToSang,
  dieuKhienRef,
}: {
  /** File đã nạp (/content/models/...). */
  url?: string;
  /** File trên máy, chưa gửi lên – đọc thẳng để xem trước. */
  file?: File;
  /** Tên cố định theo file / url (chỉ lấy lúc đổi nguồn): không truyền tên đang gõ vào đây. */
  ten: string;
  className?: string;
  /** Gắn nhãn bộ phận (ND03): xem `MoHinh3D`. */
  onBamPhan?: (ten: string | null, giuShift: boolean) => void;
  phanToSang?: readonly string[];
  dieuKhienRef?: Ref<DieuKhien3D>;
}) {
  // Thành phần lazy nằm trong state: "Thử lại" tạo lazy mới và render lại ngay chính thành phần này.
  const [MoHinh3D, setMoHinh3D] = useState(taoLazy);
  const khung = cn("rounded-card border border-line", className);
  // MoHinh3D tải lại khi object `nguon` đổi: chỉ tạo lại khi đổi file / url (không theo tên đang gõ).
  const nguon = useMemo<NguonMoHinh | null>(
    () => (file ? { loai: "tep", tep: file, ten } : url ? { loai: "url", url, ten } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, file],
  );
  if (!nguon) return null;
  return (
    <BatLoi className={khung} onRetry={() => setMoHinh3D(() => taoLazy())}>
      <Suspense
        fallback={
          <div className={cn("grid place-items-center grid3d", khung)}>
            <span className="text-[14px] text-text-2">Đang chuẩn bị khung xem 3D</span>
          </div>
        }
      >
        <MoHinh3D
          nguon={nguon}
          nhan={`Bản xem trước 3D: ${ten}`}
          className={khung}
          onBamPhan={onBamPhan}
          phanToSang={phanToSang}
          ref={dieuKhienRef}
        />
      </Suspense>
    </BatLoi>
  );
}
