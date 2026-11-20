import { describe, expect, it } from "vitest";
import { giongJson } from "./chuyen-doi";

describe("giongJson", () => {
  it("không phụ thuộc thứ tự khóa, bỏ khóa null (máy chủ không lưu khóa null)", () => {
    const a = { camera_tong_quan: { position: [1, 2, 3], target: [0, 0, 0] }, kich_ban_phim: null };
    const b = { camera_tong_quan: { target: [0, 0, 0], position: [1, 2, 3] } };
    expect(giongJson(a, b)).toBe(true);
    expect(giongJson(a, { camera_tong_quan: { target: [0, 0, 0], position: [1, 2, 4] } })).toBe(false);
    expect(giongJson({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(giongJson({}, { camera_tong_quan: null })).toBe(true);
    // null bên trong vẫn tính (máy chủ chỉ bỏ khóa null ở tầng ngoài).
    expect(giongJson({}, { thi_nghiem: { x: null } })).toBe(false);
    expect(giongJson({ thi_nghiem: {} }, { thi_nghiem: { x: null } })).toBe(false);
  });
});
