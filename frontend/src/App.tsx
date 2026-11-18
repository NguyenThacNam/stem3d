import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import type { Role } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { ErrorScreen, LoadingScreen } from "@/components/FullScreenStatus";
import { ALL_PAGES, homePath } from "@/lib/roles";
import { DangNhapPage } from "@/pages/dang-nhap/DangNhapPage";
import { DoiMatKhauPage } from "@/pages/doi-mat-khau/DoiMatKhauPage";
import { TrangTamPage } from "@/pages/trang-tam/TrangTamPage";

const TRANG_XAC_THUC = ["/", "/dang-nhap", "/doi-mat-khau"];

/** Chờ khôi phục phiên lúc tải trang; lỗi mạng thì hiện nút thử lại. */
function SessionGate() {
  const { status, restore } = useAuth();
  const { pathname } = useLocation();
  if (status === "loading")
    return <LoadingScreen variant={TRANG_XAC_THUC.includes(pathname) ? "auth" : "app"} />;
  if (status === "error") return <ErrorScreen onRetry={() => void restore()} />;
  return <Outlet />;
}

/** Trang công khai (đăng nhập): đã đăng nhập thì chuyển đi. */
function PublicOnly() {
  const { user } = useAuth();
  const dich = user ? (user.must_change_password ? "/doi-mat-khau" : homePath(user.role)) : null;
  // dich === "/dang-nhap" chỉ xảy ra với vai trò lạ: ở lại trang, tránh vòng chuyển hướng.
  if (dich && dich !== "/dang-nhap") return <Navigate to={dich} replace />;
  return <Outlet />;
}

/** Màn đổi mật khẩu bắt buộc: chỉ dành cho tài khoản đang phải đổi mật khẩu. */
function MustChangeOnly() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (!user.must_change_password) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}

/** Trang sau đăng nhập: chưa đăng nhập về màn đăng nhập; phải đổi mật khẩu thì sang màn đổi mật khẩu. */
function RequireAuth() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (user.must_change_password) return <Navigate to="/doi-mat-khau" replace />;
  return <Outlet />;
}

/** Trang không thuộc vai trò hiện tại: về trang chủ của vai trò. */
function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role))
    return <Navigate to={user ? homePath(user.role) : "/dang-nhap"} replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePath(user.role) : "/dang-nhap"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<SessionGate />}>
        <Route element={<PublicOnly />}>
          <Route path="/dang-nhap" element={<DangNhapPage />} />
        </Route>
        <Route element={<MustChangeOnly />}>
          <Route path="/doi-mat-khau" element={<DoiMatKhauPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {ALL_PAGES.map(({ item, roles }) => (
              <Route key={item.path} element={<RequireRole roles={roles} />}>
                <Route path={item.path} element={<TrangTamPage item={item} />} />
              </Route>
            ))}
          </Route>
        </Route>
        {/* Trang giới thiệu chưa làm: tạm chuyển "/" và đường dẫn lạ về trang chủ / đăng nhập. */}
        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}
