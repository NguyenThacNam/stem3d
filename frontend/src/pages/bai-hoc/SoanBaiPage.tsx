/**
 * Màn soạn bài (Hình 3-11; API 51, 52, 54, 55; UC 20). ND02 làm khung, thẻ "Thông tin bài" và "Mô hình".
 * Thẻ Bộ phận (ND03), Câu hỏi (ND04), Thí nghiệm và nút Xem trước chờ việc sau (cấu trúc lessons.config chưa
 * thống nhất với Dev Bài học – TIEN_DO.md mục 10).
 */
import { ChevronRight, CircleCheck, Eye, TriangleAlert, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "@/api/client";
import {
  getLesson,
  listSubjects,
  publishLesson,
  unpublishLesson,
  updateLesson,
  type ActiveAssignment,
  type DuplicateLesson,
  type LessonDetail,
  type Subject,
} from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrangThaiBai } from "./BaiHocPage";
import { cauLoi, loiTuMayChu, thanhDauVao, tuBaiHoc } from "./chuyen-doi";
import { GoXuatBanDialog, ThieuDieuKienDialog, TrungBaiDialog } from "./HopThoai";
import { TheMoHinh } from "./TheMoHinh";
import { kiemTraThongTin, ThongTinBaiForm, type LoiThongTin, type ThongTinBai } from "./ThongTinBaiForm";

type The = "thong-tin" | "mo-hinh" | "bo-phan" | "cau-hoi" | "thi-nghiem";

type TaiBai = { kind: "loading" } | { kind: "error"; message: string; notFound: boolean } | { kind: "ready" };

export function SoanBaiPage() {
  const { id } = useParams();
  const lessonId = Number(id);
  const [tai, setTai] = useState<TaiBai>({ kind: "loading" });
  const [bai, setBai] = useState<LessonDetail | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [the, setThe] = useState<The>("thong-tin");
  const [form, setForm] = useState<ThongTinBai | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);
  const [loi, setLoi] = useState<LoiThongTin>({});
  const [thongBao, setThongBao] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [trung, setTrung] = useState<DuplicateLesson[] | null>(null);
  const [thieu, setThieu] = useState<string[] | null>(null);
  const [moGo, setMoGo] = useState(false);
  const [giaoConHan, setGiaoConHan] = useState<ActiveAssignment[] | null>(null);
  const [loiGo, setLoiGo] = useState<string | null>(null);
  const [lanTai, setLanTai] = useState(0);
  const xuatBanSauLuu = useRef(false);

  const napBai = useCallback((b: LessonDetail) => {
    setBai(b);
    setForm(tuBaiHoc(b));
    setAssetId(b.asset?.id ?? null);
    setLoi({});
  }, []);

  useEffect(() => {
    listSubjects()
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!Number.isInteger(lessonId) || lessonId < 1) {
      setTai({ kind: "error", message: "Đường dẫn bài học không đúng", notFound: true });
      return;
    }
    let huy = false;
    setTai({ kind: "loading" });
    getLesson(lessonId)
      .then((b) => {
        if (huy) return;
        napBai(b);
        setTai({ kind: "ready" });
      })
      .catch((e) => {
        if (huy) return;
        const err = e instanceof ApiError ? e : null;
        setTai({
          kind: "error",
          message: err?.message ?? "Không tải được bài học, hãy thử lại",
          notFound: err?.code === "LESSON_NOT_FOUND",
        });
      });
    return () => {
      huy = true;
    };
  }, [lessonId, lanTai, napBai]);

  const thayDoi =
    !!bai &&
    !!form &&
    (JSON.stringify(form) !== JSON.stringify(tuBaiHoc(bai)) || assetId !== (bai.asset?.id ?? null));

  // Đóng tab / tải lại khi còn thay đổi chưa lưu: trình duyệt hỏi lại.
  useEffect(() => {
    if (!thayDoi) return;
    const chan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", chan);
    return () => window.removeEventListener("beforeunload", chan);
  }, [thayDoi]);

  /** Lưu (API 52). Trả bài mới hoặc null nếu chưa lưu được (lỗi đã hiện). */
  async function luu(xacNhanTrung = false): Promise<LessonDetail | null> {
    if (!bai || !form) return null;
    const l = kiemTraThongTin(form);
    setLoi(l);
    if (Object.keys(l).length) {
      setThe("thong-tin");
      setThongBao({ tone: "danger", text: "Thông tin bài chưa hợp lệ, hãy sửa các ô được đánh dấu" });
      return null;
    }
    setDangLuu(true);
    setThongBao(null);
    try {
      const b = await updateLesson(
        bai.id,
        thanhDauVao(form, { asset_id: assetId, config: bai.config, confirm_duplicate: xacNhanTrung }),
      );
      setTrung(null);
      napBai(b);
      return b;
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE_LESSON") {
        setTrung((e.details as DuplicateLesson[] | null) ?? []);
        return null;
      }
      setTrung(null);
      if (e instanceof ApiError && e.code === "LESSON_INCOMPLETE") {
        setThieu(Array.isArray(e.details) ? (e.details as string[]) : []);
        return null;
      }
      const loiO = loiTuMayChu(e);
      if (loiO) {
        setLoi(loiO);
        setThe("thong-tin");
      }
      const c = cauLoi(e, "Không lưu được, hãy thử lại");
      if (c.loiMoHinh) setThe("mo-hinh");
      setThongBao({ tone: "danger", text: c.text });
      return null;
    } finally {
      setDangLuu(false);
    }
  }

  async function luuNhap() {
    const b = await luu();
    if (b)
      setThongBao({
        tone: "success",
        text: `Đã lưu lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
      });
  }

  async function xuatBan(daLuu?: LessonDetail) {
    let b = daLuu ?? bai;
    if (!daLuu && thayDoi) {
      xuatBanSauLuu.current = true;
      b = await luu();
    }
    xuatBanSauLuu.current = false;
    if (!b) return;
    setDangLuu(true);
    setThongBao(null);
    try {
      napBai(await publishLesson(b.id));
      setThongBao({ tone: "success", text: "Đã xuất bản. Học sinh, giáo viên thấy bài trong thư viện" });
    } catch (e) {
      if (e instanceof ApiError && e.code === "LESSON_INCOMPLETE")
        setThieu(Array.isArray(e.details) ? (e.details as string[]) : []);
      else
        setThongBao({
          tone: "danger",
          text: e instanceof ApiError ? e.message : "Không xuất bản được, hãy thử lại",
        });
    } finally {
      setDangLuu(false);
    }
  }

  async function goXuatBan(xacNhan: boolean) {
    if (!bai) return;
    setDangLuu(true);
    setLoiGo(null);
    try {
      napBai(await unpublishLesson(bai.id, xacNhan));
      setMoGo(false);
      setGiaoConHan(null);
      setThongBao({ tone: "success", text: "Đã gỡ xuất bản, bài chuyển về nháp" });
    } catch (e) {
      if (e instanceof ApiError && e.code === "LESSON_ASSIGNED")
        setGiaoConHan((e.details as ActiveAssignment[] | null) ?? []);
      else setLoiGo(e instanceof ApiError ? e.message : "Không gỡ được, hãy thử lại");
    } finally {
      setDangLuu(false);
    }
  }

  /** Rời màn soạn qua liên kết khi còn thay đổi chưa lưu: hỏi lại (menu thanh bên chưa chặn được – TIEN_DO.md mục 6). */
  function hoiKhiRoi(e: MouseEvent) {
    if (thayDoi && !window.confirm("Bài còn thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?"))
      e.preventDefault();
  }

  /** Mũi tên trái / phải, Home / End chuyển thẻ (mẫu thẻ của ARIA). */
  function doiTheBangPhim(e: KeyboardEvent, ds: The[]) {
    const i = ds.indexOf(the);
    const moi =
      e.key === "ArrowRight"
        ? ds[(i + 1) % ds.length]
        : e.key === "ArrowLeft"
          ? ds[(i - 1 + ds.length) % ds.length]
          : e.key === "Home"
            ? ds[0]
            : e.key === "End"
              ? ds[ds.length - 1]
              : null;
    if (!moi) return;
    e.preventDefault();
    setThe(moi);
    document.getElementById(`tab-${moi}`)?.focus();
  }

  if (tai.kind === "loading")
    return (
      <div className="flex flex-col gap-4" aria-busy aria-label="Đang tải bài học">
        <div className="h-4 w-48 rounded-full bg-surface-2" />
        <div className="h-7 w-96 rounded-full bg-surface-2" />
        <div className="h-[420px] rounded-card bg-surface-2" />
      </div>
    );

  if (tai.kind === "error" || !bai || !form)
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
        <TriangleAlert className="size-[18px] text-danger" strokeWidth={1.5} aria-hidden />
        <p className="font-medium">{tai.kind === "error" ? tai.message : "Không tải được bài học"}</p>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/bien-tap/bai-hoc">Về danh sách bài học</Link>
          </Button>
          {!(tai.kind === "error" && tai.notFound) && (
            <Button variant="primary" onClick={() => setLanTai((x) => x + 1)}>
              Thử lại
            </Button>
          )}
        </div>
      </section>
    );

  const daXuatBan = bai.status === "PUBLISHED";
  const laThiNghiem = form.lesson_type === "EXPERIMENT";
  const THE_DS: { key: The; label: string; off?: boolean }[] = [
    { key: "thong-tin", label: "Thông tin bài" },
    { key: "mo-hinh", label: "Mô hình" },
    { key: "bo-phan", label: `Bộ phận · ${bai.parts.length}` },
    { key: "cau-hoi", label: `Câu hỏi · ${bai.questions.length}` },
    { key: "thi-nghiem", label: "Thí nghiệm", off: !laThiNghiem },
  ];

  return (
    <>
      {/* Thanh trên (Hình 3-11): kéo ra sát mép vùng nội dung, nền trắng */}
      <div className="-mx-8 -mt-7 border-b border-line bg-surface px-8 pt-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <nav aria-label="Vị trí" className="flex items-center gap-1 text-[13px] text-text-2">
              <Link to="/bien-tap/bai-hoc" onClick={hoiKhiRoi} className="hover:text-text hover:underline">
                Bài học
              </Link>
              <ChevronRight className="size-3.5 text-muted" strokeWidth={1.5} aria-hidden />
              <span>
                {bai.subject.name} {bai.grade}
              </span>
            </nav>
            <div className="mt-0.5 flex items-center gap-2.5">
              <h1 className="truncate text-[20px] leading-snug font-medium">{bai.title}</h1>
              <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-surface-2 px-2.5 text-[13px] text-text-2">
                <TrangThaiBai status={bai.status} />
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button disabled title="Xem trước như học sinh sẽ có khi làm xong khung bài học 3D">
              <Eye strokeWidth={1.5} aria-hidden />
              Xem trước
            </Button>
            {daXuatBan && (
              <Button onClick={() => setMoGo(true)} disabled={dangLuu}>
                <Undo2 strokeWidth={1.5} aria-hidden />
                Gỡ xuất bản
              </Button>
            )}
            <Button
              variant={daXuatBan ? "primary" : "secondary"}
              onClick={() => void luuNhap()}
              disabled={dangLuu || !thayDoi}
            >
              {daXuatBan ? "Lưu thay đổi" : "Lưu nháp"}
            </Button>
            {!daXuatBan && (
              <Button variant="primary" onClick={() => void xuatBan()} disabled={dangLuu}>
                Xuất bản
              </Button>
            )}
          </div>
        </div>
        <div role="tablist" aria-label="Các phần của bài" className="mt-4 flex gap-6">
          {THE_DS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={the === t.key}
              aria-controls={the === t.key ? `panel-${t.key}` : undefined}
              tabIndex={the === t.key ? 0 : -1}
              onKeyDown={(e) =>
                doiTheBangPhim(
                  e,
                  THE_DS.map((x) => x.key),
                )
              }
              onClick={() => setThe(t.key)}
              className={cn(
                "-mb-px border-b-2 pt-2.5 pb-3 text-[14px]",
                the === t.key
                  ? "border-text font-medium text-text"
                  : "border-transparent text-text-2 hover:text-text",
                t.off && the !== t.key && "opacity-60",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="empty:hidden">
        {thongBao && (
          <Alert tone={thongBao.tone} className="items-center">
            {thongBao.tone === "success" ? (
              <CircleCheck strokeWidth={1.5} aria-hidden />
            ) : (
              <TriangleAlert strokeWidth={1.5} aria-hidden />
            )}
            <span className="flex-1">{thongBao.text}</span>
          </Alert>
        )}
      </div>

      {bai.missing_for_publish.length > 0 && !daXuatBan && the !== "mo-hinh" && (
        <p className="-mt-2 text-[14px] text-text-2">
          Còn thiếu để xuất bản:{" "}
          {bai.missing_for_publish.map((t) => t.charAt(0).toLowerCase() + t.slice(1)).join("; ")}.
        </p>
      )}

      <div role="tabpanel" id={`panel-${the}`} aria-labelledby={`tab-${the}`} className="min-h-0">
        {the === "thong-tin" && (
          <div className="grid grid-cols-[minmax(0,640px)_minmax(0,1fr)] gap-8">
            <ThongTinBaiForm
              value={form}
              onChange={setForm}
              subjects={subjects}
              errors={loi}
              disabled={dangLuu}
            />
            <dl className="self-start rounded-card border border-line bg-surface p-4 text-[14px] [&_dt]:text-text-2 [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&>div]:py-1.5">
              <div>
                <dt>Người tạo</dt>
                <dd>{bai.created_by_name ?? "–"}</dd>
              </div>
              <div>
                <dt>Cập nhật</dt>
                <dd>{formatDate(bai.updated_at)}</dd>
              </div>
              <div>
                <dt>Xuất bản lần gần nhất</dt>
                <dd>
                  {bai.published_at
                    ? `${formatDate(bai.published_at)} · ${bai.published_by_name ?? "–"}`
                    : "Chưa"}
                </dd>
              </div>
            </dl>
          </div>
        )}
        {the === "mo-hinh" && <TheMoHinh assetId={assetId} onChange={setAssetId} disabled={dangLuu} />}
        {(the === "bo-phan" || the === "cau-hoi" || the === "thi-nghiem") && (
          <section className="flex flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-6 py-16 text-center">
            <p className="font-medium">
              {the === "bo-phan"
                ? "Gắn nhãn bộ phận sẽ có ở bản cập nhật tới"
                : the === "cau-hoi"
                  ? "Soạn câu hỏi sẽ có ở bản cập nhật tới"
                  : laThiNghiem
                    ? "Cấu hình thí nghiệm sẽ có ở bản cập nhật tới"
                    : "Bài cấu tạo không có phần thí nghiệm"}
            </p>
            <p className="max-w-md text-[14px] text-text-2">
              {the === "bo-phan"
                ? `Bài đang có ${bai.parts.length} nhãn bộ phận. Cần ít nhất một nhãn để xuất bản.`
                : the === "cau-hoi"
                  ? `Bài đang có ${bai.questions.length} câu hỏi.`
                  : laThiNghiem
                    ? "Thông số, công thức đáp án và sai số cho phép sẽ khai báo ở đây."
                    : "Đổi loại bài sang Thí nghiệm ở thẻ Thông tin bài nếu bài có thông số, chấm điểm."}
            </p>
          </section>
        )}
      </div>

      <TrungBaiDialog
        trung={trung}
        dangLuu={dangLuu}
        onClose={() => setTrung(null)}
        onConfirm={async () => {
          // Đang bấm Xuất bản thì bị hỏi trùng: lưu xong xuất bản tiếp, không bắt bấm lại.
          const tiep = xuatBanSauLuu.current;
          const b = await luu(true);
          if (b && tiep) await xuatBan(b);
        }}
      />
      <ThieuDieuKienDialog thieu={thieu} onClose={() => setThieu(null)} />
      <GoXuatBanDialog
        ten={bai.title}
        mo={moGo}
        dangGiao={giaoConHan}
        dangGo={dangLuu}
        loi={loiGo}
        onClose={() => {
          setMoGo(false);
          setGiaoConHan(null);
          setLoiGo(null);
        }}
        onConfirm={() => void goXuatBan(giaoConHan !== null)}
      />
    </>
  );
}
