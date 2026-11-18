/** Nhóm 1 – xác thực (Bảng 3-2, API 1–5). */
import { endSession, request, setAccessToken } from "./client";
import type { Me, TokenOut } from "./types";

export async function login(username: string, password: string): Promise<TokenOut> {
  const token = await request<TokenOut>("/api/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  setAccessToken(token.access_token);
  return token;
}

export async function logout(): Promise<void> {
  // Chờ refresh đang chạy (nếu có) xong trước, để cookie nó vừa đặt bị /logout xóa.
  await endSession();
  try {
    await request<void>("/api/auth/logout", { method: "POST", auth: false });
  } finally {
    // Dù máy chủ lỗi, máy này vẫn bỏ phiên.
    setAccessToken(null);
  }
}

export function getMe(): Promise<Me> {
  return request<Me>("/api/auth/me");
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<TokenOut> {
  const token = await request<TokenOut>("/api/auth/change-password", {
    method: "POST",
    body: {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    },
  });
  setAccessToken(token.access_token);
  return token;
}

/** Dựng thông tin tài khoản từ phản hồi đăng nhập / đổi mật khẩu – không cần gọi thêm /me. */
export function meFromToken(token: TokenOut, username: string): Me {
  return { ...token.user, username, must_change_password: token.must_change_password };
}

export { refreshSession } from "./client";
