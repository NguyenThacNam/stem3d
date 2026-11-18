import { LogOut } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/auth/AuthProvider";
import { MENUS, ROLE_LABEL } from "@/lib/roles";
import { cn, initials } from "@/lib/utils";
import { Brand } from "./Brand";

/** Bố cục chung sau đăng nhập (mục 3.2.2): thanh bên trái theo vai trò + vùng nội dung. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dangThoat, setDangThoat] = useState(false);
  if (!user) return null;

  async function dangXuat() {
    setDangThoat(true);
    await logout();
    navigate("/dang-nhap", { replace: true });
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-line bg-surface px-3 py-4">
        <div className="px-2 pt-1 pb-5">
          <Brand />
        </div>
        <nav aria-label="Menu chính" className="flex-1 overflow-y-auto">
          {MENUS[user.role].map((group) => (
            <div key={group.label}>
              <div className="px-2.5 pt-4 pb-1.5 text-[13px] text-text-2">{group.label}</div>
              {group.items.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    cn(
                      "mb-0.5 flex h-10 items-center gap-2.5 rounded-ctl px-2.5 text-[15px] text-text-2 hover:bg-surface-2 hover:text-text",
                      isActive && "bg-surface-2 text-text shadow-[inset_0_0_0_1px_var(--color-line)]",
                    )
                  }
                >
                  <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-3 pb-1">
          <div
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[13px] font-medium text-text-2"
          >
            {initials(user.full_name)}
          </div>
          {/* Thanh bên hẹp: dòng phụ chỉ ghi vai trò như mẫu; tên trường hiện khi rê chuột. */}
          <div className="min-w-0 leading-snug" title={user.school?.name}>
            <div className="truncate text-[14px] font-medium">{user.full_name}</div>
            <div className="truncate text-[13px] text-text-2">{ROLE_LABEL[user.role]}</div>
          </div>
          <button
            type="button"
            onClick={dangXuat}
            disabled={dangThoat}
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-ctl text-text-2 hover:bg-surface-2 hover:text-text disabled:opacity-45"
          >
            <LogOut className="size-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto px-8 py-7">
        <Outlet />
      </main>
    </div>
  );
}
