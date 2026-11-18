import { Button } from "./ui/button";

/**
 * Trạng thái đang tải (khung xám giữ chỗ) khi khôi phục phiên lúc tải trang.
 * `variant="auth"`: bố cục như màn đăng nhập (không có thanh bên) để màn không nháy lệch.
 */
export function LoadingScreen({ variant = "app" }: { variant?: "app" | "auth" }) {
  return (
    <div className="flex h-full" role="status" aria-busy="true">
      <span className="sr-only">Đang tải</span>
      {variant === "auth" ? (
        <>
          <div className="hidden flex-[0_0_55.5%] border-r border-line grid3d lg:block" />
          <div className="flex flex-1 flex-col bg-surface px-6 py-10">
            <div className="mx-auto flex w-full max-w-[448px] flex-col gap-5 pt-[30vh]">
              <div className="h-8 w-48 animate-pulse rounded-ctl bg-surface-2" />
              <div className="h-10 animate-pulse rounded-ctl bg-surface-2" />
              <div className="h-10 animate-pulse rounded-ctl bg-surface-2" />
              <div className="h-11 animate-pulse rounded-ctl bg-surface-3" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="w-[248px] shrink-0 border-r border-line bg-surface p-4">
            <div className="mb-8 h-8 w-40 animate-pulse rounded-ctl bg-surface-2" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="mb-2 h-9 animate-pulse rounded-ctl bg-surface-2" />
            ))}
          </div>
          <div className="flex-1 p-8">
            <div className="mb-6 h-7 w-64 animate-pulse rounded-ctl bg-surface-3" />
            <div className="h-48 animate-pulse rounded-card bg-surface-2" />
          </div>
        </>
      )}
    </div>
  );
}

/** Lỗi khi khôi phục phiên (mất mạng, máy chủ lỗi): thông báo và nút thử lại. */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div role="alert" className="max-w-md rounded-card border border-line bg-surface p-8 text-center">
        <h1 className="text-[20px] font-medium">Không kết nối được máy chủ</h1>
        <p className="mt-2 text-text-2">Hãy kiểm tra mạng của trường rồi bấm thử lại.</p>
        <Button variant="primary" className="mt-6" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
