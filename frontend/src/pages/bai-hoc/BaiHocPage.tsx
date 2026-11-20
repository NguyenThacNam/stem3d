/**
 * Danh sách bài học của biên tập viên (API 49; UC 20). Bảng theo Hình 3-12; thẻ lọc Đang soạn / Đã xuất bản
 * (menu "Bài đang soạn", "Bài đã xuất bản" trong mẫu gộp thành một mục, lọc bằng thẻ).
 */
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Ellipsis,
  PenLine,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Page } from "@/api/assets";
import { ApiError } from "@/api/client";
import {
  deleteLesson,
  LESSON_TYPE_LABEL,
  listLessons,
  listSubjects,
  unpublishLesson,
  type ActiveAssignment,
  type LessonListItem,
  type LessonStatus,
  type Subject,
} from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GoXuatBanDialog, XoaBaiDialog } from "./HopThoai";
import { TaoBaiDialog } from "./TaoBaiDialog";
import { lopCuaMon } from "./ThongTinBaiForm";

const PAGE_SIZE = 20;

const THE: { value: LessonStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "DRAFT", label: "Đang soạn" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
];

type TrangThai =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: Page<LessonListItem> };

export function TrangThaiBai({ status }: { status: LessonStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        aria-hidden
        className={cn("size-[7px] rounded-full", status === "PUBLISHED" ? "bg-accent" : "bg-muted")}
      />
      {status === "PUBLISHED" ? "Đã xuất bản" : "Nháp"}
    </span>
  );
}

export function BaiHocPage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [the, setThe] = useState<LessonStatus | "">("");
  const [monLoc, setMonLoc] = useState<number | "">("");
  const [lopLoc, setLopLoc] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [page, setPage] = useState(1);
  const [tt, setTt] = useState<TrangThai>({ kind: "loading" });
  const [lanTai, setLanTai] = useState(0);
  const [moTao, setMoTao] = useState(false);
  const [thongBao, setThongBao] = useState<string | null>(null);
  const yeuCau = useRef(0);

  // Gỡ xuất bản, xóa từ menu "⋯".
  const [dangGo, setDangGo] = useState<LessonListItem | null>(null);
  const [giaoConHan, setGiaoConHan] = useState<ActiveAssignment[] | null>(null);
  const [dangXoa, setDangXoa] = useState<LessonListItem | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loiHopThoai, setLoiHopThoai] = useState<string | null>(null);

  useEffect(() => {
    listSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

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
    listLessons({
      status: the || undefined,
      subjectId: monLoc || undefined,
      grade: lopLoc || undefined,
      q: tuKhoa,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        if (so !== yeuCau.current) return;
        if (data.items.length === 0 && page > 1) setPage(Math.max(1, Math.ceil(data.total / data.page_size)));
        else setTt({ kind: "ready", data });
      })
      .catch((e) => {
        if (so === yeuCau.current)
          setTt({
            kind: "error",
            message: e instanceof ApiError ? e.message : "Không tải được danh sách bài học",
          });
      });
  }, [the, monLoc, lopLoc, tuKhoa, page, lanTai]);

  const taiLai = useCallback(() => setLanTai((x) => x + 1), []);
  const data = tt.kind === "ready" ? tt.data : null;
  const tongTrang = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const dangLoc = !!(tuKhoa || monLoc || lopLoc || the);

  function dongHopThoai() {
    setDangGo(null);
    setDangXoa(null);
    setGiaoConHan(null);
    setLoiHopThoai(null);
  }

  async function goXuatBan(xacNhan: boolean) {
    if (!dangGo) return;
    setDangXuLy(true);
    setLoiHopThoai(null);
    try {
      await unpublishLesson(dangGo.id, xacNhan);
      setThongBao(`Đã gỡ xuất bản ${dangGo.title}`);
      dongHopThoai();
      taiLai();
    } catch (e) {
      if (e instanceof ApiError && e.code === "LESSON_ASSIGNED")
        setGiaoConHan((e.details as ActiveAssignment[] | null) ?? []);
      else setLoiHopThoai(e instanceof ApiError ? e.message : "Không gỡ được, hãy thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  async function xoa() {
    if (!dangXoa) return;
    setDangXuLy(true);
    try {
      await deleteLesson(dangXoa.id);
      setThongBao(`Đã xóa bài ${dangXoa.title}`);
      dongHopThoai();
      taiLai();
    } catch (e) {
      if (e instanceof ApiError && e.code === "LESSON_NOT_FOUND") {
        dongHopThoai();
        taiLai();
      } else setLoiHopThoai(e instanceof ApiError ? e.message : "Không xóa được, hãy thử lại");
    } finally {
      setDangXuLy(false);
    }
  }

  return (
    <>
      <header className="flex flex-wrap items-start gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-snug font-medium">Bài học</h1>
          <p className="mt-0.5 text-[14px] text-text-2">
            {data
              ? `${formatNumber(data.total)} bài${dangLoc ? " khớp bộ lọc" : ""}`
              : "Soạn, xuất bản và gỡ xuất bản bài học"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="text"
            enterKeyHint="search"
            aria-label="Tìm theo tên bài hoặc chương"
            placeholder="Tìm theo tên bài hoặc chương"
            className="w-[280px]"
            leading={<Search strokeWidth={1.5} />}
            value={q}
            maxLength={200}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="primary" onClick={() => setMoTao(true)}>
            <Plus strokeWidth={1.5} aria-hidden />
            Tạo bài học
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Lọc theo trạng thái"
          className="flex gap-1 rounded-ctl bg-surface-2 p-1"
        >
          {THE.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={the === t.value}
              onClick={() => {
                setThe(t.value);
                setPage(1);
              }}
              className={cn(
                "h-8 rounded-[6px] px-3 text-[14px]",
                the === t.value
                  ? "bg-surface font-medium text-text shadow-[0_0_0_1px_var(--color-line)]"
                  : "text-text-2 hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <NativeSelect
          aria-label="Lọc theo môn"
          className="w-[220px]"
          value={monLoc}
          onChange={(e) => {
            setMonLoc(e.target.value === "" ? "" : Number(e.target.value));
            setLopLoc("");
            setPage(1);
          }}
        >
          <option value="">Mọi môn</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Lọc theo lớp"
          className="w-[140px]"
          value={lopLoc}
          onChange={(e) => {
            setLopLoc(e.target.value === "" ? "" : Number(e.target.value));
            setPage(1);
          }}
        >
          <option value="">Mọi lớp</option>
          {lopCuaMon(subjects.find((s) => s.id === monLoc)).map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {thongBao && (
          <Alert tone="success" className="items-center">
            <CircleCheck strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{thongBao}</span>
            <button
              type="button"
              onClick={() => setThongBao(null)}
              className="text-[13px] font-medium hover:underline"
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

      {tt.kind === "loading" && (
        <div
          className="overflow-hidden rounded-card border border-line bg-surface"
          aria-busy
          aria-label="Đang tải danh sách bài học"
        >
          <div className="h-10 border-b border-line" />
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-12 items-center gap-6 border-b border-line px-4 last:border-b-0">
              <div className="h-3.5 w-56 rounded-full bg-surface-2" />
              <div className="h-3.5 w-24 rounded-full bg-surface-2" />
              <div className="ml-auto h-3.5 w-64 rounded-full bg-surface-2" />
            </div>
          ))}
        </div>
      )}

      {data && data.total === 0 && (
        <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
          <BookOpen className="size-[18px] text-muted" strokeWidth={1.5} aria-hidden />
          {dangLoc ? (
            <>
              <p className="font-medium">Không có bài nào khớp bộ lọc</p>
              <p className="max-w-md text-[14px] text-text-2">
                Đổi thẻ, môn, lớp hoặc từ khóa để xem các bài khác.
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Chưa có bài học nào</p>
              <p className="max-w-md text-[14px] text-text-2">
                Tạo bài đầu tiên, chọn mô hình 3D đã nạp, gắn nhãn bộ phận rồi xuất bản cho học sinh.
              </p>
              <Button variant="primary" onClick={() => setMoTao(true)}>
                <Plus strokeWidth={1.5} aria-hidden />
                Tạo bài học
              </Button>
            </>
          )}
        </section>
      )}

      {data && data.total > 0 && (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <caption className="sr-only">Danh sách bài học</caption>
              <thead>
                <tr className="h-10 border-b border-line text-left text-[13px] text-text-2 [&>th]:px-4 [&>th]:font-medium [&>th]:whitespace-nowrap">
                  <th scope="col">Tên bài</th>
                  <th scope="col">Môn</th>
                  <th scope="col">Mô hình</th>
                  <th scope="col" className="text-right">
                    Bộ phận
                  </th>
                  <th scope="col" className="text-right">
                    Câu hỏi
                  </th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col" className="text-right">
                    Cập nhật
                  </th>
                  <th scope="col" className="w-14">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr
                    key={b.id}
                    className="h-12 border-b border-line last:border-b-0 hover:bg-bg [&>td]:px-4 [&>td]:whitespace-nowrap"
                  >
                    <td className="max-w-[260px]">
                      <Link
                        to={`/bien-tap/bai-hoc/${b.id}`}
                        className="block truncate font-medium underline-offset-2 hover:text-accent-ink hover:underline"
                      >
                        {b.title}
                      </Link>
                      {(b.lesson_no || b.chapter) && (
                        <span className="block truncate text-[13px] text-text-2">
                          {[b.lesson_no ? `Bài ${b.lesson_no}` : null, b.chapter].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="block text-text-2">
                        {b.subject.name} {b.grade}
                      </span>
                      <span className="block text-[13px] text-text-2">
                        {b.lesson_type ? LESSON_TYPE_LABEL[b.lesson_type] : "–"}
                      </span>
                    </td>
                    <td className={cn("max-w-[150px] truncate", !b.asset_name && "text-text-2")}>
                      {b.asset_name ?? "Chưa chọn"}
                    </td>
                    <td className="text-right">{formatNumber(b.part_count)}</td>
                    <td className="text-right">{formatNumber(b.question_count)}</td>
                    <td>
                      <TrangThaiBai status={b.status} />
                    </td>
                    <td className="text-right text-text-2">{formatDate(b.updated_at)}</td>
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Thao tác với ${b.title}`}
                          className="grid size-8 place-items-center rounded-ctl text-muted hover:bg-surface-2 hover:text-text data-[state=open]:bg-surface-2"
                        >
                          <Ellipsis className="size-[18px]" strokeWidth={1.5} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/bien-tap/bai-hoc/${b.id}`)}>
                            <PenLine strokeWidth={1.5} aria-hidden />
                            Soạn bài
                          </DropdownMenuItem>
                          {b.status === "PUBLISHED" && (
                            <DropdownMenuItem onSelect={() => setDangGo(b)}>
                              <Undo2 strokeWidth={1.5} aria-hidden />
                              Gỡ xuất bản
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem tone="danger" onSelect={() => setDangXoa(b)}>
                            <Trash2 strokeWidth={1.5} aria-hidden />
                            Xóa bài học
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
                <Button size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
                  <ChevronLeft strokeWidth={1.5} aria-hidden />
                  Trang trước
                </Button>
                <span className="px-1">
                  Trang {data.page}/{tongTrang}
                </span>
                <Button size="sm" disabled={data.page >= tongTrang} onClick={() => setPage(data.page + 1)}>
                  Trang sau
                  <ChevronRight strokeWidth={1.5} aria-hidden />
                </Button>
              </div>
            </nav>
          )}
        </div>
      )}

      <TaoBaiDialog
        open={moTao}
        onOpenChange={setMoTao}
        subjects={subjects}
        onCreated={(b) => navigate(`/bien-tap/bai-hoc/${b.id}`)}
      />
      <GoXuatBanDialog
        ten={dangGo?.title ?? ""}
        mo={dangGo !== null}
        dangGiao={giaoConHan}
        dangGo={dangXuLy}
        loi={loiHopThoai}
        onClose={dongHopThoai}
        onConfirm={() => void goXuatBan(giaoConHan !== null)}
      />
      <XoaBaiDialog
        ten={dangXoa?.title ?? ""}
        mo={dangXoa !== null}
        dangXoa={dangXuLy}
        loi={loiHopThoai}
        onClose={dongHopThoai}
        onConfirm={() => void xoa()}
      />
    </>
  );
}
