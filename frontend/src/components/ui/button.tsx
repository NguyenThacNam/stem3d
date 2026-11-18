import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn/ui Button, chỉnh theo quy ước mục 3.2.1: cao 40 px, chữ 15 px đậm 500, bo 8 px.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl border text-[15px] font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-white hover:border-accent-ink hover:bg-accent-ink",
        secondary: "border-line-2 bg-surface text-text hover:bg-surface-2",
        ghost: "border-transparent bg-transparent text-text-2 hover:bg-surface-2 hover:text-text",
      },
      size: {
        md: "h-10 px-4",
        lg: "h-11 px-4",
        sm: "h-8 px-3 text-[13px]",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
