import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Input, thêm chỗ cho biểu tượng đầu và nút cuối (hiện/ẩn mật khẩu) như mẫu Hình 3-3.
export function Input({
  className,
  leading,
  trailing,
  invalid,
  ...props
}: ComponentProps<"input"> & { leading?: ReactNode; trailing?: ReactNode; invalid?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-ctl border border-line-2 bg-surface px-3 text-text focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-accent/25",
        // Ô lỗi giữ viền đỏ cả khi đang chọn.
        invalid && "border-danger focus-within:border-danger focus-within:outline-danger/25",
        className,
      )}
    >
      {leading && <span className="flex text-muted [&_svg]:size-4">{leading}</span>}
      <input
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-2 focus-visible:outline-none"
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing}
    </div>
  );
}
