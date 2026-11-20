/**
 * Hộp thoại nạp mô hình GLB (UC 21, API 46, Bảng 3-11).
 * Luồng: chọn file (xem trước 3D ngay trên máy) → khai báo tên, nguồn, ghi công → gửi (thanh phần trăm)
 *   → 409 WARNINGS_NOT_ACCEPTED: hỏi rồi gửi lại với accept_warnings
 *   → 422 / 413: báo lỗi cụ thể, cho chọn file khác
 *   → 201: báo cáo kiểm tra.
 */
import { CircleCheck, FileBox, TriangleAlert, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  MAX_FILE_SIZE,
  NEEDS_ATTRIBUTION,
  SOURCE_LABEL,
  uploadAsset,
  type AssetCheckItem,
  type AssetUploadOut,
  type SourceType,
} from "@/api/assets";
import { ApiError, UPLOAD_ABORTED } from "@/api/client";
import { ModelViewerLazy } from "@/components/ModelViewerLazy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BaoCaoKiemTra } from "./BaoCaoKiemTra";

type Buoc =
  | { kind: "form" }
  | { kind: "uploading"; percent: number }
  | { kind: "confirm"; warnings: AssetCheckItem[] }
  | { kind: "done"; result: AssetUploadOut };

type LoiTruong = Partial<Record<"file" | "name" | "attribution", string>>;

const NGUON: SourceType[] = ["SELF_BUILT", "COMMISSIONED", "CC0", "CC_BY", "CC_BY_SA"];

function tenTuFile(f: File): string {
  return f.name
    .replace(/\.glb$/i, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .slice(0, 200);
}

export function NapMoHinhDialog({
  open,
  onOpenChange,
  onUploaded,
  onAborted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (name: string) => void;
  /** Đã hủy gửi: nếu file đã tới máy chủ trước khi hủy thì mô hình vẫn có thể đã được lưu – trang tải lại danh sách. */
  onAborted?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [source, setSource] = useState<SourceType>("SELF_BUILT");
  const [attribution, setAttribution] = useState("");
  const [buoc, setBuoc] = useState<Buoc>({ kind: "form" });
  const [loi, setLoi] = useState<LoiTruong>({});
  const [loiChung, setLoiChung] = useState<{ message: string; items: AssetCheckItem[] } | null>(null);
  const huyRef = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const id = useId();

  // Mở lại hộp thoại: bắt đầu từ đầu.
  useEffect(() => {
    if (!open) return;
    setFile(null);
    setName("");
    setSource("SELF_BUILT");
    setAttribution("");
    setBuoc({ kind: "form" });
    setLoi({});
    setLoiChung(null);
  }, [open]);

  useEffect(() => () => huyRef.current?.abort(), []);

  const canGhiCong = NEEDS_ATTRIBUTION.has(source);
  const dangGui = buoc.kind === "uploading";
  // Đang gửi hoặc đang hỏi xác nhận cảnh báo: khóa biểu mẫu để thứ được gửi đúng là thứ đã kiểm tra.
  const khoaForm = dangGui || buoc.kind === "confirm";

  function chonFile(f: File | null) {
    setLoiChung(null);
    setBuoc({ kind: "form" });
    if (!f) return;
    const loiFile = !/\.glb$/i.test(f.name)
      ? "Chỉ nhận file .glb, hãy xuất mô hình sang định dạng GLB"
      : f.size > MAX_FILE_SIZE
        ? `File ${formatBytes(f.size)}, vượt mức tối đa 150 MB, hãy chọn file nhỏ hơn`
        : undefined;
    setLoi((x) => ({ ...x, file: loiFile }));
    setFile(loiFile ? null : f);
    if (!loiFile && !name.trim()) setName(tenTuFile(f));
  }

  function kiemTra(): boolean {
    const l: LoiTruong = {};
    if (!file) l.file = "Hãy chọn file mô hình .glb";
    if (!name.trim()) l.name = "Hãy nhập tên mô hình";
    if (canGhiCong && !attribution.trim())
      l.attribution = "Giấy phép CC BY / CC BY-SA cần dòng ghi công tác giả";
    setLoi(l);
    return Object.keys(l).length === 0;
  }

  async function gui(acceptWarnings: boolean) {
    if (!file) return;
    setLoiChung(null);
    const ctrl = new AbortController();
    huyRef.current = ctrl;
    setBuoc({ kind: "uploading", percent: 0 });
    try {
      const result = await uploadAsset(
        { file, name: name.trim(), sourceType: source, attribution: attribution.trim(), acceptWarnings },
        {
          signal: ctrl.signal,
          onProgress: (f) => {
            const p = Math.round(f * 100);
            setBuoc((b) =>
              b.kind === "uploading" && b.percent === p ? b : { kind: "uploading", percent: p },
            );
          },
        },
      );
      setBuoc({ kind: "done", result });
      onUploaded(name.trim());
    } catch (e) {
      const err =
        e instanceof ApiError ? e : new ApiError(0, "UNKNOWN", "Không nạp được mô hình, hãy thử lại");
      if (err.code === UPLOAD_ABORTED) {
        setBuoc({ kind: "form" });
        onAborted?.();
        return;
      }
      if (err.code === "WARNINGS_NOT_ACCEPTED") {
        setBuoc({ kind: "confirm", warnings: (err.details as AssetCheckItem[] | null) ?? [] });
        return;
      }
      setBuoc({ kind: "form" });
      if (err.code === "ATTRIBUTION_REQUIRED") {
        setLoi({ attribution: err.message });
        return;
      }
      const items = err.code === "LIMIT_EXCEEDED" ? ((err.details as AssetCheckItem[] | null) ?? []) : [];
      setLoiChung({ message: err.message, items });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (kiemTra()) void gui(false);
  }

  function napTiep() {
    setFile(null);
    setName("");
    setAttribution("");
    setBuoc({ kind: "form" });
    setLoi({});
    setLoiChung(null);
  }

  function doiTrangThaiMo(mo: boolean) {
    if (!mo) huyRef.current?.abort();
    onOpenChange(mo);
  }

  return (
    <Dialog open={open} onOpenChange={doiTrangThaiMo}>
      <DialogContent
        className="max-w-[960px]"
        // Đang gửi file lớn: không đóng nhầm khi bấm ra ngoài.
        onInteractOutside={(e) => dangGui && e.preventDefault()}
      >
        <DialogTitle>{buoc.kind === "done" ? "Đã nạp mô hình" : "Nạp mô hình 3D"}</DialogTitle>
        <DialogDescription>
          {buoc.kind === "done"
            ? `${name.trim()} đã sẵn sàng để chọn khi soạn bài học.`
            : "File GLB, tối đa 150 MB. Hệ thống tự kiểm tra dung lượng, số tam giác, texture và tên các phần."}
        </DialogDescription>

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 overflow-y-auto">
          {/* Cột trái: biểu mẫu hoặc báo cáo */}
          <div className="flex min-w-0 flex-col gap-4">
            {buoc.kind === "done" ? (
              <>
                <Alert tone="success" aria-live="polite">
                  <CircleCheck strokeWidth={1.5} aria-hidden />
                  <span>Mô hình đạt kiểm tra và đã được lưu.</span>
                </Alert>
                <BaoCaoKiemTra baoCao={buoc.result} />
              </>
            ) : (
              <form id={`${id}-form`} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <div>
                  <span id={`${id}-file-label`} className="mb-1.5 block text-[14px] text-text-2">
                    File mô hình
                  </span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".glb,model/gltf-binary"
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(e) => {
                      chonFile(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 rounded-card border border-line px-4 py-3.5">
                      <div className="grid size-10 shrink-0 place-items-center rounded-alert bg-surface-2">
                        <FileBox className="size-[18px] text-text-2" strokeWidth={1.5} aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="text-[13px] text-text-2">{formatBytes(file.size)}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={khoaForm}
                        onClick={() => fileInput.current?.click()}
                      >
                        <Upload strokeWidth={1.5} aria-hidden />
                        Chọn file khác
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-labelledby={`${id}-file-label`}
                      aria-describedby={loi.file ? `${id}-file-err` : undefined}
                      onClick={() => fileInput.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        chonFile(e.dataTransfer.files?.[0] ?? null);
                      }}
                      className={cn(
                        "flex w-full flex-col items-center gap-2 rounded-card border border-dashed border-line-2 bg-bg px-4 py-8 text-center hover:bg-surface-2",
                        loi.file && "border-danger",
                      )}
                    >
                      <Upload className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
                      <span className="font-medium">Chọn file .glb</span>
                      <span className="text-[13px] text-text-2">hoặc kéo thả file vào đây</span>
                    </button>
                  )}
                  {loi.file && (
                    <p id={`${id}-file-err`} className="mt-1.5 text-[14px] text-danger">
                      {loi.file}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${id}-name`} className="mb-1.5 block text-[14px] text-text-2">
                    Tên mô hình
                  </label>
                  <Input
                    id={`${id}-name`}
                    className={khoaForm ? "opacity-60" : undefined}
                    value={name}
                    maxLength={200}
                    disabled={khoaForm}
                    placeholder="Ví dụ: Cá chép – cấu tạo ngoài"
                    invalid={!!loi.name}
                    aria-describedby={loi.name ? `${id}-name-err` : undefined}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {loi.name && (
                    <p id={`${id}-name-err`} className="mt-1.5 text-[14px] text-danger">
                      {loi.name}
                    </p>
                  )}
                </div>

                <fieldset disabled={khoaForm} className="disabled:opacity-60">
                  <legend className="mb-1.5 text-[14px] text-text-2">Nguồn mô hình</legend>
                  <div className="flex flex-wrap gap-2">
                    {NGUON.map((n) => (
                      <label
                        key={n}
                        className={cn(
                          "flex h-9 cursor-pointer items-center rounded-ctl border px-3 text-[14px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                          source === n
                            ? "border-accent bg-accent-weak font-medium text-accent-ink"
                            : "border-line-2 bg-surface text-text hover:bg-surface-2",
                        )}
                      >
                        <input
                          type="radio"
                          name={`${id}-source`}
                          value={n}
                          checked={source === n}
                          onChange={() => setSource(n)}
                          className="sr-only"
                        />
                        {SOURCE_LABEL[n]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {canGhiCong && (
                  <div>
                    <label htmlFor={`${id}-attr`} className="mb-1.5 block text-[14px] text-text-2">
                      Dòng ghi công tác giả
                    </label>
                    <textarea
                      id={`${id}-attr`}
                      rows={2}
                      maxLength={500}
                      disabled={khoaForm}
                      value={attribution}
                      placeholder="Ví dụ: “Carp” – Nguyễn Văn A, CC BY 4.0"
                      aria-invalid={!!loi.attribution || undefined}
                      aria-describedby={loi.attribution ? `${id}-attr-err` : undefined}
                      onChange={(e) => setAttribution(e.target.value)}
                      className={cn(
                        "w-full resize-none rounded-ctl border border-line-2 bg-surface px-3 py-2 text-[15px] placeholder:text-text-2 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25 disabled:opacity-60",
                        loi.attribution && "border-danger",
                      )}
                    />
                    {loi.attribution ? (
                      <p id={`${id}-attr-err`} className="mt-1.5 text-[14px] text-danger">
                        {loi.attribution}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-text-2">Hiện cùng bài học để ghi đúng tác giả.</p>
                    )}
                  </div>
                )}
              </form>
            )}

            {buoc.kind === "uploading" && (
              <div>
                <div className="mb-1.5 flex justify-between text-[14px]">
                  {/* Chỉ câu trạng thái nằm trong vùng đọc tự động; con số % đổi liên tục thì không. */}
                  <span className="text-text-2" aria-live="polite">
                    {buoc.percent < 100 ? "Đang gửi file" : "Đang kiểm tra mô hình"}
                  </span>
                  <span className="font-medium" aria-hidden>
                    {buoc.percent}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Tiến độ gửi file"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={buoc.percent}
                  className="h-2 overflow-hidden rounded-full bg-surface-2"
                >
                  <div className="h-full bg-accent" style={{ width: `${buoc.percent}%` }} />
                </div>
              </div>
            )}
            <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
              {buoc.kind === "confirm" && (
                <Alert tone="warn">
                  <TriangleAlert strokeWidth={1.5} aria-hidden />
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Mô hình vượt mức khuyến nghị</span>
                    <ul className="list-disc pl-4">
                      {buoc.warnings.map((w) => (
                        <li key={w.field}>{w.message}</li>
                      ))}
                    </ul>
                    <span>
                      Cả lớp tải cùng lúc có thể chậm trên máy yếu. Vẫn nạp nếu không giảm được dung lượng.
                    </span>
                  </div>
                </Alert>
              )}
              {loiChung && (
                <Alert tone="danger">
                  <TriangleAlert strokeWidth={1.5} aria-hidden />
                  <div className="flex flex-col gap-1">
                    <span>{loiChung.message}</span>
                    {loiChung.items.length > 0 && (
                      <ul className="list-disc pl-4">
                        {loiChung.items.map((w) => (
                          <li key={w.field}>{w.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Alert>
              )}
            </div>
          </div>

          {/* Cột phải: xem trước 3D – đọc thẳng file trên máy, chưa cần gửi lên máy chủ. */}
          <div className="min-w-0">
            {file ? (
              <ModelViewerLazy file={file} label={name.trim() || file.name} className="h-[360px]" />
            ) : (
              <div className="grid h-[360px] place-items-center rounded-card border border-line grid3d px-6 text-center">
                <span className="text-[14px] text-text-2">Chọn file để xem trước mô hình 3D</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {buoc.kind === "done" ? (
            <>
              <Button type="button" onClick={napTiep}>
                Nạp mô hình khác
              </Button>
              <Button type="button" variant="primary" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </>
          ) : buoc.kind === "uploading" ? (
            <Button type="button" onClick={() => huyRef.current?.abort()}>
              <X strokeWidth={1.5} aria-hidden />
              Hủy nạp
            </Button>
          ) : buoc.kind === "confirm" ? (
            <>
              <Button type="button" onClick={() => setBuoc({ kind: "form" })}>
                Quay lại
              </Button>
              <Button type="button" variant="primary" onClick={() => kiemTra() && void gui(true)}>
                Vẫn nạp mô hình
              </Button>
            </>
          ) : (
            <>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" form={`${id}-form`} variant="primary">
                <Upload strokeWidth={1.5} aria-hidden />
                Nạp và kiểm tra
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
