/**
 * Thẻ "Bộ phận" của màn soạn bài (Hình 3-11; UC 22; API 56 lưu cùng nút Lưu nháp / Lưu thay đổi của màn soạn).
 * Bấm vào một phần trên mô hình để gắn nhãn, giữ Shift để gộp nhiều phần vào một bộ phận; nhập nhãn, chú thích;
 * xoay mô hình rồi bấm "Lưu góc nhìn"; kéo thả (hoặc Alt + mũi tên) để sắp thứ tự.
 * Dùng được không cần chuột: thêm bộ phận và chọn phần bằng ô chọn "Thêm phần".
 */
import { Camera, GripVertical, Plus, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { LessonAsset } from "@/api/editorLessons";
import type { DieuKhien3D } from "@/components/mo-hinh-3d/MoHinh3D";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { XemTruoc3D } from "@/pages/mo-hinh-3d/XemTruoc3D";
import {
  bamPhan,
  type BoPhanNhap,
  CHU_THICH_TOI_DA,
  diChuyen,
  khoaMoi,
  type LoiBoPhan,
  NHAN_TOI_DA,
  phanChuaGan,
} from "./bo-phan";

function gioPhut(d: Date): string {
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function TheBoPhan({
  asset,
  doiMoHinhChuaLuu,
  value,
  onChange,
  loi,
  disabled,
  onDenTheMoHinh,
}: {
  /** Mô hình ĐÃ LƯU của bài (nhãn gắn theo tên phần của mô hình này). */
  asset: LessonAsset | null;
  /** Đã chọn mô hình khác ở thẻ Mô hình nhưng chưa lưu. */
  doiMoHinhChuaLuu: boolean;
  value: BoPhanNhap[];
  onChange: (ds: BoPhanNhap[]) => void;
  loi: LoiBoPhan;
  disabled?: boolean;
  onDenTheMoHinh: () => void;
}) {
  const [dangChon, setDangChon] = useState<string | null>(null);
  const [keo, setKeo] = useState<number | null>(null);
  // Giờ lưu góc nhìn trong phiên này (máy chủ không lưu thời điểm), theo khóa bộ phận.
  const [gioLuuGoc, setGioLuuGoc] = useState<Record<string, string>>({});
  const dieuKhien = useRef<DieuKhien3D>(null);
  const oNhan = useRef<HTMLInputElement>(null);

  if (!asset || doiMoHinhChuaLuu)
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
        <p className="font-medium">
          {doiMoHinhChuaLuu ? "Bạn vừa đổi mô hình nhưng chưa lưu bài" : "Bài chưa chọn mô hình 3D"}
        </p>
        <p className="max-w-md text-[14px] text-text-2">
          {doiMoHinhChuaLuu
            ? "Nhãn bộ phận gắn theo các phần của mô hình. Hãy bấm Lưu để lưu mô hình mới rồi gắn nhãn."
            : "Hãy chọn mô hình ở thẻ Mô hình trước, rồi quay lại đây gắn nhãn cho từng bộ phận."}
        </p>
        {!doiMoHinhChuaLuu && <Button onClick={onDenTheMoHinh}>Đến thẻ Mô hình</Button>}
        {value.length > 0 && !doiMoHinhChuaLuu && (
          <p className="max-w-md text-[14px] text-text-2">
            Bài còn {value.length} nhãn của mô hình cũ.{" "}
            <button
              type="button"
              className="text-accent underline disabled:opacity-60"
              disabled={disabled}
              onClick={() => onChange([])}
            >
              Xóa các nhãn này
            </button>{" "}
            rồi bấm Lưu.
          </p>
        )}
      </section>
    );

  const meshCo = asset.mesh_names;
  const coMesh = new Set(meshCo);
  const chon = value.find((p) => p.khoa === dangChon) ?? null;
  const chuaGan = phanChuaGan(value, meshCo);

  function sua(khoa: string, thay: Partial<BoPhanNhap>) {
    onChange(value.map((p) => (p.khoa === khoa ? { ...p, ...thay } : p)));
  }

  function chonBoPhan(p: BoPhanNhap | null) {
    setDangChon(p?.khoa ?? null);
    if (p?.camera_view) dieuKhien.current?.bayToi(p.camera_view);
  }

  function khiBamPhan(ten: string | null, giuShift: boolean) {
    if (disabled) return;
    const kq = bamPhan(value, dangChon, ten, giuShift);
    if (kq.ds !== value) onChange(kq.ds);
    const moi = kq.ds.find((p) => p.khoa === kq.dangChon);
    if (kq.dangChon !== dangChon) chonBoPhan(moi ?? null);
    // Bộ phận vừa tạo: đưa con trỏ vào ô nhãn để gõ ngay.
    if (moi && moi.id === null && !moi.label && !value.includes(moi))
      setTimeout(() => oNhan.current?.focus(), 0);
  }

  function themBoPhan() {
    const moi: BoPhanNhap = {
      khoa: khoaMoi(),
      id: null,
      mesh_names: [],
      label: "",
      description: "",
      camera_view: null,
    };
    onChange([...value, moi]);
    setDangChon(moi.khoa);
    setTimeout(() => oNhan.current?.focus(), 0);
  }

  function xoaBoPhan(khoa: string) {
    const i = value.findIndex((p) => p.khoa === khoa);
    const conLai = value.filter((p) => p.khoa !== khoa);
    onChange(conLai);
    setDangChon(conLai[Math.min(i, conLai.length - 1)]?.khoa ?? null);
  }

  function luuGocNhin() {
    if (!chon) return;
    const g = dieuKhien.current?.layGocNhin();
    if (!g) return;
    sua(chon.khoa, { camera_view: g });
    setGioLuuGoc((x) => ({ ...x, [chon.khoa]: gioPhut(new Date()) }));
  }

  function khiTha(e: DragEvent, den: number) {
    e.preventDefault();
    if (keo !== null) onChange(diChuyen(value, keo, den));
    setKeo(null);
  }

  /** Mũi tên lên / xuống: chọn bộ phận kề; Alt + mũi tên: chuyển bộ phận đang đứng lên / xuống. */
  function phimDanhSach(e: KeyboardEvent, i: number) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const den = e.key === "ArrowUp" ? i - 1 : i + 1;
    if (den < 0 || den >= value.length) return;
    if (e.altKey && !disabled) onChange(diChuyen(value, i, den));
    else chonBoPhan(value[den]);
    setTimeout(() => document.getElementById(`bo-phan-${value[e.altKey ? i : den].khoa}`)?.focus(), 0);
  }

  const loiChon = chon ? (loi[chon.khoa] ?? []) : [];

  return (
    <div className="grid h-[calc(100vh-250px)] min-h-[560px] grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-card border border-line bg-surface">
      {/* Khung 3D */}
      <div className="flex min-h-0 flex-col">
        {meshCo.length === 0 && (
          <Alert tone="warn" className="m-4 mb-0">
            <TriangleAlert strokeWidth={1.5} aria-hidden />
            <span>
              Mô hình không có phần nào có tên nên chưa gắn nhãn được. Hãy đặt tên các phần trong phần mềm
              dựng hình rồi nạp lại mô hình.
            </span>
          </Alert>
        )}
        <div className="relative min-h-0 flex-1">
          <XemTruoc3D
            url={asset.file_url}
            ten={asset.name}
            className="absolute inset-0 rounded-none border-0"
            onBamPhan={khiBamPhan}
            phanToSang={chon?.mesh_names}
            dieuKhienRef={dieuKhien}
          />
          {chon && (
            <p className="pointer-events-none absolute top-4 left-4 rounded-ctl border border-accent bg-surface px-3 py-2 text-[14px]">
              <span className="font-medium">{chon.label.trim() || "Bộ phận mới"}</span>
              <span className="block text-[13px] text-text-2">{chon.mesh_names.length} phần · đang sửa</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <Button onClick={luuGocNhin} disabled={!chon || disabled}>
            <Camera strokeWidth={1.5} aria-hidden />
            Lưu góc nhìn
          </Button>
          <Button variant="ghost" onClick={() => dieuKhien.current?.gocChuan()}>
            <RotateCcw strokeWidth={1.5} aria-hidden />
            Góc nhìn chuẩn
          </Button>
          <p className="ml-auto text-[13px] text-text-2">
            Bấm vào một phần trên mô hình để gắn nhãn · giữ Shift để chọn nhiều phần
          </p>
        </div>
      </div>

      {/* Cột phải: danh sách bộ phận và ô sửa */}
      <div className="flex min-h-0 flex-col border-l border-line">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <h2 className="font-medium whitespace-nowrap">Bộ phận</h2>
          <span className="text-[13px] whitespace-nowrap text-text-2">kéo để sắp thứ tự</span>
          <span id="goi-y-sap-xep" className="sr-only">
            Mũi tên lên xuống để chọn bộ phận, Alt và mũi tên để chuyển thứ tự
          </span>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={themBoPhan} disabled={disabled}>
            <Plus strokeWidth={1.5} aria-hidden />
            Thêm
          </Button>
        </div>
        {value.length === 0 ? (
          <p className="px-4 py-6 text-[14px] text-text-2">
            Chưa có bộ phận nào. Bấm vào một phần trên mô hình hoặc bấm Thêm.
          </p>
        ) : (
          <ul aria-label="Danh sách bộ phận" className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {value.map((p, i) => {
              const coLoi = (loi[p.khoa]?.length ?? 0) > 0 || p.mesh_names.some((t) => !coMesh.has(t));
              return (
                <li
                  key={p.khoa}
                  draggable={!disabled}
                  onDragStart={() => setKeo(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => khiTha(e, i)}
                  onDragEnd={() => setKeo(null)}
                  className={cn("rounded-ctl", keo === i && "opacity-50")}
                >
                  <button
                    type="button"
                    id={`bo-phan-${p.khoa}`}
                    aria-current={p.khoa === dangChon || undefined}
                    aria-describedby="goi-y-sap-xep"
                    onClick={() => chonBoPhan(p)}
                    onKeyDown={(e) => phimDanhSach(e, i)}
                    className={cn(
                      "flex h-10 w-full items-center gap-2 rounded-ctl px-2 text-left text-[15px] hover:bg-surface-2",
                      p.khoa === dangChon && "bg-accent-weak text-accent-ink hover:bg-accent-weak",
                    )}
                  >
                    <GripVertical
                      className="size-4 shrink-0 cursor-grab text-muted"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className={cn("min-w-0 flex-1 truncate", !p.label.trim() && "text-text-2")}>
                      {p.label.trim() || "Chưa đặt nhãn"}
                    </span>
                    {coLoi && (
                      <TriangleAlert
                        className="size-4 shrink-0 text-danger"
                        strokeWidth={1.5}
                        aria-label="Có lỗi"
                      />
                    )}
                    <span className="shrink-0 text-[13px] text-text-2">{p.mesh_names.length} phần</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line px-4 py-4">
          {!chon ? (
            <p className="text-[14px] text-text-2">
              Chọn một bộ phận trong danh sách hoặc bấm vào mô hình để sửa nhãn, chú thích.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {loiChon.length > 0 && (
                <ul className="text-[14px] text-danger">
                  {loiChon.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nhan-bo-phan" className="text-[14px] text-text-2">
                  Nhãn hiển thị
                </label>
                <Input
                  ref={oNhan}
                  id="nhan-bo-phan"
                  value={chon.label}
                  maxLength={NHAN_TOI_DA}
                  placeholder="Ví dụ: Vây lưng"
                  invalid={!chon.label.trim() && loiChon.length > 0}
                  disabled={disabled}
                  onChange={(e) => sua(chon.khoa, { label: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="chu-thich-bo-phan" className="text-[14px] text-text-2">
                  Chú thích theo sách
                </label>
                <textarea
                  id="chu-thich-bo-phan"
                  rows={3}
                  value={chon.description}
                  maxLength={CHU_THICH_TOI_DA}
                  placeholder="1–2 câu theo sách giáo khoa"
                  disabled={disabled}
                  onChange={(e) => sua(chon.khoa, { description: e.target.value })}
                  className="resize-none rounded-ctl border border-line-2 bg-surface px-3 py-2 text-[15px] text-text placeholder:text-text-2 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25 disabled:opacity-60"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span id="phan-cua-bo-phan" className="text-[14px] text-text-2">
                  Các phần của mô hình
                </span>
                <ul aria-labelledby="phan-cua-bo-phan" className="flex flex-wrap gap-1.5">
                  {chon.mesh_names.map((t) => {
                    const mat = !coMesh.has(t);
                    return (
                      <li
                        key={t}
                        className={cn(
                          "inline-flex h-7 max-w-full items-center gap-1 rounded-full bg-surface-2 pr-1 pl-2.5 font-mono text-[13px]",
                          mat && "bg-danger-weak text-danger-ink",
                        )}
                        title={mat ? "Phần này không còn trong mô hình" : undefined}
                      >
                        <span className="truncate">{t}</span>
                        <button
                          type="button"
                          aria-label={`Bỏ phần ${t}`}
                          disabled={disabled}
                          onClick={() =>
                            sua(chon.khoa, { mesh_names: chon.mesh_names.filter((x) => x !== t) })
                          }
                          className="grid size-5 place-items-center rounded-full hover:bg-surface-3"
                        >
                          <X className="size-3.5" strokeWidth={1.5} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {chuaGan.length > 0 && (
                  <NativeSelect
                    aria-label="Thêm phần chưa gắn nhãn vào bộ phận này"
                    value=""
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.value)
                        sua(chon.khoa, { mesh_names: [...chon.mesh_names, e.target.value] });
                    }}
                  >
                    <option value="">Thêm phần chưa gắn nhãn…</option>
                    {chuaGan.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-text-2">
                {chon.camera_view ? (
                  <>
                    <span>
                      {gioLuuGoc[chon.khoa]
                        ? `Góc nhìn đã lưu lúc ${gioLuuGoc[chon.khoa]}`
                        : "Đã có góc nhìn"}
                    </span>
                    <button
                      type="button"
                      className="text-accent underline"
                      onClick={() => chon.camera_view && dieuKhien.current?.bayToi(chon.camera_view)}
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      className="underline disabled:opacity-60"
                      disabled={disabled}
                      onClick={() => sua(chon.khoa, { camera_view: null })}
                    >
                      Bỏ góc nhìn
                    </button>
                  </>
                ) : (
                  <span>Chưa lưu góc nhìn: xoay mô hình rồi bấm "Lưu góc nhìn"</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-danger hover:text-danger"
                disabled={disabled}
                onClick={() => xoaBoPhan(chon.khoa)}
              >
                <Trash2 strokeWidth={1.5} aria-hidden />
                Xóa bộ phận
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
