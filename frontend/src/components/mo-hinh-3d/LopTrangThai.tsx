/**
 * Lớp phủ trạng thái của khung 3D: đang tải (kèm phần trăm nếu biết) hoặc lỗi (kèm nút thử lại khi thử lại có ích).
 * Trình đọc màn hình chỉ nghe câu cố định, không nghe từng phần trăm khi tải.
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoiMoHinh } from "./canh-bai-hoc";

export type TrangThaiTai =
  | { loai: "dang-tai"; phanTram: number | null }
  | { loai: "loi"; tieuDe: string; huongDan: string; coTheThuLai: boolean }
  | { loai: "xong" };

/** Câu báo lỗi theo loại lỗi khi tải mô hình. */
export function trangThaiLoi(loi: unknown): TrangThaiTai {
  const loai = loi instanceof LoiMoHinh ? loi.loai : "mang";
  switch (loai) {
    case "webgl":
      return {
        loai: "loi",
        tieuDe: "Máy chưa hiển thị được 3D",
        huongDan: "Hãy bật tăng tốc phần cứng trong cài đặt trình duyệt hoặc dùng máy khác.",
        coTheThuLai: true,
      };
    case "tep":
      return {
        loai: "loi",
        tieuDe: "Không mở được file",
        huongDan: "Hãy chọn file khác, định dạng GLB.",
        coTheThuLai: false,
      };
    case "rong":
      return {
        loai: "loi",
        tieuDe: "Mô hình không có hình nào để hiển thị",
        huongDan: "File không chứa hình nào. Hãy kiểm tra lại file mô hình.",
        coTheThuLai: false,
      };
    default:
      return {
        loai: "loi",
        tieuDe: "Không tải được mô hình",
        huongDan: "Hãy kiểm tra mạng rồi bấm Thử lại.",
        coTheThuLai: true,
      };
  }
}

export function LopTrangThai({
  trangThai,
  onThuLai,
  tieuHoc = false,
}: {
  trangThai: TrangThaiTai;
  onThuLai: () => void;
  /** Tiểu học: nút cao 48 px, chữ 18 px. */
  tieuHoc?: boolean;
}) {
  return (
    <>
      <p aria-live="polite" className="sr-only">
        {trangThai.loai === "dang-tai"
          ? "Đang tải mô hình"
          : trangThai.loai === "loi"
            ? `${trangThai.tieuDe}. ${trangThai.huongDan}`
            : ""}
      </p>
      {trangThai.loai !== "xong" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          {trangThai.loai === "dang-tai" && (
            <p
              aria-hidden
              className="rounded-card border border-line bg-surface px-4 py-3 text-[14px] text-text-2"
            >
              Đang tải mô hình{trangThai.phanTram === null ? "" : ` ${trangThai.phanTram}%`}
            </p>
          )}
          {trangThai.loai === "loi" && (
            <div className="pointer-events-auto max-w-sm rounded-card border border-line bg-surface p-6 text-center">
              <p className="font-medium">{trangThai.tieuDe}</p>
              <p className="mt-1 text-[14px] text-text-2">{trangThai.huongDan}</p>
              {trangThai.coTheThuLai && (
                <Button
                  variant="primary"
                  className={cn("mt-4", tieuHoc ? "h-12 text-[18px]" : "pointer-coarse:h-11")}
                  onClick={onThuLai}
                >
                  Thử lại
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
