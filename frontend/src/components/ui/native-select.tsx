import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Ô chọn dùng <select> của trình duyệt (bàn phím, trình đọc màn hình sẵn có), kiểu giống Input: cao 40 px, bo 8 px.
export function NativeSelect({
  className,
  invalid,
  ...props
}: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <div className={cn("relative", className)}>
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full appearance-none rounded-ctl border border-line-2 bg-surface pr-9 pl-3 text-[15px] text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25 disabled:opacity-60",
          invalid && "border-danger",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
