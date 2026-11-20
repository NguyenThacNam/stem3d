import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/client";
import type { LessonPart } from "@/api/editorLessons";
import {
  bamPhan,
  type BoPhanNhap,
  diChuyen,
  giuKhoa,
  khacDaLuu,
  kiemTraBoPhan,
  loiBoPhanTuMayChu,
  phanChuaGan,
  thanhDauVaoBoPhan,
  tuDanhSach,
} from "./bo-phan";

const GOC = { position: [1, 2, 3], target: [0, 0, 0] } as const;

const daLuu: LessonPart[] = [
  {
    id: 7,
    mesh_names: ["mat_trai", "mat_phai"],
    label: "Mắt",
    description: null,
    camera_view: GOC,
    sort_order: 0,
  },
  {
    id: 9,
    mesh_names: ["vay_lung"],
    label: "Vây lưng",
    description: "Giữ thăng bằng.",
    camera_view: "sai",
    sort_order: 1,
  },
];

function bp(khoa: string, mesh: string[], label = "X"): BoPhanNhap {
  return { khoa, id: null, mesh_names: mesh, label, description: "", camera_view: null };
}

describe("tuDanhSach / thanhDauVaoBoPhan", () => {
  it("giữ id, bỏ góc nhìn sai dạng, chú thích rỗng thành null", () => {
    const ds = tuDanhSach(daLuu);
    expect(ds[0].camera_view).toEqual(GOC);
    expect(ds[1].camera_view).toBeNull();
    const vao = thanhDauVaoBoPhan([...ds, { ...bp("m", ["duoi"], "  Đuôi "), description: "  " }]);
    expect(vao[0].id).toBe(7);
    expect(vao[2]).toEqual({ mesh_names: ["duoi"], label: "Đuôi", description: null, camera_view: null });
    expect("id" in vao[2]).toBe(false);
  });

  it("khacDaLuu nhận ra đổi thứ tự, không coi khoảng trắng thừa là thay đổi", () => {
    const ds = tuDanhSach(daLuu);
    expect(khacDaLuu(ds, daLuu)).toBe(false);
    expect(khacDaLuu([{ ...ds[0], label: " Mắt " }, ds[1]], daLuu)).toBe(false);
    expect(khacDaLuu([ds[1], ds[0]], daLuu)).toBe(true);
  });
});

describe("giuKhoa", () => {
  it("bộ phận vừa lưu lấy lại khóa theo vị trí", () => {
    const moi = tuDanhSach(daLuu);
    const kq = giuKhoa(moi, [bp("moi-1", ["x"]), bp("id-9", ["y"])]);
    expect(kq.map((p) => [p.khoa, p.id])).toEqual([
      ["moi-1", 7],
      ["id-9", 9],
    ]);
  });
});

describe("kiemTraBoPhan", () => {
  const co = ["a", "b", "c"];
  it("bắt nhãn rỗng, trùng nhãn (không phân biệt hoa thường), chưa có phần, phần không còn trong mô hình", () => {
    const loi = kiemTraBoPhan(
      [
        bp("1", ["a"], "Vây"),
        bp("2", ["b"], " vây "),
        bp("3", [], "Mắt"),
        bp("4", ["c", "z"], ""),
        bp("5", ["c"], "Ổn"),
      ],
      co,
    );
    expect(Object.keys(loi).sort()).toEqual(["2", "3", "4"]);
    expect(loi["4"]).toHaveLength(2);
  });

  it("nhãn gõ dạng tổ hợp (NFD) vẫn tính là trùng", () => {
    const loi = kiemTraBoPhan([bp("1", ["a"], "Vây"), bp("2", ["b"], "Vây".normalize("NFD"))], co);
    expect(Object.keys(loi)).toEqual(["2"]);
  });

  it("danh sách đúng thì không lỗi", () => {
    expect(kiemTraBoPhan([bp("1", ["a", "b"], "Mắt")], co)).toEqual({});
  });
});

describe("loiBoPhanTuMayChu", () => {
  it("đổi parts.<i>.* sang khóa bộ phận", () => {
    const ds = [bp("x", ["a"]), bp("y", ["b"])];
    const e = new ApiError(422, "VALIDATION_ERROR", "Sai", [
      { field: "parts.1.mesh_names.0", message: "Phần thứ 1 đã thuộc bộ phận khác" },
      { field: "parts.9.label", message: "Không có" },
    ]);
    expect(loiBoPhanTuMayChu(e, ds)).toEqual({ y: ["Phần thứ 1 đã thuộc bộ phận khác"] });
    expect(loiBoPhanTuMayChu(new ApiError(400, "LESSON_NO_ASSET", "x", null), ds)).toBeNull();
  });
});

describe("bamPhan", () => {
  const ds = [bp("mat", ["mat_trai", "mat_phai"], "Mắt"), bp("vay", ["vay_lung"], "Vây")];

  it("bấm phần đã gắn nhãn thì chọn bộ phận đó", () => {
    expect(bamPhan(ds, null, "mat_phai", false)).toEqual({ ds, dangChon: "mat" });
  });

  it("bấm phần chưa gắn nhãn thì tạo bộ phận mới đang chọn", () => {
    const kq = bamPhan(ds, "mat", "duoi", false);
    expect(kq.ds).toHaveLength(3);
    expect(kq.ds[2]).toMatchObject({ id: null, mesh_names: ["duoi"], label: "" });
    expect(kq.dangChon).toBe(kq.ds[2].khoa);
  });

  it("Shift: thêm phần vào bộ phận đang chọn và lấy ra khỏi bộ phận cũ; bấm lại thì bỏ ra", () => {
    const kq = bamPhan(ds, "mat", "vay_lung", true);
    expect(kq.dangChon).toBe("mat");
    expect(kq.ds[0].mesh_names).toEqual(["mat_trai", "mat_phai", "vay_lung"]);
    expect(kq.ds[1].mesh_names).toEqual([]);
    expect(bamPhan(kq.ds, "mat", "mat_trai", true).ds[0].mesh_names).toEqual(["mat_phai", "vay_lung"]);
  });

  it("bấm nền: bỏ chọn; giữ Shift thì giữ nguyên", () => {
    expect(bamPhan(ds, "mat", null, false).dangChon).toBeNull();
    expect(bamPhan(ds, "mat", null, true).dangChon).toBe("mat");
  });
});

describe("diChuyen / phanChuaGan", () => {
  it("chuyển vị trí, vị trí sai thì giữ nguyên", () => {
    expect(diChuyen([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(diChuyen([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
    const goc = [1, 2];
    expect(diChuyen(goc, 0, 5)).toBe(goc);
  });

  it("phần chưa gắn theo thứ tự trong file", () => {
    expect(phanChuaGan([bp("1", ["b"])], ["a", "b", "c"])).toEqual(["a", "c"]);
  });
});
