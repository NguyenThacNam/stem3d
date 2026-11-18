import type { ReactNode } from "react";
import caChep from "@/assets/ca-chep.png";
import { Brand } from "./Brand";

/**
 * Bố cục màn đăng nhập / đổi mật khẩu bắt buộc (Hình 3-3): trái là mô hình mẫu trên nền lưới ô li,
 * phải là biểu mẫu. Không có menu.
 */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <section
        aria-label="Bài mẫu"
        className="relative hidden flex-[0_0_55.5%] border-r border-line grid3d lg:block"
      >
        <img
          src={caChep}
          alt="Mô hình 3D cá chép, phần vây và đường bên được tô sáng"
          className="absolute top-[26%] left-[8%] w-[84%] select-none"
          draggable={false}
        />
        <div className="absolute right-10 bottom-9 left-10 flex items-end justify-between gap-6">
          <div>
            <div className="text-[13px] text-text-2">Bài mẫu</div>
            <div className="text-[15px] font-medium">Cá chép – cấu tạo ngoài · Khoa học tự nhiên</div>
          </div>
          <div className="text-[13px] text-text-2">Kéo để xoay · chụm hai ngón để phóng to</div>
        </div>
      </section>

      {/* Một cột 448 px căn giữa nửa phải: ở 1440 lề tự bằng 96 px như mẫu, ở 1366 là 80 px. */}
      <main className="flex min-h-full flex-1 bg-surface px-6 py-10">
        <div className="mx-auto flex w-full max-w-[448px] flex-col">
          <Brand />
          <div className="my-auto flex flex-col gap-5 py-10">{children}</div>
          {footer && <div className="text-[13px] text-text-2">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
