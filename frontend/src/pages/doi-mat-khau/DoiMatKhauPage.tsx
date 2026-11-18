/** Màn hình đổi mật khẩu bắt buộc – mục 3.2.3 (màn 2): ba ô mật khẩu, không có menu. API 5. UC 2. */
import { CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "@/api/client";
import type { FieldError } from "@/api/types";
import { useAuth } from "@/auth/AuthProvider";
import { AuthLayout } from "@/components/AuthLayout";
import { LockedAlert } from "@/components/LockedAlert";
import { PasswordInput } from "@/components/PasswordInput";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { homePath } from "@/lib/roles";
import { useCountdown } from "@/lib/useCountdown";

type Field = "current_password" | "new_password" | "confirm_password";
const CAC_O: Field[] = ["current_password", "new_password", "confirm_password"];
const MAT_KHAU_TOI_THIEU = 8;

function focusOSaiDauTien(errors: Partial<Record<Field, string>>) {
  const o = CAC_O.find((f) => errors[f]);
  if (o) document.getElementById(o)?.focus();
}

export function DoiMatKhauPage() {
  const { changePassword, logout, user } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Field, string>>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lockedSeconds = useCountdown(lockedUntil);

  function set(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setFieldErrors((e) => ({ ...e, [field]: undefined }));
  }

  function kiemTra(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (!values.current_password) e.current_password = "Hãy nhập mật khẩu hiện tại";
    if (values.new_password.length < MAT_KHAU_TOI_THIEU)
      e.new_password = `Mật khẩu mới cần ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`;
    else if (values.new_password === values.current_password)
      e.new_password = "Mật khẩu mới phải khác mật khẩu hiện tại";
    if (values.confirm_password !== values.new_password)
      e.confirm_password = "Mật khẩu nhập lại không khớp với mật khẩu mới";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const errors = kiemTra();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusOSaiDauTien(errors);
      return;
    }

    setSubmitting(true);
    setError(null);
    setLockedUntil(null);
    try {
      const me = await changePassword(values.current_password, values.new_password, values.confirm_password);
      navigate(homePath(me.role), { replace: true });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setError("Có lỗi không mong muốn, vui lòng thử lại");
      } else if (err.code === "INVALID_CURRENT_PASSWORD") {
        const e = { current_password: err.message };
        setFieldErrors(e);
        focusOSaiDauTien(e);
      } else if (err.code === "ACCOUNT_LOCKED") {
        const retry = (err.details as { retry_after_seconds?: number } | null)?.retry_after_seconds ?? 60;
        setLockedUntil(Date.now() + retry * 1000);
      } else if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details)) {
        const byField: Partial<Record<Field, string>> = {};
        for (const d of err.details as FieldError[]) {
          if (CAC_O.includes(d.field as Field)) byField[d.field as Field] ??= d.message;
        }
        setFieldErrors(byField);
        // Lỗi không thuộc ô nào (ví dụ dữ liệu gửi lên hỏng): vẫn phải cho người dùng thấy.
        if (Object.keys(byField).length === 0) setError(err.message);
        focusOSaiDauTien(byField);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function dangXuat() {
    await logout();
    navigate("/dang-nhap", { replace: true });
  }

  const locked = lockedSeconds !== null;
  const o: { field: Field; label: string; autoComplete: string; hint?: string }[] = [
    { field: "current_password", label: "Mật khẩu hiện tại", autoComplete: "current-password" },
    { field: "new_password", label: "Mật khẩu mới", autoComplete: "new-password", hint: "Ít nhất 8 ký tự" },
    { field: "confirm_password", label: "Nhập lại mật khẩu mới", autoComplete: "new-password" },
  ];

  return (
    <AuthLayout footer={user ? <>Đang đăng nhập bằng tài khoản {user.username}</> : undefined}>
      <div>
        <h1 className="text-[28px] leading-tight font-medium">Đổi mật khẩu</h1>
        <p className="mt-1.5 text-text-2">
          Tài khoản mới tạo hoặc vừa được đặt lại mật khẩu. Hãy đặt mật khẩu mới để tiếp tục
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {o.map(({ field, label, autoComplete, hint }) => (
          <div key={field}>
            <Label htmlFor={field}>{label}</Label>
            <PasswordInput
              id={field}
              name={field}
              autoComplete={autoComplete}
              value={values[field]}
              onChange={(e) => set(field, e.target.value)}
              invalid={!!fieldErrors[field]}
              aria-describedby={`${field}-note`}
            />
            <p
              id={`${field}-note`}
              className={
                fieldErrors[field] ? "mt-1.5 text-[14px] text-danger" : "mt-1.5 text-[14px] text-text-2"
              }
            >
              {fieldErrors[field] ?? hint}
            </p>
          </div>
        ))}

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={submitting || locked}
          >
            {submitting ? "Đang đổi mật khẩu" : "Đổi mật khẩu"}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={dangXuat}>
            Đăng xuất
          </Button>
        </div>

        <div aria-live="polite">
          {locked && <LockedAlert seconds={lockedSeconds} />}
          {error && (
            <Alert tone="danger">
              <CircleAlert strokeWidth={1.5} aria-hidden />
              <div>{error}</div>
            </Alert>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
