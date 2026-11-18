/** Trang tạm cho các mục menu chưa làm: tiêu đề trang và trạng thái rỗng có câu hướng dẫn. */
import { Construction } from "lucide-react";
import type { Role } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import type { MenuItem } from "@/lib/roles";

/** Xưng hô theo người đang xem: học sinh là "em", giáo viên là "thầy cô", vai trò quản trị là "bạn". */
const LOI_HUONG_DAN: Record<Role, string> = {
  STUDENT: "Trong lúc chờ, em có thể dùng các mục khác ở thanh bên.",
  TEACHER: "Trong lúc chờ, thầy cô có thể dùng các mục khác ở thanh bên.",
  SCHOOL_ADMIN: "Trong lúc chờ, bạn có thể dùng các mục khác ở thanh bên.",
  CONTENT_EDITOR: "Trong lúc chờ, bạn có thể dùng các mục khác ở thanh bên.",
  SYSTEM_ADMIN: "Trong lúc chờ, bạn có thể dùng các mục khác ở thanh bên.",
};

export function TrangTamPage({ item }: { item: MenuItem }) {
  const { user } = useAuth();
  return (
    <>
      <header>
        <h1 className="text-[22px] leading-snug font-medium">{item.label}</h1>
        <p className="mt-0.5 text-[14px] text-text-2">{item.description}</p>
      </header>
      <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
        <Construction className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
        <p className="font-medium">Chức năng đang được xây dựng</p>
        <p className="max-w-md text-[14px] text-text-2">
          Mục {item.label.toLowerCase()} sẽ có trong các bản cập nhật tới.{" "}
          {user ? LOI_HUONG_DAN[user.role] : ""}
        </p>
      </section>
    </>
  );
}
