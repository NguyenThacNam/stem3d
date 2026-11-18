/** Màn hình đăng nhập – Hình 3-3, mục 3.2.3 chương 3. API 1. UC 1. */
import { CircleAlert, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "@/components/AuthLayout";
import { LockedAlert } from "@/components/LockedAlert";
import { PasswordInput } from "@/components/PasswordInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homePath } from "@/lib/roles";
import { useCountdown } from "@/lib/useCountdown";

type Field = "username" | "password";

export function DangNhapPage() {
  const { login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Field, string>>({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lockedSeconds = useCountdown(lockedUntil);

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
    if (field === "username") {
      // Khóa tạm theo từng tài khoản: đổi tên đăng nhập thì bỏ thông báo, mở lại nút.
      setLockedUntil(null);
      setError(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const username = values.username.trim();
    const errors: Partial<Record<Field, string>> = {};
    if (!username) errors.username = "Hãy nhập tên đăng nhập";
    if (!values.password) errors.password = "Hãy nhập mật khẩu";
    setFieldErrors(errors);
    const oSaiDauTien = (["username", "password"] as const).find((f) => errors[f]);
    if (oSaiDauTien) {
      document.getElementById(oSaiDauTien)?.focus();
      return;
    }

    setSubmitting(true);
    setError(null);
    setLockedUntil(null);
    clearNotice();
    try {
      const me = await login(username, values.password);
      navigate(me.must_change_password ? "/doi-mat-khau" : homePath(me.role), { replace: true });
    } catch (err) {
      setValues((v) => ({ ...v, password: "" }));
      if (err instanceof ApiError && err.code === "ACCOUNT_LOCKED") {
        const retry = (err.details as { retry_after_seconds?: number } | null)?.retry_after_seconds ?? 60;
        setLockedUntil(Date.now() + retry * 1000);
      } else {
        setError(err instanceof ApiError ? err.message : "Có lỗi không mong muốn, vui lòng thử lại");
        document.getElementById("password")?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const locked = lockedSeconds !== null;
  // Lý do phiên trước kết thúc (tài khoản / trường bị khóa) – hiện cho tới lần đăng nhập sau.
  const thongBao = error ?? notice;

  return (
    <AuthLayout
      footer={
        <>
          Quên mật khẩu? Học sinh báo giáo viên chủ nhiệm, giáo viên báo quản trị trường để được cấp mật khẩu
          mới
        </>
      }
    >
      <div>
        <h1 className="text-[28px] leading-tight font-medium">Đăng nhập</h1>
        <p className="mt-1.5 text-text-2">Dùng tài khoản nhà trường đã cấp cho thầy cô và các em</p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            placeholder="Ví dụ: nguyendu.hs0123"
            value={values.username}
            onChange={(e) => set("username", e.target.value)}
            leading={<User strokeWidth={1.5} />}
            invalid={!!fieldErrors.username}
            aria-describedby={fieldErrors.username ? "username-error" : undefined}
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1.5 text-[14px] text-danger">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Mật khẩu</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
            invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && (
            <p id="password-error" className="mt-1.5 text-[14px] text-danger">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || locked}>
          {submitting ? "Đang đăng nhập" : "Đăng nhập"}
        </Button>

        <div aria-live="polite">
          {locked && <LockedAlert seconds={lockedSeconds} />}
          {!locked && thongBao && (
            <Alert tone="danger">
              <CircleAlert strokeWidth={1.5} aria-hidden />
              <div>{thongBao}</div>
            </Alert>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
