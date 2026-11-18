import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Alert theo mẫu .alert: đỏ = lỗi, vàng = cảnh báo, xanh = thành công.
// Không đặt role="alert": trang bọc thông báo trong một vùng aria-live duy nhất để trình đọc màn hình
// chỉ đọc một lần.
const alertVariants = cva(
  "flex items-start gap-2.5 rounded-alert px-3.5 py-3 text-[14px] [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        danger: "bg-danger-weak text-danger-ink",
        warn: "bg-warn-weak text-warn",
        success: "bg-accent-weak text-accent-ink",
      },
    },
    defaultVariants: { tone: "danger" },
  },
);

export function Alert({
  className,
  tone,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-alert className={cn(alertVariants({ tone }), className)} {...props} />;
}
