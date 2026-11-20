/**
 * Chấm ghim, đường dẫn và thẻ chú thích của các bộ phận trên vùng 3D (Hình 3-5). Vị trí đổi theo camera mỗi khung
 * hình nên cập nhật thẳng vào DOM (qua `capNhat`), không qua state của React.
 */
import { forwardRef, useImperativeHandle, useRef } from "react";
import type { LessonPart } from "@/api/types";
import type { CanhBaiHoc } from "@/components/mo-hinh-3d/canh-bai-hoc";
import { cn } from "@/lib/utils";
import { SO_THE_TOI_DA, xepChuThich } from "./bo-cuc";

const LE = 24; // khoảng cách tối thiểu tới mép vùng 3D
const CACH_MO_HINH = 48; // khoảng cách từ mép mô hình tới cột thẻ
const CACH_THE = 8; // khoảng cách dọc giữa hai thẻ
const CHUA_DAY = 56; // chừa dòng hướng dẫn, dòng ghi công ở đáy

export type LopChuThichHandle = { capNhat: (canh: CanhBaiHoc) => void };

type PhanTu = { ghim: HTMLDivElement | null; duong: SVGLineElement | null; the: HTMLButtonElement | null };

export const LopChuThich = forwardRef<
  LopChuThichHandle,
  {
    boPhan: LessonPart[];
    dangChon: number | null;
    hien: boolean;
    tieuHoc: boolean;
    /** Giáo viên đang điều khiển lớp: thẻ không bấm được. */
    khoa: boolean;
    onChon: (id: number) => void;
  }
>(function LopChuThich({ boPhan, dangChon, hien, tieuHoc, khoa, onChon }, ref) {
  const khungRef = useRef<HTMLDivElement>(null);
  const phanTu = useRef(new Map<number, PhanTu>());
  const datRef =
    (id: number, loai: keyof PhanTu) => (el: HTMLDivElement | SVGLineElement | HTMLButtonElement | null) => {
      const pt = phanTu.current.get(id) ?? { ghim: null, duong: null, the: null };
      (pt as Record<keyof PhanTu, unknown>)[loai] = el;
      phanTu.current.set(id, pt);
    };
  // Bài nhiều bộ phận: chỉ hiện thẻ của bộ phận đang xem, các bộ phận khác chỉ còn chấm ghim.
  const hienMoiThe = boPhan.length <= SO_THE_TOI_DA;

  useImperativeHandle(
    ref,
    () => ({
      capNhat(canh) {
        const khung = khungRef.current;
        if (!khung || !hien) return;
        const rong = khung.clientWidth;
        const cao = khung.clientHeight;
        // Bỏ điểm neo sau lưng camera hoặc ra ngoài khung (khi phóng to vào một bộ phận).
        const neo = canh
          .neoBoPhan()
          .filter(
            (n) =>
              n.truocCamera && n.x >= 0 && n.x <= rong && n.y >= 0 && n.y <= cao && phanTu.current.has(n.id),
          );
        const bien = canh.bienNgangMoHinh();
        const coThe = neo.filter((n) => phanTu.current.get(n.id)?.the);
        // Đọc kích thước thẻ trước, ghi vị trí sau (tránh bắt trình duyệt dàn trang nhiều lần).
        const kichThuoc = new Map(
          coThe.map((n) => [n.id, phanTu.current.get(n.id)!.the!.getBoundingClientRect()]),
        );
        const caoThe = Math.max(36, ...[...kichThuoc.values()].map((k) => k.height));
        const viTri = new Map(
          xepChuThich(
            coThe,
            (bien.trai + bien.phai) / 2,
            caoThe + CACH_THE,
            LE + caoThe / 2,
            cao - CHUA_DAY - caoThe / 2,
          ).map((v) => [v.id, v]),
        );
        const dangHien = new Set(neo.map((n) => n.id));
        for (const [id, pt] of phanTu.current) {
          const an = !dangHien.has(id);
          if (pt.ghim) pt.ghim.style.visibility = an ? "hidden" : "visible";
          if (pt.duong) pt.duong.style.visibility = "hidden";
          if (pt.the) pt.the.style.visibility = "hidden";
        }
        for (const n of neo) {
          const pt = phanTu.current.get(n.id)!;
          if (pt.ghim) pt.ghim.style.transform = `translate(${n.x}px, ${n.y}px) translate(-50%, -50%)`;
          const v = viTri.get(n.id);
          const k = kichThuoc.get(n.id);
          if (!v || !k || !pt.the || !pt.duong) continue;
          const x =
            v.ben === "trai"
              ? Math.max(LE, Math.min(bien.trai - CACH_MO_HINH, n.x - CACH_MO_HINH) - k.width)
              : Math.min(rong - LE - k.width, Math.max(bien.phai + CACH_MO_HINH, n.x + CACH_MO_HINH));
          const y = v.y - k.height / 2;
          pt.the.style.transform = `translate(${x}px, ${y}px)`;
          pt.the.style.visibility = "visible";
          pt.duong.setAttribute("x1", String(n.x));
          pt.duong.setAttribute("y1", String(n.y));
          pt.duong.setAttribute("x2", String(v.ben === "trai" ? x + k.width : x));
          pt.duong.setAttribute("y2", String(v.y));
          pt.duong.style.visibility = "visible";
        }
      },
    }),
    [hien],
  );

  if (!hien) return null;
  return (
    <div ref={khungRef} className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="absolute inset-0 size-full overflow-visible">
        {boPhan.map((bp) => (
          <line
            key={bp.id}
            ref={datRef(bp.id, "duong")}
            className={cn("invisible", bp.id === dangChon ? "stroke-accent" : "stroke-text-2")}
            strokeWidth={1}
          />
        ))}
      </svg>
      {boPhan.map((bp) => (
        <div
          key={bp.id}
          ref={datRef(bp.id, "ghim")}
          className={cn(
            "invisible absolute top-0 left-0 size-2.5 rounded-full border-2",
            bp.id === dangChon
              ? "border-accent bg-accent shadow-[0_0_0_4px_var(--color-accent-weak)]"
              : "border-text-2 bg-surface",
          )}
        />
      ))}
      {boPhan
        .filter((bp) => hienMoiThe || bp.id === dangChon)
        .map((bp) => (
          <button
            key={bp.id}
            ref={datRef(bp.id, "the")}
            type="button"
            tabIndex={-1}
            disabled={khoa}
            onClick={() => onChon(bp.id)}
            className={cn(
              "pointer-events-auto invisible absolute top-0 left-0 rounded-alert border bg-surface px-3 py-2 text-left font-medium whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
              tieuHoc ? "text-[18px]" : "text-[14px]",
              bp.id === dangChon
                ? "border-accent shadow-[0_0_0_3px_var(--color-accent-weak)]"
                : "border-line-2",
            )}
          >
            {bp.label}
            {bp.id === dangChon && (
              <span className={cn("block font-normal text-text-2", tieuHoc ? "text-[15px]" : "text-[13px]")}>
                Đang xem
              </span>
            )}
          </button>
        ))}
    </div>
  );
});
