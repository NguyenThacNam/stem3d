import { Lock } from "lucide-react";
import { useState } from "react";
import { formatCountdown } from "@/lib/utils";
import { Alert } from "./ui/alert";

/**
 * Thông báo khóa tạm kèm đồng hồ đếm ngược (mẫu Hình 3-3).
 * Trình đọc màn hình chỉ đọc một câu cố định lúc hiện (số phút), không đọc lại mỗi giây đồng hồ chạy.
 */
export function LockedAlert({ seconds }: { seconds: number }) {
  const [phutLucDau] = useState(() => Math.max(1, Math.ceil(seconds / 60)));
  return (
    <Alert tone="warn">
      <Lock strokeWidth={1.5} aria-hidden />
      <div>
        <span className="sr-only">
          Tài khoản đang tạm khóa do nhập sai 5 lần liên tiếp. Thử lại sau khoảng {phutLucDau} phút.
        </span>
        <span aria-hidden>
          Tài khoản đang tạm khóa do nhập sai 5 lần liên tiếp. Thử lại sau{" "}
          {/* Phông mono của hệ thống (không phải Be Vietnam Pro): đậm 600 như mẫu để số dễ thấy. */}
          <b className="font-mono text-[14px] font-semibold">{formatCountdown(seconds)}</b>
        </span>
      </div>
    </Alert>
  );
}
