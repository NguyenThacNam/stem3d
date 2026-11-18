/**
 * Phiên đăng nhập của ứng dụng. Access token nằm trong src/api/client.ts (bộ nhớ);
 * ở đây chỉ giữ thông tin tài khoản để vẽ giao diện.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/api/auth";
import { ApiError, configureClient, setAccessToken } from "@/api/client";
import type { Me } from "@/api/types";

type Status = "loading" | "anonymous" | "authenticated" | "error";

interface AuthContextValue {
  status: Status;
  user: Me | null;
  /** Lý do phiên vừa kết thúc (ví dụ "Tài khoản đã bị khóa…"), hiện ở màn đăng nhập. */
  notice: string | null;
  clearNotice: () => void;
  /** Đăng nhập; trả thông tin tài khoản để trang biết chuyển đi đâu. */
  login: (username: string, password: string) => Promise<Me>;
  changePassword: (current: string, next: string, confirm: string) => Promise<Me>;
  logout: () => Promise<void>;
  /** Thử khôi phục phiên lại (sau lỗi mạng lúc tải trang). */
  restore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Lỗi xác thực (401) hoặc tài khoản / trường bị khóa (403): phiên không còn, về màn đăng nhập. */
function laLoiPhien(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<Me | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const clear = useCallback((reason?: string) => {
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
    if (reason) setNotice(reason);
  }, []);

  const restore = useCallback(async () => {
    setStatus("loading");
    try {
      const session = await authApi.refreshSession();
      if (!session) {
        clear();
        return;
      }
      setUser(await authApi.getMe());
      setStatus("authenticated");
    } catch (err) {
      if (laLoiPhien(err)) {
        clear(err.status === 403 ? err.message : undefined);
        return;
      }
      // Chỉ lỗi mạng / máy chủ mới hiện màn "Không kết nối được máy chủ" kèm nút thử lại.
      setStatus("error");
    }
  }, [clear]);

  useEffect(() => {
    configureClient({
      onSessionExpired: clear,
      onPasswordChangeRequired: () => setUser((u) => (u ? { ...u, must_change_password: true } : u)),
    });
    void restore();
  }, [clear, restore]);

  const login = useCallback(async (username: string, password: string) => {
    const token = await authApi.login(username, password);
    // Phản hồi đăng nhập đã đủ thông tin (Bảng 3-8): không gọi thêm /me.
    const me = authApi.meFromToken(token, username);
    setNotice(null);
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string, confirm: string) => {
      const token = await authApi.changePassword(current, next, confirm);
      // Mật khẩu đã đổi xong: lấy thông tin từ phản hồi, không để lỗi /me làm người dùng tưởng là thất bại.
      const me = authApi.meFromToken(token, user?.username ?? "");
      setUser(me);
      return me;
    },
    [user?.username],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({ status, user, notice, clearNotice, login, changePassword, logout, restore }),
    [status, user, notice, clearNotice, login, changePassword, logout, restore],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}
