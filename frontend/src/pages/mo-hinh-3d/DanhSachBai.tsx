/** Danh sách bài học đang dùng mô hình (chi tiết mô hình và báo lỗi không xóa được – UC 21 luồng 6.1). */
import type { AssetLessonRef } from "@/api/assets";
import { cn } from "@/lib/utils";

export function DanhSachBai({ lessons, className }: { lessons: AssetLessonRef[]; className?: string }) {
  return (
    <ul className={cn("overflow-hidden rounded-ctl border border-line", className)}>
      {lessons.map((b) => (
        <li
          key={b.id}
          className="flex h-10 items-center justify-between gap-3 border-b border-line px-3 last:border-b-0"
        >
          <span className="truncate text-[14px]">{b.title}</span>
          <span className="inline-flex shrink-0 items-center gap-2 text-[13px] text-text-2">
            <span
              aria-hidden
              className={cn("size-[7px] rounded-full", b.status === "PUBLISHED" ? "bg-accent" : "bg-muted")}
            />
            {b.status === "PUBLISHED" ? "Đã xuất bản" : "Nháp"}
          </span>
        </li>
      ))}
    </ul>
  );
}
