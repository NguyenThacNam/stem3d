/** Xem chi tiết mô hình (API 47): xem trước 3D, báo cáo kiểm tra, các phần, nguồn và các bài đang dùng. */
import { Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAsset, SOURCE_LABEL, type AssetDetail, type AssetListItem } from "@/api/assets";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { BaoCaoKiemTra } from "./BaoCaoKiemTra";
import { DanhSachBai } from "./DanhSachBai";
import { XemTruoc3D } from "./XemTruoc3D";

type TrangThai =
  { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; data: AssetDetail };

export function ChiTietMoHinhDialog({
  asset,
  onClose,
  onDelete,
}: {
  /** Dòng đang xem (null: đóng). Dùng dữ liệu dòng để hiện tiêu đề ngay khi đang tải. */
  asset: AssetListItem | null;
  onClose: () => void;
  onDelete: (asset: AssetListItem) => void;
}) {
  const [tt, setTt] = useState<TrangThai>({ kind: "loading" });
  const id = asset?.id;

  const tai = useCallback(async (assetId: number, huy: { v: boolean }) => {
    setTt({ kind: "loading" });
    try {
      const data = await getAsset(assetId);
      if (!huy.v) setTt({ kind: "ready", data });
    } catch (e) {
      if (!huy.v)
        setTt({
          kind: "error",
          message: e instanceof ApiError ? e.message : "Không tải được mô hình, hãy thử lại",
        });
    }
  }, []);

  useEffect(() => {
    if (id === undefined) return;
    const huy = { v: false };
    void tai(id, huy);
    return () => {
      huy.v = true;
    };
  }, [id, tai]);

  return (
    <Dialog open={asset !== null} onOpenChange={(mo) => !mo && onClose()}>
      <DialogContent className="max-w-[1040px]">
        <DialogTitle>{asset?.name}</DialogTitle>
        {asset && (
          <DialogDescription>
            {SOURCE_LABEL[asset.source_type]}
            {asset.uploaded_by_name ? ` · ${asset.uploaded_by_name} nạp` : ""} ngày{" "}
            {formatDate(asset.created_at)}
          </DialogDescription>
        )}

        <div className="mt-5 grid min-h-0 flex-1 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 overflow-y-auto">
          {asset && <XemTruoc3D url={asset.file_url} ten={asset.name} className="h-[440px]" />}

          <div className="flex min-w-0 flex-col gap-5" aria-busy={tt.kind === "loading"}>
            {tt.kind === "loading" && (
              <div className="flex flex-col gap-2" aria-label="Đang tải báo cáo">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-ctl bg-surface-2" />
                ))}
              </div>
            )}
            {tt.kind === "error" && (
              <Alert tone="danger" className="items-center" role="status">
                <TriangleAlert strokeWidth={1.5} aria-hidden />
                <span className="flex-1">{tt.message}</span>
                <Button size="sm" onClick={() => id !== undefined && void tai(id, { v: false })}>
                  Thử lại
                </Button>
              </Alert>
            )}
            {tt.kind === "ready" && (
              <>
                <BaoCaoKiemTra baoCao={tt.data} />
                {tt.data.attribution && (
                  <section>
                    <h3 className="text-[14px] font-medium">Ghi công tác giả</h3>
                    <p className="mt-1 text-[14px] text-text-2">{tt.data.attribution}</p>
                  </section>
                )}
                <section>
                  <h3 className="text-[14px] font-medium">Bài học đang dùng</h3>
                  {tt.data.lessons.length === 0 ? (
                    <p className="mt-1 text-[14px] text-text-2">Chưa bài nào dùng mô hình này.</p>
                  ) : (
                    <DanhSachBai lessons={tt.data.lessons} className="mt-2" />
                  )}
                </section>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="justify-between">
          <Button
            variant="ghost"
            className="text-danger hover:bg-danger-weak hover:text-danger"
            onClick={() => asset && onDelete(asset)}
          >
            <Trash2 strokeWidth={1.5} aria-hidden />
            Xóa mô hình
          </Button>
          <Button onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
