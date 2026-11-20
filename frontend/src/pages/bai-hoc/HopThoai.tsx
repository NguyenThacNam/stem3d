/** Các hộp thoại xác nhận / báo lỗi của soạn bài: trùng bài, thiếu điều kiện xuất bản, gỡ bài đang giao, xóa bài. */
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { STATUS_LABEL, type ActiveAssignment, type DuplicateLesson } from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

function DanhSach({ children }: { children: ReactNode }) {
  return <ul className="mt-4 overflow-hidden rounded-ctl border border-line">{children}</ul>;
}

function Dong({ trai, phai }: { trai: ReactNode; phai?: ReactNode }) {
  return (
    <li className="flex min-h-10 items-center justify-between gap-3 border-b border-line px-3 py-2 last:border-b-0">
      <span className="text-[14px]">{trai}</span>
      {phai && <span className="shrink-0 text-[13px] text-text-2">{phai}</span>}
    </li>
  );
}

/** 409 DUPLICATE_LESSON: liệt kê bài trùng, cho lưu tiếp hoặc quay lại sửa. */
export function TrungBaiDialog({
  trung,
  dangLuu,
  onClose,
  onConfirm,
}: {
  trung: DuplicateLesson[] | null;
  dangLuu: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={trung !== null} onOpenChange={(mo) => !mo && !dangLuu && onClose()}>
      <DialogContent>
        <DialogTitle>Đã có bài cùng số bài</DialogTitle>
        <DialogDescription>
          Môn, lớp, bộ sách và số bài này trùng với bài dưới đây. Kiểm tra lại số bài, hoặc vẫn lưu nếu đây là
          bài khác.
        </DialogDescription>
        <DanhSach>
          {trung?.map((b) => (
            <Dong key={b.id} trai={b.title} phai={STATUS_LABEL[b.status]} />
          ))}
        </DanhSach>
        <DialogFooter>
          <Button onClick={onClose} disabled={dangLuu}>
            Sửa số bài
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={dangLuu}>
            {dangLuu ? "Đang lưu" : "Vẫn lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 400 LESSON_INCOMPLETE: liệt kê phần còn thiếu khi xuất bản (Hình 3-11). */
export function ThieuDieuKienDialog({ thieu, onClose }: { thieu: string[] | null; onClose: () => void }) {
  return (
    <Dialog open={thieu !== null} onOpenChange={(mo) => !mo && onClose()}>
      <DialogContent>
        <DialogTitle>Chưa xuất bản được</DialogTitle>
        <DialogDescription>
          Bài học còn thiếu các phần sau. Bổ sung xong rồi bấm Xuất bản lại.
        </DialogDescription>
        <Alert tone="warn" className="mt-4">
          <TriangleAlert strokeWidth={1.5} aria-hidden />
          <ul className="list-disc pl-4">
            {thieu?.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Alert>
        <DialogFooter>
          <Button variant="primary" onClick={onClose}>
            Đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Gỡ xuất bản; có bài giao còn hạn (409 LESSON_ASSIGNED) thì liệt kê lớp và hỏi lại. */
export function GoXuatBanDialog({
  ten,
  mo,
  dangGiao,
  dangGo,
  loi,
  onClose,
  onConfirm,
}: {
  ten: string;
  mo: boolean;
  dangGiao: ActiveAssignment[] | null;
  dangGo: boolean;
  loi: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={mo} onOpenChange={(m) => !m && !dangGo && onClose()}>
      <DialogContent>
        <DialogTitle>Gỡ xuất bản?</DialogTitle>
        <DialogDescription>
          {ten} sẽ chuyển về nháp. Học sinh, giáo viên không thấy bài trong thư viện cho đến khi xuất bản lại.
        </DialogDescription>
        <div aria-live="polite" className="empty:hidden">
          {dangGiao && dangGiao.length > 0 && (
            <>
              <Alert tone="warn" className="mt-4">
                <TriangleAlert strokeWidth={1.5} aria-hidden />
                <span>
                  Bài đang được giao cho {dangGiao.length} lớp còn hạn, học sinh sẽ không mở được bài.
                </span>
              </Alert>
              <DanhSach>
                {dangGiao.map((a) => (
                  <Dong
                    key={a.assignment_id}
                    trai={`Lớp ${a.class_name}`}
                    phai={a.due_at ? `Hạn ${formatDate(a.due_at)}` : "Không có hạn"}
                  />
                ))}
              </DanhSach>
            </>
          )}
          {loi && (
            <Alert tone="danger" className="mt-4">
              <TriangleAlert strokeWidth={1.5} aria-hidden />
              <span>{loi}</span>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} disabled={dangGo}>
            Giữ xuất bản
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={dangGo}>
            {dangGo ? "Đang gỡ" : dangGiao?.length ? "Vẫn gỡ xuất bản" : "Gỡ xuất bản"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Xóa bài (API 53); đã giao / đã có bài nộp (409 LESSON_IN_USE) thì báo và gợi ý gỡ xuất bản. */
export function XoaBaiDialog({
  ten,
  mo,
  dangXoa,
  loi,
  onClose,
  onConfirm,
}: {
  ten: string;
  mo: boolean;
  dangXoa: boolean;
  loi: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={mo} onOpenChange={(m) => !m && !dangXoa && onClose()}>
      <DialogContent>
        <DialogTitle>{loi ? "Chưa xóa được bài học" : "Xóa bài học?"}</DialogTitle>
        <DialogDescription>
          {loi ? ten : `${ten} cùng các nhãn bộ phận và câu hỏi sẽ bị xóa hẳn, không khôi phục được.`}
        </DialogDescription>
        <div aria-live="polite" className="empty:hidden">
          {loi && (
            <Alert tone="danger" className="mt-4">
              <TriangleAlert strokeWidth={1.5} aria-hidden />
              <span>{loi}</span>
            </Alert>
          )}
        </div>
        <DialogFooter>
          {loi ? (
            <Button variant="primary" onClick={onClose}>
              Đã hiểu
            </Button>
          ) : (
            <>
              <Button onClick={onClose} disabled={dangXoa}>
                Giữ lại
              </Button>
              <Button
                className="border-danger bg-danger text-white hover:border-danger-ink hover:bg-danger-ink"
                onClick={onConfirm}
                disabled={dangXoa}
              >
                {dangXoa ? "Đang xóa" : "Xóa bài học"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
