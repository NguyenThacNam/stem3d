import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui DropdownMenu, gọn cho menu "⋯" cuối dòng bảng. Mục nguy hiểm (xóa) dùng tone="danger".

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[180px] rounded-ctl border border-line bg-surface p-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Item> & { tone?: "danger" }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex h-9 cursor-default items-center gap-2.5 rounded-[6px] px-2.5 text-[14px] text-text outline-none select-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-text-2",
        tone === "danger" && "text-danger data-[highlighted]:bg-danger-weak [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}
