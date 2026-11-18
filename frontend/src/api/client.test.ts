import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, configureClient, getAccessToken, refreshSession, request, setAccessToken } from "./client";
import { changePassword, login, logout, meFromToken } from "./auth";

type FetchArgs = [string, RequestInit];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function loi(status: number, code: string, message = "Lỗi thử"): Response {
  return json(status, { error: { code, message, details: null } });
}

function tokenOut(token: string) {
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 900,
    must_change_password: false,
    user: { id: 1, full_name: "Trần Minh Anh", role: "STUDENT", school: null },
  };
}

function authHeader(call: FetchArgs): string | undefined {
  return (call[1].headers as Record<string, string> | undefined)?.Authorization;
}

let fetchMock: ReturnType<typeof vi.fn>;
const handlers = { onSessionExpired: vi.fn(), onPasswordChangeRequired: vi.fn() };

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  setAccessToken(null);
  handlers.onSessionExpired.mockReset();
  handlers.onPasswordChangeRequired.mockReset();
  configureClient(handlers);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("gắn access token và gửi cookie cùng địa chỉ", async () => {
    setAccessToken("tok-1");
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await expect(request("/api/auth/me")).resolves.toEqual({ ok: true });

    const call = fetchMock.mock.calls[0] as FetchArgs;
    expect(authHeader(call)).toBe("Bearer tok-1");
    expect(call[1].credentials).toBe("same-origin");
  });

  it("auth=false không gắn token", async () => {
    setAccessToken("tok-1");
    fetchMock.mockResolvedValueOnce(json(200, {}));

    await request("/api/auth/login", { method: "POST", body: {}, auth: false });

    expect(authHeader(fetchMock.mock.calls[0] as FetchArgs)).toBeUndefined();
  });

  it("TOKEN_EXPIRED: làm mới một lần rồi gửi lại với token mới", async () => {
    setAccessToken("cu");
    fetchMock
      .mockResolvedValueOnce(loi(401, "TOKEN_EXPIRED"))
      .mockResolvedValueOnce(json(200, tokenOut("moi")))
      .mockResolvedValueOnce(json(200, { id: 1 }));

    await expect(request("/api/auth/me")).resolves.toEqual({ id: 1 });

    const calls = fetchMock.mock.calls as FetchArgs[];
    expect(calls.map((c) => c[0])).toEqual(["/api/auth/me", "/api/auth/refresh", "/api/auth/me"]);
    expect(authHeader(calls[2])).toBe("Bearer moi");
    expect(getAccessToken()).toBe("moi");
  });

  it("nhiều yêu cầu hết hạn cùng lúc chỉ gọi refresh một lần", async () => {
    setAccessToken("cu");
    let goiRefresh = 0;
    fetchMock.mockImplementation(async (path: string, init: RequestInit) => {
      if (path === "/api/auth/refresh") {
        goiRefresh += 1;
        await new Promise((r) => setTimeout(r, 10));
        return json(200, tokenOut("moi"));
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer moi" ? json(200, { path }) : loi(401, "TOKEN_EXPIRED");
    });

    const ket_qua = await Promise.all([request("/api/a"), request("/api/b"), request("/api/c")]);

    expect(ket_qua).toEqual([{ path: "/api/a" }, { path: "/api/b" }, { path: "/api/c" }]);
    expect(goiRefresh).toBe(1);
  });

  it("token đã được làm mới bởi yêu cầu khác: gửi lại luôn, không refresh nữa", async () => {
    setAccessToken("cu");
    fetchMock.mockImplementationOnce(async () => {
      setAccessToken("moi"); // yêu cầu khác vừa làm mới xong
      return loi(401, "TOKEN_EXPIRED");
    });
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await request("/api/a");

    const calls = fetchMock.mock.calls as FetchArgs[];
    expect(calls.map((c) => c[0])).toEqual(["/api/a", "/api/a"]);
    expect(authHeader(calls[1])).toBe("Bearer moi");
  });

  it("refresh thất bại: xóa phiên, báo hết phiên, ném lỗi", async () => {
    setAccessToken("cu");
    fetchMock
      .mockResolvedValueOnce(loi(401, "TOKEN_EXPIRED"))
      .mockResolvedValueOnce(loi(401, "REFRESH_INVALID"));

    await expect(request("/api/auth/me")).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRED" });

    expect(getAccessToken()).toBeNull();
    expect(handlers.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("chỉ gửi lại một lần: hết hạn tiếp thì dừng, không lặp", async () => {
    setAccessToken("cu");
    fetchMock
      .mockResolvedValueOnce(loi(401, "TOKEN_EXPIRED"))
      .mockResolvedValueOnce(json(200, tokenOut("moi")))
      .mockResolvedValueOnce(loi(401, "TOKEN_EXPIRED"));

    await expect(request("/api/a")).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(handlers.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("TOKEN_INVALID: xóa phiên, không refresh", async () => {
    setAccessToken("hong");
    fetchMock.mockResolvedValueOnce(loi(401, "TOKEN_INVALID"));

    await expect(request("/api/a")).rejects.toMatchObject({ code: "TOKEN_INVALID" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(handlers.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("PASSWORD_CHANGE_REQUIRED: báo cho ứng dụng", async () => {
    setAccessToken("tok");
    fetchMock.mockResolvedValueOnce(loi(403, "PASSWORD_CHANGE_REQUIRED"));

    await expect(request("/api/a")).rejects.toMatchObject({ status: 403 });

    expect(handlers.onPasswordChangeRequired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("tok");
  });

  it("lỗi nghiệp vụ giữ nguyên mã, câu thông báo và details", async () => {
    fetchMock.mockResolvedValueOnce(
      json(423, {
        error: { code: "ACCOUNT_LOCKED", message: "Tạm khóa", details: { retry_after_seconds: 42 } },
      }),
    );

    await expect(request("/api/auth/login", { method: "POST", auth: false })).rejects.toMatchObject({
      status: 423,
      code: "ACCOUNT_LOCKED",
      message: "Tạm khóa",
      details: { retry_after_seconds: 42 },
    });
    expect(handlers.onSessionExpired).not.toHaveBeenCalled();
  });

  it("mất mạng: NETWORK_ERROR với câu hướng dẫn", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(request("/api/a")).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("phản hồi lỗi không phải JSON (Nginx 502): HTTP_ERROR", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>502</html>", { status: 502 }));

    await expect(request("/api/a")).rejects.toMatchObject({ status: 502, code: "HTTP_ERROR" });
  });

  it("204 trả undefined", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(request("/api/auth/logout", { method: "POST", auth: false })).resolves.toBeUndefined();
  });
});

describe("refreshSession", () => {
  it("thành công: lưu token mới trong bộ nhớ", async () => {
    fetchMock.mockResolvedValueOnce(json(200, tokenOut("moi")));

    const ket_qua = await refreshSession();

    expect(ket_qua?.access_token).toBe("moi");
    expect(getAccessToken()).toBe("moi");
  });

  it("401: trả null (chưa đăng nhập), không ném lỗi", async () => {
    fetchMock.mockResolvedValueOnce(loi(401, "REFRESH_INVALID"));

    await expect(refreshSession()).resolves.toBeNull();
  });

  it("lỗi máy chủ: ném ApiError để màn hình hiện nút thử lại", async () => {
    fetchMock.mockResolvedValueOnce(new Response("bad gateway", { status: 502 }));

    await expect(refreshSession()).rejects.toMatchObject({ code: "HTTP_ERROR" });
  });

  it("không lưu token vào localStorage hay sessionStorage", async () => {
    const storage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    fetchMock.mockResolvedValueOnce(json(200, tokenOut("moi")));

    await refreshSession();

    expect(storage.setItem).not.toHaveBeenCalled();
  });
});

describe("bổ sung theo review", () => {
  it("đăng nhập sai (auth=false, 401) không xóa phiên, không báo hết phiên", async () => {
    setAccessToken("dang-co");
    fetchMock.mockResolvedValueOnce(loi(401, "INVALID_CREDENTIALS"));

    await expect(request("/api/auth/login", { method: "POST", body: {}, auth: false })).rejects.toMatchObject(
      { code: "INVALID_CREDENTIALS" },
    );

    expect(handlers.onSessionExpired).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("dang-co");
  });

  it("refresh lỗi mạng giữa chừng: ném NETWORK_ERROR, không báo hết phiên", async () => {
    setAccessToken("cu");
    fetchMock
      .mockResolvedValueOnce(loi(401, "TOKEN_EXPIRED"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(request("/api/a")).rejects.toMatchObject({ code: "NETWORK_ERROR" });

    expect(handlers.onSessionExpired).not.toHaveBeenCalled();
  });

  it("gọi refreshSession hai lần cùng lúc (StrictMode) chỉ ra một yêu cầu", async () => {
    fetchMock.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return json(200, tokenOut("moi"));
    });

    const [a, b] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a?.access_token).toBe("moi");
    expect(b?.access_token).toBe("moi");
  });

  it("tài khoản / trường bị khóa giữa phiên (403): xóa phiên, báo hết phiên kèm lý do", async () => {
    for (const code of ["ACCOUNT_DISABLED", "SCHOOL_DISABLED"]) {
      setAccessToken("tok");
      handlers.onSessionExpired.mockReset();
      fetchMock.mockResolvedValueOnce(loi(403, code, `Lý do ${code}`));

      await expect(request("/api/a")).rejects.toMatchObject({ status: 403, code });

      expect(getAccessToken()).toBeNull();
      expect(handlers.onSessionExpired).toHaveBeenCalledWith(`Lý do ${code}`);
    }
  });

  it("403 FORBIDDEN (sai vai trò) không xóa phiên", async () => {
    setAccessToken("tok");
    fetchMock.mockResolvedValueOnce(loi(403, "FORBIDDEN"));

    await expect(request("/api/a")).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(getAccessToken()).toBe("tok");
    expect(handlers.onSessionExpired).not.toHaveBeenCalled();
  });

  it("đăng xuất trong lúc đang refresh: chờ refresh xong rồi mới gọi /logout, phiên không sống lại", async () => {
    let xongRefresh: (r: Response) => void = () => {};
    fetchMock.mockImplementation((path: string) => {
      if (path === "/api/auth/refresh") return new Promise<Response>((r) => (xongRefresh = r));
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    const dangRefresh = refreshSession();
    const dangDangXuat = logout();
    await Promise.resolve();
    // Chưa gọi /logout khi refresh chưa xong (để /logout xóa cookie refresh vừa đặt).
    expect((fetchMock.mock.calls as FetchArgs[]).map((c) => c[0])).toEqual(["/api/auth/refresh"]);

    xongRefresh(json(200, tokenOut("hoi-sinh")));
    await expect(dangRefresh).resolves.toBeNull();
    await dangDangXuat;

    expect((fetchMock.mock.calls as FetchArgs[]).map((c) => c[0])).toEqual([
      "/api/auth/refresh",
      "/api/auth/logout",
    ]);
    expect(getAccessToken()).toBeNull();
  });

  it("đăng nhập, đổi mật khẩu không ghi token vào localStorage / sessionStorage", async () => {
    const storage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    fetchMock.mockResolvedValueOnce(json(200, tokenOut("sau-dang-nhap")));
    fetchMock.mockResolvedValueOnce(json(200, tokenOut("sau-doi-mat-khau")));

    await login("nguyendu.hs001", "MatKhau-1");
    expect(getAccessToken()).toBe("sau-dang-nhap");
    await changePassword("MatKhau-1", "MatKhau-2", "MatKhau-2");

    expect(getAccessToken()).toBe("sau-doi-mat-khau");
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("meFromToken dựng thông tin tài khoản từ phản hồi đăng nhập", () => {
    expect(meFromToken(tokenOut("x") as never, "nguyendu.hs001")).toEqual({
      id: 1,
      full_name: "Trần Minh Anh",
      role: "STUDENT",
      school: null,
      username: "nguyendu.hs001",
      must_change_password: false,
    });
  });
});
