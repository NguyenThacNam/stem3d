/**
 * Thư viện mô hình 3D (Bảng 3-15: bảng như Hình 3-12, thêm cột chỉ số kỹ thuật; API 45–48; UC 21).
 * Biên tập viên, quản trị hệ thống. Chỉ số vượt mức khuyến nghị tô vàng.
 */
import {
  Box,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Ellipsis,
  Eye,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { listAssets, SOURCE_LABEL, type AssetListItem, type CheckField, type Page } from "@/api/assets";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { formatBytes, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChiTietMoHinhDialog } from "./ChiTietMoHinhDialog";
import { NapMoHinhDialog } from "./NapMoHinhDialog";
import { XoaMoHinhDialog } from "./XoaMoHinhDialog";

const PAGE_SIZE = 20;

type TrangThai =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: Page<AssetListItem> };

function ChiSo({ value, field, warn }: { value: number | null; field: CheckField; warn: CheckField[] }) {
  const text =
    value === null
      ? "–"
      : field === "file_size"
        ? formatBytes(value)
        : field === "max_texture_px"
          ? `${formatNumber(value)} px`
          : formatNumber(value);
  if (!warn.includes(field)) return <>{text}</>;
  return (
    <span
      className="rounded-[6px] bg-warn-weak px-1.5 py-0.5 font-medium text-warn"
      title="Vượt mức khuyến nghị"
    >
      {text}
      <span className="sr-only"> (vượt mức khuyến nghị)</span>
    </span>
  );
}

export function MoHinh3DPage() {
  const [q, setQ] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [page, setPage] = useState(1);
  const [tt, setTt] = useState<TrangThai>({ kind: "loading" });
  const [lanTai, setLanTai] = useState(0);
  const [moNap, setMoNap] = useState(false);
  const [dangXem, setDangXem] = useState<AssetListItem | null>(null);
  const [dangXoa, setDangXoa] = useState<AssetListItem | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const yeuCau = useRef(0);
  const [tuKhoaDaTai, setTuKhoaDaTai] = useState("");

  // Gõ tìm kiếm: chờ 300 ms mới gọi API.
  useEffect(() => {
    const t = setTimeout(() => {
      setTuKhoa(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const so = ++yeuCau.current;
    setTt((cu) => (cu.kind === "ready" ? cu : { kind: "loading" }));
    listAssets({ q: tuKhoa, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (so !== yeuCau.current) return;
        // Trang hiện tại trống sau khi xóa dòng cuối: lùi một trang.
        if (data.items.length === 0 && page > 1) setPage(Math.max(1, Math.ceil(data.total / data.page_size)));
        else {
          setTt({ kind: "ready", data });
          setTuKhoaDaTai(tuKhoa);
        }
      })
      .catch((e) => {
        if (so === yeuCau.current)
          setTt({
            kind: "error",
            message: e instanceof ApiError ? e.message : "Không tải được danh sách mô hình",
          });
      });
  }, [tuKhoa, page, lanTai]);

  const taiLai = useCallback(() => setLanTai((x) => x + 1), []);

  function daNap(ten: string) {
    setThongBao(`Đã nạp mô hình ${ten}`);
    setQ("");
    setTuKhoa("");
    setPage(1);
    taiLai();
  }

  function daXoa(a: AssetListItem) {
    setDangXoa(null);
    setDangXem(null);
    setThongBao(`Đã xóa mô hình ${a.name}`);
    taiLai();
  }

  const data = tt.kind === "ready" ? tt.data : null;
  // Đổi trang / từ khóa: bảng cũ còn hiện, làm mờ cho biết đang tải.
  const dangTaiLai = data !== null && (data.page !== page || tuKhoaDaTai !== tuKhoa);
  const tongTrang = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <>
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-snug font-medium">Mô hình 3D</h1>
          <p className="mt-0.5 text-[14px] text-text-2">
            {data
              ? tuKhoa
                ? `${formatNumber(data.total)} mô hình khớp “${tuKhoa}”`
                : `${formatNumber(data.total)} mô hình đã nạp · file GLB dùng cho bài học`
              : "Nạp và kiểm tra mô hình 3D"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="text"
            enterKeyHint="search"
            aria-label="Tìm mô hình theo tên"
            placeholder="Tìm theo tên mô hình"
            className="w-[280px]"
            leading={<Search strokeWidth={1.5} />}
            value={q}
            maxLength={200}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="primary" onClick={() => setMoNap(true)}>
            <Plus strokeWidth={1.5} aria-hidden />
            Nạp mô hình
          </Button>
        </div>
      </header>

      <div aria-live="polite" className="empty:hidden">
        {thongBao && (
          <Alert tone="success" className="items-center">
            <CircleCheck strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{thongBao}</span>
            <button
              type="button"
              onClick={() => setThongBao(null)}
              className="text-[13px] font-medium underline-offset-2 hover:underline"
            >
              Ẩn
            </button>
          </Alert>
        )}
        {tt.kind === "error" && (
          <Alert tone="danger" className="items-center">
            <TriangleAlert strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{tt.message}</span>
            <Button size="sm" onClick={taiLai}>
              Thử lại
            </Button>
          </Alert>
        )}
      </div>

      {tt.kind === "loading" && <BangDangTai />}

      {data && data.total === 0 && (
        <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
          <Box className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
          {tuKhoa ? (
            <>
              <p className="font-medium">Không có mô hình nào khớp “{tuKhoa}”</p>
              <p className="max-w-md text-[14px] text-text-2">Thử từ khóa ngắn hơn hoặc xóa ô tìm kiếm.</p>
              <Button size="sm" onClick={() => setQ("")}>
                Xóa tìm kiếm
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">Chưa có mô hình nào</p>
              <p className="max-w-md text-[14px] text-text-2">
                Nạp file GLB đầu tiên. Hệ thống tự kiểm tra dung lượng, số tam giác và texture trước khi lưu.
              </p>
              <Button variant="primary" onClick={() => setMoNap(true)}>
                <Plus strokeWidth={1.5} aria-hidden />
                Nạp mô hình
              </Button>
            </>
          )}
        </section>
      )}

      {data && data.total > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div
            className={cn("overflow-x-auto", dangTaiLai && "opacity-60")}
            aria-busy={dangTaiLai || undefined}
          >
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">Danh sách mô hình 3D</caption>
              <thead>
                <tr className="h-10 border-b border-line text-left text-[13px] text-text-2 [&>th]:px-4 [&>th]:font-medium [&>th]:whitespace-nowrap">
                  <th scope="col">Tên mô hình</th>
                  <th scope="col">Nguồn</th>
                  <th scope="col" className="text-right">
                    Dung lượng
                  </th>
                  <th scope="col" className="text-right">
                    Tam giác
                  </th>
                  <th scope="col" className="text-right">
                    Texture
                  </th>
                  <th scope="col" className="text-right">
                    Số phần
                  </th>
                  <th scope="col" className="text-right">
                    Bài dùng
                  </th>
                  <th scope="col" className="text-right">
                    Ngày nạp
                  </th>
                  <th scope="col" className="w-14">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr
                    key={a.id}
                    className="h-12 border-b border-line last:border-b-0 hover:bg-bg [&>td]:px-4 [&>td]:whitespace-nowrap"
                  >
                    <td className="max-w-[320px]">
                      <button
                        type="button"
                        onClick={() => setDangXem(a)}
                        className="block max-w-full truncate rounded-[4px] text-left font-medium underline-offset-2 hover:text-accent-ink hover:underline"
                      >
                        {a.name}
                      </button>
                    </td>
                    <td className="text-text-2">{SOURCE_LABEL[a.source_type]}</td>
                    <td className="text-right">
                      <ChiSo value={a.file_size} field="file_size" warn={a.warning_fields} />
                    </td>
                    <td className="text-right">
                      <ChiSo value={a.triangle_count} field="triangle_count" warn={a.warning_fields} />
                    </td>
                    <td className="text-right">
                      <ChiSo value={a.max_texture_px} field="max_texture_px" warn={a.warning_fields} />
                    </td>
                    <td className="text-right">{formatNumber(a.mesh_count)}</td>
                    <td className={cn("text-right", a.lesson_count === 0 && "text-text-2")}>
                      {a.lesson_count === 0 ? "Chưa dùng" : formatNumber(a.lesson_count)}
                    </td>
                    <td className="text-right text-text-2">{formatDate(a.created_at)}</td>
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Thao tác với ${a.name}`}
                          className="grid size-8 place-items-center rounded-ctl text-muted hover:bg-surface-2 hover:text-text data-[state=open]:bg-surface-2"
                        >
                          <Ellipsis className="size-[18px]" strokeWidth={1.5} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDangXem(a)}>
                            <Eye strokeWidth={1.5} aria-hidden />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem tone="danger" onSelect={() => setDangXoa(a)}>
                            <Trash2 strokeWidth={1.5} aria-hidden />
                            Xóa mô hình
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tongTrang > 1 && (
            <nav
              aria-label="Phân trang"
              className="flex h-12 items-center justify-between border-t border-line px-4 text-[14px] text-text-2"
            >
              <span>
                {formatNumber((data.page - 1) * data.page_size + 1)}–
                {formatNumber(Math.min(data.page * data.page_size, data.total))} trên{" "}
                {formatNumber(data.total)}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft strokeWidth={1.5} aria-hidden />
                  Trang trước
                </Button>
                <span className="px-1">
                  Trang {data.page}/{tongTrang}
                </span>
                <Button size="sm" disabled={page >= tongTrang} onClick={() => setPage((p) => p + 1)}>
                  Trang sau
                  <ChevronRight strokeWidth={1.5} aria-hidden />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}

      <NapMoHinhDialog open={moNap} onOpenChange={setMoNap} onUploaded={daNap} onAborted={taiLai} />
      <ChiTietMoHinhDialog asset={dangXem} onClose={() => setDangXem(null)} onDelete={(a) => setDangXoa(a)} />
      <XoaMoHinhDialog asset={dangXoa} onClose={() => setDangXoa(null)} onDeleted={daXoa} />
    </>
  );
}

/** Khung xám giữ chỗ khi đang tải (mục 3.2.1). */
function BangDangTai() {
  return (
    <div
      className="overflow-hidden rounded-card border border-line bg-surface"
      aria-busy
      aria-label="Đang tải danh sách mô hình"
    >
      <div className="h-10 border-b border-line" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex h-12 items-center gap-6 border-b border-line px-4 last:border-b-0">
          <div className="h-3.5 w-48 rounded-full bg-surface-2" />
          <div className="h-3.5 w-20 rounded-full bg-surface-2" />
          <div className="ml-auto h-3.5 w-64 rounded-full bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
