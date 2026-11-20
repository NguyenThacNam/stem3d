/**
 * Khung bài học 3D (Hình 3-5, BH01): thanh trên (quay lại, tên bài, chế độ, đặt lại góc nhìn, toàn màn hình), vùng 3D
 * trên nền ô li (thẻ chú thích, dòng hướng dẫn, ghi công), cột bộ phận và thẻ "Đang xem".
 * Chế độ Tự khám phá: chọn bộ phận trên mô hình hoặc trong danh sách → làm nổi bật, tách ra, camera bay tới góc nhìn;
 * "Lắp lại" đưa về chỗ cũ. Phim (HT03), Thí nghiệm (HT04), Kiểm tra (HT05) làm ở việc riêng.
 * Dữ liệu theo khuôn dạng API 9 (`LessonView`); HT02 nối API thật.
 */
import { ArrowLeft, Maximize, Minimize, Play, RotateCcw } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LessonView } from "@/api/types";
import { CanhBaiHoc, type NguonMoHinh } from "@/components/mo-hinh-3d/canh-bai-hoc";
import { LopTrangThai, type TrangThaiTai, trangThaiLoi } from "@/components/mo-hinh-3d/LopTrangThai";
import { thongKeMoHinh } from "@/components/mo-hinh-3d/tinh-toan";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { boPhanTiep, cacCheDo, type CheDo, dongPhu, sapXepBoPhan, TEN_CHE_DO } from "./bo-cuc";
import { LopChuThich, type LopChuThichHandle } from "./LopChuThich";

export type ThongTinKhung = { tenMesh: string[]; soTamGiac: number; thoiGianMs: number; gpu: string | null };

export function KhungBaiHoc({
  bai,
  nguon: nguonRieng,
  onQuayLai,
  dangBiDieuKhien = false,
  onDaTai,
  onFps,
}: {
  bai: LessonView;
  /** Nguồn mô hình khác `bai.asset` (trang thử mở file trên máy). */
  nguon?: NguonMoHinh;
  onQuayLai: () => void;
  /** LH05: giáo viên đang điều khiển lớp – hiện dải thông báo, khóa xoay và chọn. */
  dangBiDieuKhien?: boolean;
  onDaTai?: (thongTin: ThongTinKhung) => void;
  onFps?: (fps: number) => void;
}) {
  const nguon = useMemo<NguonMoHinh | null>(
    () => nguonRieng ?? (bai.asset ? { loai: "url", url: bai.asset.file_url, ten: bai.title } : null),
    [nguonRieng, bai.asset, bai.title],
  );
  const boPhan = useMemo(() => sapXepBoPhan(bai.parts), [bai.parts]);
  const cheDoCo = useMemo(() => cacCheDo(bai), [bai]);
  const tieuHoc = bai.grade <= 5; // Tiểu học: nút cao 48 px, chữ 18 px (mục 3.2.1)

  const [cheDo, setCheDo] = useState<CheDo>("kham-pha");
  const [dangChon, setDangChon] = useState<number | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiTai>({ loai: "dang-tai", phanTram: null });
  const [daTai, setDaTai] = useState(false);
  /** Bộ phận tìm thấy mesh trong mô hình (chọn, tách được, có thẻ chú thích). */
  const [trenMoHinh, setTrenMoHinh] = useState<ReadonlySet<number>>(new Set());
  const [lanThu, setLanThu] = useState(0);
  const [toanManHinh, setToanManHinh] = useState(false);

  const gocRef = useRef<HTMLDivElement>(null);
  const khung3dRef = useRef<HTMLDivElement>(null);
  const canhRef = useRef<CanhBaiHoc | null>(null);
  const chuThichRef = useRef<LopChuThichHandle>(null);
  const goiLai = useRef({ onDaTai, onFps });
  goiLai.current = { onDaTai, onFps };

  const boPhanRef = useRef(boPhan);
  boPhanRef.current = boPhan;
  const chonBoPhan = useCallback((id: number | null) => {
    setDangChon(id);
    const bp = boPhanRef.current.find((p) => p.id === id);
    canhRef.current?.chon(id, true, bp?.camera_view ?? null);
  }, []);
  const chonRef = useRef(chonBoPhan);
  chonRef.current = chonBoPhan;
  // Bấm trên mô hình chỉ chọn bộ phận ở chế độ Tự khám phá và khi không bị giáo viên điều khiển.
  const choPhepChonRef = useRef(true);
  choPhepChonRef.current = cheDo === "kham-pha" && !dangBiDieuKhien;

  // Tải mô hình: chỉ chạy lại khi đổi nguồn hoặc bấm Thử lại (không chạy lại khi đổi chế độ, bộ phận).
  useEffect(() => {
    const khung = khung3dRef.current;
    if (!khung || !nguon) {
      // Bài chưa có mô hình: xóa trạng thái của mô hình trước (nếu vừa đổi từ bài khác sang).
      setDaTai(false);
      setTrenMoHinh(new Set());
      setDangChon(null);
      setTrangThai({ loai: "xong" });
      return;
    }
    let huy = false;
    setTrangThai({ loai: "dang-tai", phanTram: null });
    setDaTai(false);
    setDangChon(null);
    let canh: CanhBaiHoc;
    try {
      canh = new CanhBaiHoc(khung, {
        onBam: (id) => {
          if (choPhepChonRef.current) chonRef.current(id);
        },
        onKhungHinh: () => chuThichRef.current?.capNhat(canh),
        onFps: (fps) => goiLai.current.onFps?.(fps),
      });
    } catch (loi) {
      setTrangThai(trangThaiLoi(loi));
      return;
    }
    canhRef.current = canh;
    canh.datGocTongQuan(bai.config.camera_tong_quan ?? null);
    const batDau = performance.now();
    let phanTramCu: number | null = null;
    canh
      .tai(nguon, (phanTram) => {
        if (huy || phanTram === phanTramCu) return;
        phanTramCu = phanTram;
        setTrangThai({ loai: "dang-tai", phanTram });
      })
      .then((goc) => {
        if (huy) return;
        const tk = thongKeMoHinh(goc);
        goiLai.current.onDaTai?.({
          tenMesh: tk.tenMesh,
          soTamGiac: tk.soTamGiac,
          thoiGianMs: performance.now() - batDau,
          gpu: canh.tenGpu(),
        });
        setDaTai(true);
        setTrangThai({ loai: "xong" });
      })
      .catch((loi: unknown) => {
        if (huy) return;
        console.error(loi);
        setTrangThai(trangThaiLoi(loi));
      });
    return () => {
      huy = true;
      canh.huy();
      canhRef.current = null;
    };
    // config.camera_tong_quan chỉ đọc lúc tải; đổi bài thì nguồn cũng đổi.
  }, [nguon, lanThu]);

  // Gắn bộ phận vào mô hình (sau khi tải xong, hoặc khi danh sách bộ phận đổi).
  useEffect(() => {
    const canh = canhRef.current;
    if (!daTai || !canh) return;
    const thieu = canh.datBoPhan(boPhan);
    if (thieu.length > 0) console.warn("Tên mesh không có trong mô hình:", thieu);
    setTrenMoHinh(new Set(boPhan.filter((p) => canh.coTrenMoHinh(p.id)).map((p) => p.id)));
    setDangChon(null);
  }, [daTai, boPhan]);

  useEffect(() => {
    canhRef.current?.khoaThaoTac(dangBiDieuKhien);
  }, [dangBiDieuKhien, daTai]);

  useEffect(() => {
    const capNhat = () => setToanManHinh(document.fullscreenElement === gocRef.current);
    document.addEventListener("fullscreenchange", capNhat);
    return () => document.removeEventListener("fullscreenchange", capNhat);
  }, []);

  const doiToanManHinh = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void gocRef.current?.requestFullscreen().catch(() => undefined);
  };

  const doiCheDo = (moi: CheDo) => {
    setCheDo(moi);
    if (moi !== "kham-pha" && dangChon !== null) chonBoPhan(null);
  };

  const khiBamPhim = (e: KeyboardEvent<HTMLElement>) => {
    const canh = canhRef.current;
    if (!canh || !daTai || dangBiDieuKhien) return;
    const viec: Record<string, () => void> = {
      ArrowLeft: () => canh.xoay(-1, 0),
      ArrowRight: () => canh.xoay(1, 0),
      ArrowUp: () => canh.xoay(0, 1),
      ArrowDown: () => canh.xoay(0, -1),
      "+": () => canh.phongTo(0.85),
      "=": () => canh.phongTo(0.85),
      "-": () => canh.phongTo(1 / 0.85),
      Escape: () => chonBoPhan(null),
    };
    const lam = viec[e.key];
    if (!lam) return;
    e.preventDefault();
    lam();
  };

  const bpDangChon = boPhan.find((p) => p.id === dangChon) ?? null;
  const boPhanCoChuThich = useMemo(
    () => (daTai ? boPhan.filter((p) => trenMoHinh.has(p.id)) : []),
    [daTai, boPhan, trenMoHinh],
  );
  const khamPha = cheDo === "kham-pha";
  const coChuThich = khamPha && trangThai.loai === "xong";
  const nutBieuTuong = cn(
    "grid shrink-0 place-items-center rounded-ctl border border-line-2 bg-surface text-text-2 hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-45",
    // Cỡ theo ảnh mẫu khi dùng chuột; màn cảm ứng tối thiểu 44 px; Tiểu học 48 px (TIEN_DO.md mục 5).
    tieuHoc ? "size-12" : "size-9 pointer-coarse:size-11",
  );
  const khoa = dangBiDieuKhien;
  // Nút trong thẻ "Đang xem": 32 px theo ảnh mẫu, cảm ứng 44 px, Tiểu học 48 px chữ 18 px.
  const nutThe = tieuHoc ? "h-12 px-4 text-[18px]" : "pointer-coarse:h-11";

  return (
    <div
      ref={gocRef}
      className={cn("flex h-full flex-col bg-surface", tieuHoc ? "text-[18px]" : "text-[15px]")}
    >
      {/* Thanh trên */}
      {/* Ba cột: hai bên bằng nhau nên nhóm chế độ luôn ở giữa mà không đè lên tên bài. */}
      <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" className={nutBieuTuong} onClick={onQuayLai} aria-label="Quay lại">
            <ArrowLeft className="size-[18px]" aria-hidden />
          </button>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate font-medium">{bai.title}</h1>
            <p className={cn("truncate text-text-2", tieuHoc ? "text-[15px]" : "text-[13px]")}>
              {dongPhu(bai)}
            </p>
          </div>
        </div>
        <div role="group" aria-label="Chế độ" className="flex gap-0.5 rounded-alert bg-surface-2 p-[3px]">
          {cheDoCo.map((cd) => (
            <button
              key={cd}
              type="button"
              aria-pressed={cheDo === cd}
              disabled={khoa}
              onClick={() => doiCheDo(cd)}
              className={cn(
                "flex items-center gap-1.5 rounded-[7px] px-3.5 text-text-2 disabled:pointer-events-none disabled:opacity-45",
                tieuHoc ? "h-12 text-[18px]" : "h-8 text-[14px] pointer-coarse:h-11",
                cheDo === cd &&
                  "bg-surface font-medium text-text shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_0_0_1px_var(--color-line)]",
              )}
            >
              {cd === "phim" && <Play className="size-3.5" aria-hidden />}
              {TEN_CHE_DO[cd]}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className={nutBieuTuong}
            onClick={() => canhRef.current?.datLaiGocNhin()}
            disabled={!daTai || khoa}
            aria-label="Đặt lại góc nhìn"
            title="Đặt lại góc nhìn"
          >
            <RotateCcw className="size-[18px]" aria-hidden />
          </button>
          <button
            type="button"
            className={nutBieuTuong}
            onClick={doiToanManHinh}
            aria-label={toanManHinh ? "Thoát toàn màn hình" : "Toàn màn hình"}
            title={toanManHinh ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {toanManHinh ? (
              <Minimize className="size-[18px]" aria-hidden />
            ) : (
              <Maximize className="size-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </header>

      {dangBiDieuKhien && (
        <p role="status" className="shrink-0 bg-warn-weak px-4 py-2 text-center text-[14px] text-warn">
          Thầy/cô đang điều khiển
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Vùng 3D */}
        <section
          className="relative min-w-0 flex-1 overflow-hidden grid3d focus-visible:outline-offset-[-2px]"
          tabIndex={0}
          onKeyDown={khiBamPhim}
          aria-label={`Mô hình 3D: ${bai.title}. Phím mũi tên để xoay, cộng trừ để phóng to, Esc để bỏ chọn.`}
        >
          <div ref={khung3dRef} className="absolute inset-0" />
          <LopChuThich
            ref={chuThichRef}
            boPhan={boPhanCoChuThich}
            dangChon={dangChon}
            hien={coChuThich}
            tieuHoc={tieuHoc}
            khoa={khoa}
            onChon={chonBoPhan}
          />
          {!nguon ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="rounded-card border border-line bg-surface px-4 py-3 text-[14px] text-text-2">
                Bài này chưa có mô hình 3D.
              </p>
            </div>
          ) : (
            <LopTrangThai trangThai={trangThai} tieuHoc={tieuHoc} onThuLai={() => setLanThu((n) => n + 1)} />
          )}
          {!khamPha && trangThai.loai === "xong" && (
            <div className="absolute inset-x-0 top-6 flex justify-center px-6">
              <div className="rounded-card border border-line bg-surface px-5 py-4 text-center">
                <p className="font-medium">Chế độ {TEN_CHE_DO[cheDo]} đang được xây dựng</p>
                <p className="mt-1 text-[14px] text-text-2">
                  Hãy dùng chế độ Tự khám phá để xem từng bộ phận.
                </p>
              </div>
            </div>
          )}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-6 bottom-4 flex items-end justify-between gap-6 text-text-2",
              tieuHoc ? "text-[15px]" : "text-[13px]",
            )}
          >
            <p className="min-w-0">
              Kéo để xoay · cuộn hoặc chụm hai ngón để phóng to · bấm vùng trống để bỏ chọn
            </p>
            {bai.asset?.attribution && (
              <p className="max-w-[45%] shrink-0 text-right">Mô hình 3D: {bai.asset.attribution}</p>
            )}
          </div>
        </section>

        {/* Cột bộ phận */}
        <aside className="flex w-[344px] shrink-0 flex-col border-l border-line bg-surface max-lg:w-[288px]">
          <h2 className="flex items-baseline px-5 pt-5 pb-2 font-medium">
            Bộ phận
            <span className={cn("ml-auto font-normal text-text-2", tieuHoc ? "text-[15px]" : "text-[13px]")}>
              {boPhan.length}
            </span>
          </h2>
          {boPhan.length === 0 ? (
            <p className="px-5 text-[14px] text-text-2">Bài này chưa có bộ phận được gắn nhãn.</p>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto px-3">
              {boPhan.map((bp) => {
                const on = bp.id === dangChon;
                return (
                  <li key={bp.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={!khamPha || khoa}
                      onClick={() => chonBoPhan(on ? null : bp.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-ctl px-2.5 text-left disabled:opacity-60",
                        tieuHoc ? "min-h-12 text-[18px]" : "min-h-9 text-[14px] pointer-coarse:min-h-11",
                        on
                          ? "bg-accent-weak font-medium text-accent-ink"
                          : "text-text-2 hover:bg-surface-2 hover:text-text",
                      )}
                    >
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-accent" : "bg-line-2")}
                        aria-hidden
                      />
                      {bp.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <section aria-live="polite" className="m-4 mt-auto rounded-card bg-surface-2 p-4">
            {bpDangChon ? (
              <>
                <p className={cn("text-text-2", tieuHoc ? "text-[15px]" : "text-[13px]")}>Đang xem</p>
                <p className={cn("mt-0.5 mb-2 font-medium", tieuHoc ? "text-[20px]" : "text-[16px]")}>
                  {bpDangChon.label}
                </p>
                {bpDangChon.description && (
                  <p className={cn("text-text-2", tieuHoc ? "text-[18px]" : "text-[14px]")}>
                    {bpDangChon.description}
                  </p>
                )}
                <div className="mt-3.5 flex gap-2">
                  <Button size="sm" className={nutThe} disabled={khoa} onClick={() => chonBoPhan(null)}>
                    <RotateCcw aria-hidden />
                    Lắp lại
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={nutThe}
                    disabled={khoa}
                    onClick={() => chonBoPhan(boPhanTiep(boPhan, dangChon))}
                  >
                    Bộ phận tiếp
                  </Button>
                </div>
              </>
            ) : (
              <p className={cn("text-text-2", tieuHoc ? "text-[18px]" : "text-[14px]")}>
                Bấm một bộ phận trên mô hình hoặc trong danh sách để xem chú thích.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
