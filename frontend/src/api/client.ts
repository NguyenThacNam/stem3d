/**
 * Một chỗ duy nhất gọi API.
 * - Access token chỉ giữ trong biến của module này (không localStorage/sessionStorage).
 * - Refresh token nằm trong cookie httpOnly do máy chủ đặt; trình duyệt tự gửi, mã ở đây không đọc/ghi.
 * - Gặp 401 TOKEN_EXPIRED: gọi /api/auth/refresh (một lần dùng chung cho mọi yêu cầu đang chờ) rồi gửi lại
 *   yêu cầu đúng một lần. Refresh thất bại thì xóa phiên và báo cho ứng dụng.
 * - Gặp 403 PASSWORD_CHANGE_REQUIRED: báo cho ứng dụng chuyển sang màn đổi mật khẩu.
 */
import type { TokenOut } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ClientHandlers {
  /**
   * Phiên không còn dùng được (refresh thất bại, token không hợp lệ, tài khoản / trường bị khóa):
   * ứng dụng về màn đăng nhập. `reason` là câu thông báo của máy chủ khi cần cho người dùng biết lý do.
   */
  onSessionExpired?: (reason?: string) => void;
  /** Tài khoản phải đổi mật khẩu trước khi dùng các chức năng khác. */
  onPasswordChangeRequired?: () => void;
}

const LOI_MANG = "Không kết nối được máy chủ, hãy kiểm tra mạng rồi thử lại";
const LOI_MAY_CHU = "Máy chủ đang bận, vui lòng thử lại sau ít phút";
const REFRESH_PATH = "/api/auth/refresh";

/** Tài khoản / trường bị khóa giữa phiên: máy chủ trả 403 cho mọi yêu cầu, coi như hết phiên. */
const MA_HET_PHIEN_403 = new Set(["ACCOUNT_DISABLED", "SCHOOL_DISABLED"]);

let accessToken: string | null = null;
let handlers: ClientHandlers = {};
let refreshing: Promise<TokenOut | null> | null = null;
/** Tăng mỗi lần kết thúc phiên: kết quả refresh bắt đầu từ phiên cũ về sau thì bỏ, không gán lại token. */
let generation = 0;

export function configureClient(next: ClientHandlers): void {
  handlers = next;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, body: unknown): ApiError {
  const err = (body as { error?: { code?: unknown; message?: unknown; details?: unknown } } | null)?.error;
  if (err && typeof err.code === "string" && typeof err.message === "string") {
    return new ApiError(status, err.code, err.message, err.details ?? null);
  }
  // Phản hồi không theo khuôn dạng lỗi chung (ví dụ Nginx trả trang 502).
  return new ApiError(status, "HTTP_ERROR", LOI_MAY_CHU);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", LOI_MANG);
  }
}

/**
 * Lấy access token mới bằng cookie refresh. Nhiều lời gọi cùng lúc dùng chung một yêu cầu.
 * Trả null nếu phiên không còn (401); ném ApiError nếu lỗi mạng / máy chủ.
 */
export function refreshSession(): Promise<TokenOut | null> {
  if (!refreshing) {
    const phien = generation;
    refreshing = (async () => {
      const res = await send(REFRESH_PATH, { method: "POST" });
      const body = await readBody(res);
      if (res.ok) {
        // Người dùng đã đăng xuất trong lúc chờ: không khôi phục phiên.
        if (phien !== generation) return null;
        const token = body as TokenOut;
        accessToken = token.access_token;
        return token;
      }
      if (res.status === 401) {
        accessToken = null;
        return null;
      }
      throw toApiError(res.status, body);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/**
 * Kết thúc phiên trên máy này (gọi TRƯỚC khi gửi /api/auth/logout): bỏ token, vô hiệu kết quả refresh
 * đang chạy và chờ nó xong – để cookie refresh mới (nếu có) bị /logout xóa sau đó, phiên không sống lại.
 */
export async function endSession(): Promise<void> {
  generation += 1;
  accessToken = null;
  const dangChay = refreshing;
  if (dangChay) {
    try {
      await dangChay;
    } catch {
      // Lỗi mạng của refresh cũ không ảnh hưởng việc đăng xuất.
    }
  }
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** false: không gắn token, không tự làm mới (đăng nhập, đăng xuất). */
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestOnce<T>(path, options, true);
}

async function requestOnce<T>(path: string, options: RequestOptions, mayRetry: boolean): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const usedToken = auth ? accessToken : null;
  if (usedToken) headers.Authorization = `Bearer ${usedToken}`;

  const res = await send(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await readBody(res);
  if (res.ok) return data as T;

  const error = toApiError(res.status, data);
  if (!auth) throw error;

  if (error.code === "TOKEN_EXPIRED" && mayRetry) {
    // Token đã được làm mới bởi yêu cầu khác trong lúc chờ: gửi lại luôn, không refresh lần nữa.
    if (accessToken && accessToken !== usedToken) return requestOnce<T>(path, options, false);
    const session = await refreshSession();
    if (session) return requestOnce<T>(path, options, false);
    handlers.onSessionExpired?.();
    throw error;
  }
  if (error.status === 401) {
    accessToken = null;
    handlers.onSessionExpired?.();
  } else if (MA_HET_PHIEN_403.has(error.code)) {
    accessToken = null;
    handlers.onSessionExpired?.(error.message);
  } else if (error.code === "PASSWORD_CHANGE_REQUIRED") {
    handlers.onPasswordChangeRequired?.();
  }
  throw error;
}
