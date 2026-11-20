/**
 * Tải Three.js khi cần: trang danh sách không phải tải ~600 KB thư viện 3D.
 * Bọc ErrorBoundary: tải chunk lỗi (mất mạng, vừa triển khai bản mới) hay lỗi bất ngờ trong khung 3D chỉ làm
 * hỏng khung này, không làm trắng cả trang.
 */
import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import type { ModelViewerProps } from "./ModelViewer";
import { cn } from "@/lib/utils";

// React giữ kết quả lỗi của một lazy(): thử lại phải tạo lazy mới để tải lại chunk.
const taoLazy = () => lazy(() => import("./ModelViewer"));

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

export function ModelViewerLazy(props: ModelViewerProps) {
  // Thành phần lazy nằm trong state: "Thử lại" tạo lazy mới và render lại ngay chính thành phần này.
  const [Viewer, setViewer] = useState(taoLazy);
  return (
    <BatLoi className={props.className} onRetry={() => setViewer(() => taoLazy())}>
      <Suspense
        fallback={
          <div
            className={cn("grid place-items-center rounded-card border border-line grid3d", props.className)}
          >
            <span className="text-[14px] text-text-2">Đang chuẩn bị khung xem 3D</span>
          </div>
        }
      >
        <Viewer {...props} />
      </Suspense>
    </BatLoi>
  );
}
