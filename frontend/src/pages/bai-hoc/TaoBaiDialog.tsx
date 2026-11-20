/** Hộp thoại "Tạo bài học" (API 50): nhập thông tin bài, tạo nháp rồi mở màn soạn bài. */
import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError } from "@/api/client";
import { createLesson, type DuplicateLesson, type LessonDetail, type Subject } from "@/api/editorLessons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { cauLoi, loiTuMayChu, thanhDauVao } from "./chuyen-doi";
import { TrungBaiDialog } from "./HopThoai";
import {
  kiemTraThongTin,
  THONG_TIN_TRONG,
  ThongTinBaiForm,
  type LoiThongTin,
  type ThongTinBai,
} from "./ThongTinBaiForm";

export function TaoBaiDialog({
  open,
  onOpenChange,
  subjects,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  onCreated: (lesson: LessonDetail) => void;
}) {
  const [v, setV] = useState<ThongTinBai>(THONG_TIN_TRONG);
  const [loi, setLoi] = useState<LoiThongTin>({});
  const [loiChung, setLoiChung] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [trung, setTrung] = useState<DuplicateLesson[] | null>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    setV(THONG_TIN_TRONG);
    setLoi({});
    setLoiChung(null);
    setTrung(null);
  }, [open]);

  async function tao(xacNhanTrung: boolean) {
    setDangLuu(true);
    setLoiChung(null);
    try {
      const b = await createLesson(
        thanhDauVao(v, { asset_id: null, config: {}, confirm_duplicate: xacNhanTrung }),
      );
      setTrung(null);
      onCreated(b);
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE_LESSON") {
        setTrung((e.details as DuplicateLesson[] | null) ?? []);
        return;
      }
      setTrung(null);
      const loiO = loiTuMayChu(e);
      if (loiO) setLoi(loiO);
      const c = cauLoi(e, "Không tạo được bài học, hãy thử lại");
      if (!loiO || c.text !== (e as ApiError).message) setLoiChung(c.text);
    } finally {
      setDangLuu(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const l = kiemTraThongTin(v);
    setLoi(l);
    if (Object.keys(l).length === 0) void tao(false);
  }

  return (
    <>
      <Dialog open={open && trung === null} onOpenChange={(mo) => !mo && !dangLuu && onOpenChange(false)}>
        <DialogContent className="max-w-[600px]">
          <DialogTitle>Tạo bài học</DialogTitle>
          <DialogDescription>
            Bài mới ở trạng thái nháp. Chọn mô hình, gắn nhãn bộ phận rồi xuất bản ở màn soạn bài.
          </DialogDescription>
          <form id={`${id}-form`} onSubmit={onSubmit} noValidate className="mt-5">
            <ThongTinBaiForm value={v} onChange={setV} subjects={subjects} errors={loi} disabled={dangLuu} />
          </form>
          <div aria-live="polite" className="empty:hidden">
            {loiChung && (
              <Alert tone="danger" className="mt-4">
                <TriangleAlert strokeWidth={1.5} aria-hidden />
                <span>{loiChung}</span>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)} disabled={dangLuu}>
              Hủy
            </Button>
            <Button type="submit" form={`${id}-form`} variant="primary" disabled={dangLuu}>
              {dangLuu ? "Đang tạo" : "Tạo và soạn tiếp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TrungBaiDialog
        trung={open ? trung : null}
        dangLuu={dangLuu}
        onClose={() => setTrung(null)}
        onConfirm={() => void tao(true)}
      />
    </>
  );
}
