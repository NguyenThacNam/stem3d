import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Dialog theo mẫu .dialog (docs/giao-dien-chuong-3.html): nền phủ rgba(24,26,25,.32), bo 16 px,
// đệm 24 px, tiêu đề 18 px đậm 500, chân hộp thoại căn phải cách 24 px. Không hiệu ứng chuyển cảnh.

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(24,26,25,0.32)]" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-48px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-panel bg-surface p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)] focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-ctl text-text-2 hover:bg-surface-2 hover:text-text"
            aria-label="Đóng"
          >
            <X className="size-[18px]" strokeWidth={1.5} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("pr-10 text-[18px] leading-snug font-medium", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("mt-1 text-[14px] text-text-2", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />;
}
