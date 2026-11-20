import { describe, expect, it } from "vitest";
import type { LessonPart } from "@/api/types";
import { boPhanTiep, cacCheDo, dongPhu, sapXepBoPhan, xepChuThich } from "./bo-cuc";

const bp = (id: number, sort_order: number): LessonPart => ({
  id,
  sort_order,
  label: `BP ${id}`,
  description: null,
  mesh_names: [],
  camera_view: null,
});

describe("cacCheDo", () => {
  it("bài cấu tạo không có phim: Tự khám phá, Kiểm tra", () => {
    expect(cacCheDo({ lesson_type: "STRUCTURE", config: {} })).toEqual(["kham-pha", "kiem-tra"]);
  });

  it("có kịch bản phim thì thêm Phim ở đầu; bài thí nghiệm thêm Thí nghiệm trước Kiểm tra", () => {
    expect(cacCheDo({ lesson_type: "EXPERIMENT", config: { film_script: [{}] } })).toEqual([
      "phim",
      "kham-pha",
      "thi-nghiem",
      "kiem-tra",
    ]);
  });

  it("kịch bản phim rỗng thì ẩn Phim (UC5 luồng phụ 2.1)", () => {
    expect(cacCheDo({ lesson_type: "STRUCTURE", config: { film_script: [] } })).not.toContain("phim");
  });
});

describe("dongPhu", () => {
  it("môn + lớp · chương; không có chương thì bỏ", () => {
    expect(
      dongPhu({ subject: { id: 1, name: "Khoa học tự nhiên" }, grade: 8, chapter: "Sinh học cơ thể người" }),
    ).toBe("Khoa học tự nhiên 8 · Sinh học cơ thể người");
    expect(dongPhu({ subject: { id: 1, name: "Hóa học" }, grade: 11, chapter: null })).toBe("Hóa học 11");
  });
});

describe("sapXepBoPhan, boPhanTiep", () => {
  const ds = sapXepBoPhan([bp(3, 2), bp(1, 1), bp(2, 1)]);

  it("xếp theo sort_order rồi id, không đổi mảng gốc", () => {
    expect(ds.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("bộ phận tiếp: sau bộ phận đang xem, hết thì quay về đầu, chưa chọn thì lấy đầu", () => {
    expect(boPhanTiep(ds, 1)).toBe(2);
    expect(boPhanTiep(ds, 3)).toBe(1);
    expect(boPhanTiep(ds, null)).toBe(1);
    expect(boPhanTiep([], null)).toBeNull();
  });
});

describe("xepChuThich", () => {
  it("chia hai cột theo vị trí so với giữa mô hình; thẻ đặt ngang điểm neo khi đủ chỗ", () => {
    const kq = xepChuThich(
      [
        { id: 1, x: 100, y: 200 },
        { id: 2, x: 900, y: 300 },
      ],
      500,
      40,
      20,
      800,
    );
    expect(kq).toEqual([
      { id: 1, ben: "trai", y: 200 },
      { id: 2, ben: "phai", y: 300 },
    ]);
  });

  it("thẻ gần nhau thì đẩy xuống cho đủ khoảng cách, giữ thứ tự từ trên xuống", () => {
    const kq = xepChuThich(
      [
        { id: 1, x: 900, y: 100 },
        { id: 2, x: 900, y: 110 },
        { id: 3, x: 900, y: 120 },
      ],
      500,
      40,
      20,
      800,
    );
    expect(kq.map((v) => v.y)).toEqual([100, 140, 180]);
  });

  it("tràn đáy thì đẩy ngược lên, không vượt giới hạn", () => {
    const kq = xepChuThich(
      [
        { id: 1, x: 900, y: 790 },
        { id: 2, x: 900, y: 795 },
      ],
      500,
      40,
      20,
      800,
    );
    expect(kq.map((v) => v.y)).toEqual([760, 800]);
  });

  it("cột quá đông so với chiều cao: rải đều trong khung, không thẻ nào ra ngoài", () => {
    const neo = Array.from({ length: 6 }, (_, i) => ({ id: i, x: 900, y: 50 }));
    const kq = xepChuThich(neo, 500, 40, 20, 120);
    expect(kq.map((v) => v.y)).toEqual([20, 40, 60, 80, 100, 120]);
  });
});
