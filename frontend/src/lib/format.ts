/** Định dạng số, dung lượng, ngày theo cách viết tiếng Việt (dấu chấm ngăn nghìn, dấu phẩy thập phân). */

const SO = new Intl.NumberFormat("vi-VN");
const SO_1 = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NGAY = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** 1500000 -> "1.500.000". */
export function formatNumber(n: number): string {
  return SO.format(n);
}

/** Byte -> "61,2 MB" / "820 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${SO_1.format(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${SO.format(Math.round(bytes / 1024))} KB`;
  return `${SO.format(bytes)} byte`;
}

/** ISO 8601 -> "17/11/2026" theo giờ Việt Nam. */
export function formatDate(iso: string): string {
  return NGAY.format(new Date(iso));
}
