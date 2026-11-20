/**
 * Khung 3D của thẻ Bộ phận (ND03, UC 22), dựng trên lõi `CanhBaiHoc` của khung bài học (BH01) để biên tập viên thấy
 * đúng như học sinh: bộ phận đang chọn nổi bật, tách ra, các phần khác mờ đi; góc nhìn lưu theo cùng hệ tọa độ.
 * Bấm vào mô hình báo tên phần (tên gốc trong `mesh_names`, so qua `chuanHoaTenMesh`), kể cả phần chưa gắn nhãn.
 * Nạp lười (default export) để màn soạn bài không phải tải Three.js khi chưa mở thẻ Bộ phận.
 */
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CameraView } from "@/api/types";
import { CanhBaiHoc } from "@/components/mo-hinh-3d/canh-bai-hoc";
import { LopTrangThai, type TrangThaiTai, trangThaiLoi } from "@/components/mo-hinh-3d/LopTrangThai";
import { tenPhanCuaVat } from "@/components/mo-hinh-3d/tinh-toan";
import { cn } from "@/lib/utils";
import type { BoPhanNhap } from "./bo-phan";

/** Điều khiển camera từ thẻ Bộ phận. Mô hình chưa tải xong thì các hàm không làm gì (`layGocNhin` trả null). */
export type DieuKhienGanNhan = {
  layGocNhin: () => CameraView | null;
  bayToi: (goc: CameraView) => void;
  gocChuan: () => void;
};

export default function KhungGanNhan({
  url,
  ten,
  meshNames,
  boPhan,
  dangChon,
  onBamPhan,
  gocTongQuan,
  ref,
  className,
}: {
  url: string;
  ten: string;
  /** `mesh_names` của mô hình (tên gốc trong file). */
  meshNames: readonly string[];
  boPhan: BoPhanNhap[];
  /** Khóa bộ phận đang chọn. */
  dangChon: string | null;
  /** Bấm (không kéo): tên phần trúng (null khi bấm vùng trống hoặc phần không tên), có giữ Shift không. */
  onBamPhan: (ten: string | null, giuShift: boolean) => void;
  /** Góc nhìn tổng quan của bài (`config.camera_tong_quan`), như khung bài học; null thì tự canh vừa khung. */
  gocTongQuan: CameraView | null;
  ref?: Ref<DieuKhienGanNhan>;
  className?: string;
}) {
  const khungRef = useRef<HTMLDivElement>(null);
  const canhRef = useRef<CanhBaiHoc | null>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiTai>({ loai: "dang-tai", phanTram: null });
  const [daTai, setDaTai] = useState(false);
  const [lanThu, setLanThu] = useState(0);

  // Giữ trong ref để đổi hàm / danh sách không làm tải lại mô hình.
  const moi = useRef({ onBamPhan, meshNames, boPhan, dangChon, gocTongQuan });
  moi.current = { onBamPhan, meshNames, boPhan, dangChon, gocTongQuan };

  useImperativeHandle(
    ref,
    () => ({
      layGocNhin: () => {
        const g = daTai ? canhRef.current?.gocNhinHienTai() : undefined;
        if (!g) return null;
        // Làm tròn 5 chữ số thập phân: JSON gọn, lệch không thấy được.
        const tron = (v: CameraView["position"]) =>
          v.map((s) => Math.round(s * 1e5) / 1e5) as CameraView["position"];
        return { position: tron(g.position), target: tron(g.target) };
      },
      bayToi: (g) => {
        if (daTai) canhRef.current?.datGocNhin(g, true);
      },
      gocChuan: () => {
        if (daTai) canhRef.current?.datLaiGocNhin();
      },
    }),
    [daTai],
  );

  useEffect(() => {
    const khung = khungRef.current;
    if (!khung) return;
    let huy = false;
    setTrangThai({ loai: "dang-tai", phanTram: null });
    setDaTai(false);
    let canh: CanhBaiHoc;
    try {
      canh = new CanhBaiHoc(khung, {
        onBamVat: (vat, giuShift) =>
          moi.current.onBamPhan(tenPhanCuaVat(vat, moi.current.meshNames), giuShift),
      });
    } catch (loi) {
      setTrangThai(trangThaiLoi(loi));
      return;
    }
    canhRef.current = canh;
    canh.datGocTongQuan(moi.current.gocTongQuan);
    let phanTramCu: number | null = null;
    canh
      .tai({ loai: "url", url, ten }, (phanTram) => {
        if (huy || phanTram === phanTramCu) return;
        phanTramCu = phanTram;
        setTrangThai({ loai: "dang-tai", phanTram });
      })
      .then(() => {
        if (huy) return;
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
    // `ten` chỉ dùng để báo lỗi; đổi tên không cần tải lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, lanThu]);

  // Gắn bộ phận vào mô hình khi danh sách phần của các bộ phận đổi (không chạy lại khi chỉ sửa nhãn, chú thích).
  // id trong khung = vị trí + 1 (bộ phận mới chưa có id trên máy chủ).
  const khoaPhan = JSON.stringify(boPhan.map((p) => p.mesh_names));
  useEffect(() => {
    const canh = canhRef.current;
    if (!daTai || !canh) return;
    const ds = moi.current.boPhan;
    canh.datBoPhan(ds.map((p, i) => ({ id: i + 1, mesh_names: p.mesh_names })));
    const i = ds.findIndex((p) => p.khoa === moi.current.dangChon);
    canh.chon(i < 0 ? null : i + 1, false);
  }, [daTai, khoaPhan]);

  // Chọn bộ phận khác: tách ra và bay tới góc nhìn đã lưu (chưa có thì tự canh). Bỏ chọn: lắp lại, giữ camera.
  useEffect(() => {
    const canh = canhRef.current;
    if (!daTai || !canh) return;
    const ds = moi.current.boPhan;
    const i = ds.findIndex((p) => p.khoa === dangChon);
    if (i < 0) canh.chon(null, false);
    else canh.chon(i + 1, true, ds[i].camera_view);
  }, [daTai, dangChon]);

  // Đổi / bỏ góc tổng quan ("Lưu góc tổng quan"): "Góc nhìn chuẩn" dùng góc mới ngay, không tải lại mô hình.
  const khoaGoc = JSON.stringify(gocTongQuan);
  useEffect(() => {
    canhRef.current?.datGocTongQuan(moi.current.gocTongQuan);
  }, [daTai, khoaGoc]);

  return (
    <div className={cn("relative overflow-hidden grid3d", className)}>
      <div ref={khungRef} className="absolute inset-0" role="img" aria-label={`Mô hình 3D: ${ten}`} />
      <LopTrangThai trangThai={trangThai} onThuLai={() => setLanThu((n) => n + 1)} />
    </div>
  );
}
