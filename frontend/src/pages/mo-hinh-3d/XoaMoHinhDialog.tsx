/**
 * Xác nhận xóa mô hình (API 48, UC 21 bước 6). Xóa hẳn cả file GLB, không khôi phục được.
 * Mô hình đang được bài dùng: máy chủ trả 409 ASSET_IN_USE kèm danh sách bài – hiện danh sách, không cho xóa.
 */
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteAsset, type AssetLessonRef, type AssetListItem } from "@/api/assets";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DanhSachBai } from "./DanhSachBai";

export function XoaMoHinhDialog({
  asset,
  onClose,
  onDeleted,
}: {
  asset: AssetListItem | null;
  onClose: () => void;
  onDeleted: (asset: AssetListItem) => void;
}) {
  const [dangXoa, setDangXoa] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDung, setDangDung] = useState<AssetLessonRef[] | null>(null);

  useEffect(() => {
    setDangXoa(false);
    setLoi(null);
    setDangDung(null);
  }, [asset?.id]);

  async function xoa() {
    if (!asset) return;
    setDangXoa(true);
    setLoi(null);
    try {
      await deleteAsset(asset.id);
      onDeleted(asset);
    } catch (e) {
      if (e instanceof ApiError && e.code === "ASSET_NOT_FOUND") {
        // Người khác đã xóa trước: kết quả như nhau, đóng hộp thoại và tải lại danh sách.
        onDeleted(asset);
      } else if (e instanceof ApiError && e.code === "ASSET_IN_USE") {
        setDangDung((e.details as AssetLessonRef[] | null) ?? []);
        setLoi(e.message);
      } else {
        setLoi(e instanceof ApiError ? e.message : "Không xóa được mô hình, hãy thử lại");
      }
    } finally {
      setDangXoa(false);
    }
  }

  const khongXoaDuoc = dangDung !== null;

  return (
    <Dialog open={asset !== null} onOpenChange={(mo) => !mo && !dangXoa && onClose()}>
      <DialogContent>
        <DialogTitle>{khongXoaDuoc ? "Chưa xóa được mô hình" : "Xóa mô hình?"}</DialogTitle>
        <DialogDescription>
          {khongXoaDuoc
            ? `${asset?.name} đang được dùng trong các bài học dưới đây.`
            : `${asset?.name} và file GLB sẽ bị xóa hẳn khỏi máy chủ, không khôi phục được.`}
        </DialogDescription>

        <div aria-live="polite" className="mt-4 flex flex-col gap-3 empty:hidden">
          {loi && (
            <Alert tone="danger">
              <TriangleAlert strokeWidth={1.5} aria-hidden />
              <span>{loi}</span>
            </Alert>
          )}
          {dangDung && dangDung.length > 0 && <DanhSachBai lessons={dangDung} />}
        </div>

        <DialogFooter>
          {khongXoaDuoc ? (
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
                onClick={() => void xoa()}
                disabled={dangXoa}
              >
                {dangXoa ? "Đang xóa" : "Xóa mô hình"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
