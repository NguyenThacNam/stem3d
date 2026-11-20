/**
 * Thẻ "Mô hình" của màn soạn bài (UC 20 bước 3): chọn mô hình đã nạp (API 45), xem trước 3D và báo cáo kiểm tra
 * (API 47; chỉ số vượt mức cảnh báo tô vàng như Hình 3-11). Nạp mô hình mới ở màn Mô hình 3D.
 */
import { Box, ExternalLink, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { getAsset, listAssets, SOURCE_LABEL, type AssetDetail, type AssetListItem } from "@/api/assets";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BaoCaoKiemTra } from "@/pages/mo-hinh-3d/BaoCaoKiemTra";
import { XemTruoc3D } from "@/pages/mo-hinh-3d/XemTruoc3D";

export function TheMoHinh({
  assetId,
  onChange,
  disabled,
}: {
  assetId: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [ds, setDs] = useState<AssetListItem[] | null>(null);
  const [loiDs, setLoiDs] = useState<string | null>(null);
  const [lanTai, setLanTai] = useState(0);
  const [chiTiet, setChiTiet] = useState<AssetDetail | null>(null);
  const [loiChiTiet, setLoiChiTiet] = useState<string | null>(null);
  const yeuCau = useRef(0);

  useEffect(() => {
    const so = ++yeuCau.current;
    const t = setTimeout(() => {
      listAssets({ q, pageSize: 100 })
        .then((p) => {
          if (so !== yeuCau.current) return;
          setDs(p.items);
          setLoiDs(null);
        })
        .catch((e) => {
          if (so === yeuCau.current)
            setLoiDs(e instanceof ApiError ? e.message : "Không tải được danh sách mô hình");
        });
    }, 250);
    return () => clearTimeout(t);
  }, [q, lanTai]);

  // Nạp mô hình ở thẻ trình duyệt khác rồi quay lại thì tải lại danh sách để thấy mô hình vừa nạp.
  useEffect(() => {
    const khiQuayLai = () => {
      if (document.visibilityState === "visible") setLanTai((x) => x + 1);
    };
    document.addEventListener("visibilitychange", khiQuayLai);
    return () => document.removeEventListener("visibilitychange", khiQuayLai);
  }, []);

  useEffect(() => {
    setChiTiet(null);
    setLoiChiTiet(null);
    if (assetId === null) return;
    let huy = false;
    getAsset(assetId)
      .then((d) => !huy && setChiTiet(d))
      .catch((e) => !huy && setLoiChiTiet(e instanceof ApiError ? e.message : "Không tải được mô hình"));
    return () => {
      huy = true;
    };
  }, [assetId]);

  return (
    <div className="grid min-h-0 grid-cols-[320px_minmax(0,1fr)] gap-6">
      {/* Cột trái: chọn mô hình */}
      <section aria-labelledby="chon-mo-hinh" className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="chon-mo-hinh" className="text-[15px] font-medium">
            Chọn mô hình
          </h2>
          <div className="flex items-center gap-1">
            <Link
              to="/bien-tap/mo-hinh"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-[14px] text-accent-ink underline-offset-2 hover:underline"
            >
              Nạp mô hình mới
              <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
              <span className="sr-only"> (mở thẻ mới)</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="Tải lại danh sách mô hình"
              title="Tải lại danh sách mô hình"
              onClick={() => setLanTai((x) => x + 1)}
            >
              <RefreshCw strokeWidth={1.5} aria-hidden />
            </Button>
          </div>
        </div>
        <Input
          type="text"
          aria-label="Tìm mô hình theo tên"
          placeholder="Tìm theo tên mô hình"
          leading={<Search strokeWidth={1.5} />}
          value={q}
          maxLength={200}
          onChange={(e) => setQ(e.target.value)}
        />
        {loiDs && (
          <Alert tone="danger" className="items-center">
            <TriangleAlert strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{loiDs}</span>
            <Button size="sm" onClick={() => setLanTai((x) => x + 1)}>
              Thử lại
            </Button>
          </Alert>
        )}
        {ds === null && !loiDs && (
          <div className="flex flex-col gap-2" aria-busy aria-label="Đang tải danh sách mô hình">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-ctl bg-surface-2" />
            ))}
          </div>
        )}
        {ds && ds.length === 0 && (
          <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-[14px] text-text-2">
            {q
              ? "Không có mô hình nào khớp."
              : "Chưa có mô hình nào. Hãy nạp file GLB ở màn Mô hình 3D trước."}
          </p>
        )}
        {ds && ds.length > 0 && (
          <fieldset
            disabled={disabled}
            className="max-h-[520px] overflow-y-auto rounded-card border border-line bg-surface"
          >
            <legend className="sr-only">Mô hình dùng cho bài</legend>
            {ds.map((a) => (
              <label
                key={a.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent",
                  assetId === a.id ? "bg-accent-weak" : "hover:bg-bg",
                )}
              >
                <input
                  type="radio"
                  name="asset"
                  className="size-4 accent-[var(--color-accent)]"
                  checked={assetId === a.id}
                  onChange={() => onChange(a.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{a.name}</span>
                  <span className="block text-[13px] text-text-2">
                    {SOURCE_LABEL[a.source_type]} · {a.file_size ? formatBytes(a.file_size) : "–"} ·{" "}
                    {formatNumber(a.mesh_count)} phần
                  </span>
                </span>
                {a.warning_fields.length > 0 && (
                  <TriangleAlert
                    className="size-4 shrink-0 text-warn"
                    strokeWidth={1.5}
                    aria-label="Vượt mức khuyến nghị"
                  />
                )}
              </label>
            ))}
          </fieldset>
        )}
        {assetId !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Bỏ chọn mô hình
          </Button>
        )}
      </section>

      {/* Cột phải: xem trước và báo cáo */}
      <section aria-label="Mô hình đang chọn" className="flex min-w-0 flex-col gap-4">
        {assetId === null ? (
          <div className="flex h-[420px] flex-col items-center justify-center gap-3 rounded-card border border-line grid3d text-center">
            <Box className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
            <p className="text-[14px] text-text-2">
              Chọn một mô hình ở cột trái để xem trước 3D và kết quả kiểm tra.
            </p>
          </div>
        ) : (
          <>
            {chiTiet ? (
              <XemTruoc3D url={chiTiet.file_url} ten={chiTiet.name} className="h-[420px]" />
            ) : (
              <div className="h-[420px] rounded-card border border-line grid3d" aria-busy />
            )}
            {loiChiTiet && (
              <Alert tone="danger">
                <TriangleAlert strokeWidth={1.5} aria-hidden />
                <span>{loiChiTiet}</span>
              </Alert>
            )}
            {chiTiet && (
              <div className="rounded-card border border-line bg-surface p-4">
                <BaoCaoKiemTra baoCao={chiTiet} />
                {chiTiet.attribution && (
                  <p className="mt-4 text-[14px] text-text-2">
                    <span className="font-medium text-text">Ghi công: </span>
                    {chiTiet.attribution}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
