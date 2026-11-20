/**
 * Báo cáo kiểm tra mô hình (UC 21 bước 3–4, Hình 3-11): dung lượng, số tam giác, texture, tên các phần.
 * Chỉ số vượt mức cảnh báo tô vàng; phần chưa đặt tên được cảnh báo (luồng 3.3).
 */
import { TriangleAlert } from "lucide-react";
import { useId } from "react";
import { MB, WARN_LIMITS, type AssetCheckItem, type CheckField } from "@/api/assets";
import { Alert } from "@/components/ui/alert";
import { formatBytes, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BaoCao {
  file_size: number | null;
  triangle_count: number | null;
  max_texture_px: number | null;
  mesh_names: string[];
  warnings: AssetCheckItem[];
  /** Chỉ có ngay sau khi nạp (API 46); bảng assets không lưu số phần không tên. */
  unnamed_meshes?: number;
}

const MUC_TOI_DA = "Tối đa 150 MB · 1,5 triệu tam giác · texture 4096 px";

function giaTri(field: CheckField, v: number | null): string {
  if (v === null) return field === "max_texture_px" ? "Không có" : "Không rõ";
  if (field === "file_size") return formatBytes(v);
  if (field === "triangle_count") return formatNumber(v);
  return `${formatNumber(v)} px`;
}

function goiY(field: CheckField): string {
  if (field === "file_size") return `Khuyến nghị đến ${formatNumber(WARN_LIMITS.file_size / MB)} MB`;
  if (field === "triangle_count") return `Khuyến nghị đến ${formatNumber(WARN_LIMITS.triangle_count)}`;
  return `Khuyến nghị đến ${formatNumber(WARN_LIMITS.max_texture_px)} px`;
}

const DONG: { field: CheckField; label: string }[] = [
  { field: "file_size", label: "Dung lượng" },
  { field: "triangle_count", label: "Số tam giác" },
  { field: "max_texture_px", label: "Texture lớn nhất" },
];

export function BaoCaoKiemTra({ baoCao }: { baoCao: BaoCao }) {
  const vuot = new Set(baoCao.warnings.map((w) => w.field));
  const khongTen = baoCao.unnamed_meshes ?? 0;
  const id = useId();
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby={`${id}-chi-so`}>
        <h3 id={`${id}-chi-so`} className="text-[14px] font-medium">
          Kết quả kiểm tra
        </h3>
        <dl className="mt-1">
          {DONG.map(({ field, label }) => {
            const canhBao = vuot.has(field);
            return (
              <div key={field} className="flex min-h-10 items-center gap-3 border-b border-line text-[14px]">
                <dt className="w-32 shrink-0 text-text-2">{label}</dt>
                <dd className="flex min-w-0 flex-1 items-center justify-between gap-3 whitespace-nowrap">
                  <span
                    className={cn(
                      "rounded-[6px] px-1.5 py-0.5 font-medium",
                      canhBao ? "bg-warn-weak text-warn" : "text-text",
                    )}
                  >
                    {giaTri(field, baoCao[field])}
                  </span>
                  <span className={cn("text-[13px]", canhBao ? "text-warn" : "text-text-2")}>
                    {goiY(field)}
                  </span>
                </dd>
              </div>
            );
          })}
          <div className="flex min-h-10 items-center gap-3 border-b border-line text-[14px]">
            <dt className="w-32 shrink-0 text-text-2">Số phần có tên</dt>
            <dd className="font-medium">{formatNumber(baoCao.mesh_names.length)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[13px] text-text-2">{MUC_TOI_DA}</p>
      </section>

      {(baoCao.warnings.length > 0 || khongTen > 0) && (
        <Alert tone="warn">
          <TriangleAlert strokeWidth={1.5} aria-hidden />
          <div className="flex flex-col gap-1">
            {baoCao.warnings.length > 0 && (
              <span>
                {baoCao.warnings.map((w) => w.message).join("; ")}. Cả lớp tải cùng lúc có thể chậm trên máy
                yếu.
              </span>
            )}
            {khongTen > 0 && (
              <span>
                Có {formatNumber(khongTen)} phần chưa đặt tên nên không gắn nhãn được. Hãy đặt tên các phần
                trong phần mềm dựng hình rồi nạp lại nếu cần gắn nhãn.
              </span>
            )}
          </div>
        </Alert>
      )}

      <section aria-labelledby={`${id}-mesh`}>
        <h3 id={`${id}-mesh`} className="text-[14px] font-medium">
          Các phần của mô hình
        </h3>
        {baoCao.mesh_names.length === 0 ? (
          <p className="mt-1 text-[14px] text-text-2">Mô hình không có phần nào được đặt tên.</p>
        ) : (
          <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {baoCao.mesh_names.map((ten, i) => (
              <li
                key={`${ten}-${i}`}
                className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 font-mono text-[13px] text-text"
              >
                {ten}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
