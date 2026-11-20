/**
 * Màn soạn bài (Hình 3-11; API 51, 52, 54–56; UC 20, 22). ND02 làm khung, thẻ "Thông tin bài" và "Mô hình"; ND03
 * làm thẻ "Bộ phận" (nút Lưu gọi API 52 rồi API 56 cho phần nào có thay đổi).
 * ND04 làm thẻ "Câu hỏi" (lưu riêng từng câu, API 57–59). Thẻ Thí nghiệm và nút Xem trước chờ việc sau (cấu trúc
 * lessons.config chưa thống nhất với Dev Bài học – TIEN_DO.md mục 10).
 */
import { ChevronRight, CircleCheck, Eye, TriangleAlert, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "@/api/client";
import {
  getLesson,
  listSubjects,
  publishLesson,
  replaceLessonParts,
  unpublishLesson,
  updateLesson,
  type ActiveAssignment,
  type DuplicateLesson,
  type PartInUse,
  type LessonDetail,
  type Subject,
} from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TrangThaiBai } from "./BaiHocPage";
import {
  type BoPhanNhap,
  giuKhoa,
  khacDaLuu,
  kiemTraBoPhan,
  laCameraView,
  type LoiBoPhan,
  loiBoPhanTuMayChu,
  thanhDauVaoBoPhan,
  tuDanhSach,
} from "./bo-phan";
import { cauLoi, giongJson, loiTuMayChu, thanhDauVao, tuBaiHoc } from "./chuyen-doi";
import { GoXuatBanDialog, ThieuDieuKienDialog, TrungBaiDialog } from "./HopThoai";
import { type CauNhap, khacDaLuu as khacCauDaLuu } from "./cau-hoi";
import { TheBoPhan } from "./TheBoPhan";
import { TheCauHoi } from "./TheCauHoi";
import { TheMoHinh } from "./TheMoHinh";
import { kiemTraThongTin, ThongTinBaiForm, type LoiThongTin, type ThongTinBai } from "./ThongTinBaiForm";

type The = "thong-tin" | "mo-hinh" | "bo-phan" | "cau-hoi" | "thi-nghiem";

/** Việc làm tiếp khi lưu xong (dùng khi máy chủ hỏi trùng bài, người dùng bấm "Vẫn lưu"). */
type SauKhiLuu = "luu" | "xuat-ban";

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
  // `config` đang soạn: ND02 sửa `camera_tong_quan` (nút "Lưu góc tổng quan" ở thẻ Bộ phận), các khóa khác giữ nguyên.
  const [cauHinh, setCauHinh] = useState<Record<string, unknown>>({});
  const [loi, setLoi] = useState<LoiThongTin>({});
  const [boPhan, setBoPhan] = useState<BoPhanNhap[]>([]);
  // Câu hỏi đang soạn ở thẻ Câu hỏi: giữ ở đây để đổi thẻ không mất.
  const [cauNhap, setCauNhap] = useState<CauNhap | null>(null);
  const [loiBoPhan, setLoiBoPhan] = useState<LoiBoPhan>({});
  const [thongBao, setThongBao] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  // Hộp hỏi trùng bài nhớ luôn việc người dùng đang làm (lưu nháp hay xuất bản) để "Vẫn lưu" làm tiếp đúng việc đó.
  const [trung, setTrung] = useState<{ ds: DuplicateLesson[]; sauDo: SauKhiLuu } | null>(null);
  const [thieu, setThieu] = useState<string[] | null>(null);
  const [moGo, setMoGo] = useState(false);
  const [giaoConHan, setGiaoConHan] = useState<ActiveAssignment[] | null>(null);
  const [loiGo, setLoiGo] = useState<string | null>(null);
  const [lanTai, setLanTai] = useState(0);

  /** Nạp bài từ máy chủ. `giuBoPhan`: giữ danh sách bộ phận đang soạn (vừa lưu thông tin bài, bộ phận lưu tiếp sau). */
  const napBai = useCallback((b: LessonDetail, giuBoPhan = false) => {
    setBai(b);
    setForm(tuBaiHoc(b));
    setAssetId(b.asset?.id ?? null);
    setCauHinh(b.config ?? {});
    setLoi({});
    if (!giuBoPhan) {
      setBoPhan(tuDanhSach(b.parts));
      setLoiBoPhan({});
    }
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

  const doiThongTin =
    !!bai &&
    !!form &&
    (JSON.stringify(form) !== JSON.stringify(tuBaiHoc(bai)) ||
      assetId !== (bai.asset?.id ?? null) ||
      !giongJson(cauHinh, bai.config ?? {}));
  const doiBoPhan = !!bai && khacDaLuu(boPhan, bai.parts);
  const thayDoi = doiThongTin || doiBoPhan;
  // Câu hỏi lưu riêng từng câu (thẻ Câu hỏi), không tính vào nút Lưu nháp; chỉ dùng để hỏi lại khi rời trang.
  const cauChuaLuu =
    !!bai && !!cauNhap && khacCauDaLuu(cauNhap, bai.questions.find((q) => q.id === cauNhap.id) ?? null);
  const conChuaLuu = thayDoi || cauChuaLuu;

  // Đóng tab / tải lại khi còn thay đổi chưa lưu: trình duyệt hỏi lại.
  useEffect(() => {
    if (!conChuaLuu) return;
    const chan = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", chan);
    return () => window.removeEventListener("beforeunload", chan);
  }, [conChuaLuu]);

  /**
   * Lưu thông tin bài (API 52) rồi nhãn bộ phận (API 56), phần nào có thay đổi thì gửi phần đó.
   * Trả bài mới hoặc null nếu chưa lưu được (lỗi đã hiện).
   */
  async function luu(xacNhanTrung = false, sauDo: SauKhiLuu = "luu"): Promise<LessonDetail | null> {
    if (!bai || !form) return null;
    const l = kiemTraThongTin(form);
    setLoi(l);
    if (Object.keys(l).length) {
      setThe("thong-tin");
      setThongBao({ tone: "danger", text: "Thông tin bài chưa hợp lệ, hãy sửa các ô được đánh dấu" });
      return null;
    }
    if (doiBoPhan) {
      if (bai.status === "PUBLISHED" && boPhan.length === 0) {
        setThe("bo-phan");
        setThongBao({
          tone: "danger",
          text: "Bài đã xuất bản phải có ít nhất một nhãn bộ phận. Hãy gỡ xuất bản trước nếu muốn xóa hết nhãn",
        });
        return null;
      }
      const lb = kiemTraBoPhan(boPhan, bai.asset?.mesh_names ?? []);
      setLoiBoPhan(lb);
      if (Object.keys(lb).length) {
        setThe("bo-phan");
        setThongBao({ tone: "danger", text: "Có bộ phận chưa hợp lệ, hãy sửa các bộ phận có dấu cảnh báo" });
        return null;
      }
    }
    setDangLuu(true);
    setThongBao(null);
    try {
      let b: LessonDetail | null = bai;
      if (doiThongTin) b = await luuThongTin(xacNhanTrung, sauDo);
      if (b && doiBoPhan) b = await luuBoPhan(b);
      return b;
    } finally {
      setDangLuu(false);
    }
  }

  /** API 56 (gọi trong luu()). */
  async function luuBoPhan(b: LessonDetail): Promise<LessonDetail | null> {
    try {
      const moi = await replaceLessonParts(b.id, thanhDauVaoBoPhan(boPhan));
      napBai(moi);
      // Máy chủ trả đúng thứ tự đã gửi: giữ khóa cũ để bộ phận đang chọn ở thẻ Bộ phận vẫn được chọn.
      setBoPhan(giuKhoa(tuDanhSach(moi.parts), boPhan));
      return moi;
    } catch (e) {
      const lb = loiBoPhanTuMayChu(e, boPhan);
      if (lb) setLoiBoPhan(lb);
      setThe("bo-phan");
      const cau = lb
        ? "Có bộ phận chưa hợp lệ, hãy sửa các bộ phận có dấu cảnh báo"
        : e instanceof ApiError && e.code === "PART_IN_USE" && Array.isArray(e.details)
          ? // Bộ phận đang là đáp án câu "chọn bộ phận" (ND04): nói rõ câu nào.
            `${e.message}: ${(e.details as PartInUse[])
              .map((d) => `câu ${d.question_no} dùng "${d.part_label}"`)
              .join("; ")}`
          : e instanceof ApiError
            ? e.message
            : "Không lưu được nhãn bộ phận, hãy thử lại";
      // Thông tin bài vừa lưu xong mà nhãn lỗi: nói rõ phần nào đã lưu.
      setThongBao({
        tone: "danger",
        text: doiThongTin ? `Đã lưu thông tin bài, chưa lưu được nhãn bộ phận. ${cau}` : cau,
      });
      return null;
    }
  }

  /** API 52 (gọi trong luu()); giữ danh sách bộ phận đang soạn để lưu tiếp bằng API 56. */
  async function luuThongTin(xacNhanTrung: boolean, sauDo: SauKhiLuu): Promise<LessonDetail | null> {
    if (!bai || !form) return null;
    try {
      const b = await updateLesson(
        bai.id,
        thanhDauVao(form, { asset_id: assetId, config: cauHinh, confirm_duplicate: xacNhanTrung }),
      );
      setTrung(null);
      napBai(b, true);
      return b;
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE_LESSON") {
        setTrung({ ds: (e.details as DuplicateLesson[] | null) ?? [], sauDo });
        return null;
      }
      setTrung(null);
      if (e instanceof ApiError && e.code === "LESSON_INCOMPLETE") {
        setThieu(Array.isArray(e.details) ? (e.details as string[]) : []);
        return null;
      }
      const loiO = loiTuMayChu(e);
      const c = cauLoi(e, "Không lưu được, hãy thử lại");
      if (loiO) setLoi(loiO);
      if (loiO && c.loiMoHinh) {
        // Lỗi ở cả hai thẻ: ở lại thẻ Thông tin bài (thấy ô bị đánh dấu), câu báo nhắc thêm thẻ Mô hình.
        setThe("thong-tin");
        setThongBao({
          tone: "danger",
          text: `Hãy sửa các ô được đánh dấu. ${c.text}. Kiểm tra thêm thẻ Mô hình`,
        });
        return null;
      }
      if (loiO) setThe("thong-tin");
      if (c.loiMoHinh) setThe("mo-hinh");
      setThongBao({ tone: "danger", text: c.text });
      return null;
    }
  }

  function baoDaLuu() {
    setThongBao({
      tone: "success",
      text: `Đã lưu lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
    });
  }

  async function luuNhap() {
    if (await luu()) baoDaLuu();
  }

  async function xuatBan(daLuu?: LessonDetail) {
    let b = daLuu ?? bai;
    if (!daLuu && thayDoi) b = await luu(false, "xuat-ban");
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
      // Giữ nhãn bộ phận đang soạn (chưa lưu) khi gỡ xuất bản.
      napBai(await unpublishLesson(bai.id, xacNhan), true);
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
    if (conChuaLuu && !window.confirm("Bài còn thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?"))
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
    { key: "bo-phan", label: `Bộ phận · ${boPhan.length}` },
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
        {the === "bo-phan" && (
          <TheBoPhan
            asset={bai.asset}
            gocTongQuan={laCameraView(cauHinh.camera_tong_quan) ? cauHinh.camera_tong_quan : null}
            onDoiGocTongQuan={(g) =>
              setCauHinh((c) => {
                const { camera_tong_quan: _bo, ...khac } = c;
                return g ? { ...khac, camera_tong_quan: g } : khac;
              })
            }
            doiMoHinhChuaLuu={assetId !== (bai.asset?.id ?? null)}
            value={boPhan}
            onChange={setBoPhan}
            loi={loiBoPhan}
            disabled={dangLuu}
            onDenTheMoHinh={() => setThe("mo-hinh")}
          />
        )}
        {the === "cau-hoi" && (
          <TheCauHoi
            bai={bai}
            boPhanChuaLuu={doiBoPhan}
            nhap={cauNhap}
            onNhap={setCauNhap}
            onDoiCauHoi={(ds) => setBai((b) => (b ? { ...b, questions: ds } : b))}
            onDenTheBoPhan={() => setThe("bo-phan")}
          />
        )}
        {the === "thi-nghiem" && (
          <section className="flex flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-6 py-16 text-center">
            <p className="font-medium">
              {laThiNghiem
                ? "Cấu hình thí nghiệm sẽ có ở bản cập nhật tới"
                : "Bài cấu tạo không có phần thí nghiệm"}
            </p>
            <p className="max-w-md text-[14px] text-text-2">
              {laThiNghiem
                ? "Thông số, công thức đáp án và sai số cho phép sẽ khai báo ở đây."
                : "Đổi loại bài sang Thí nghiệm ở thẻ Thông tin bài nếu bài có thông số, chấm điểm."}
            </p>
          </section>
        )}
      </div>

      <TrungBaiDialog
        trung={trung?.ds ?? null}
        dangLuu={dangLuu}
        onClose={() => setTrung(null)}
        onConfirm={async () => {
          // Đang bấm Xuất bản thì bị hỏi trùng: lưu xong xuất bản tiếp, không bắt bấm lại.
          const sauDo = trung?.sauDo ?? "luu";
          const b = await luu(true, sauDo);
          if (!b) return;
          if (sauDo === "xuat-ban") await xuatBan(b);
          else baoDaLuu();
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
