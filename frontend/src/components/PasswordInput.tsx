import { Eye, EyeOff, Lock } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Input } from "./ui/input";

/** Ô mật khẩu có nút hiện/ẩn (Hình 3-3). */
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "leading" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      leading={<Lock strokeWidth={1.5} />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          className="-mr-1 flex size-8 items-center justify-center rounded-ctl text-muted hover:text-text-2"
        >
          {visible ? (
            <EyeOff className="size-4" strokeWidth={1.5} />
          ) : (
            <Eye className="size-4" strokeWidth={1.5} />
          )}
        </button>
      }
    />
  );
}
