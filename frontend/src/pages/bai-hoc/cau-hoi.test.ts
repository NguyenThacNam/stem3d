import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/client";
import type { LessonPart, LessonQuestion } from "@/api/editorLessons";
import {
  cauMoi,
  chuyenCau,
  docSo,
  doiLoai,
  khacDaLuu,
  kiemTraCau,
  loiCauTuMayChu,
  thanhDauVaoCau,
  tuCauHoi,
} from "./cau-hoi";

const parts: LessonPart[] = [
  { id: 7, mesh_names: ["mat"], label: "Mắt", description: null, camera_view: null, sort_order: 0 },
];

function q(id: number, kw: Partial<LessonQuestion> = {}): LessonQuestion {
  return {
    id,
    question_type: "CHOICE",
    content: `Câu ${id}`,
    options: ["a", "b"],
    answer: { index: 1 },
    tolerance: null,
    sort_order: id,
    ...kw,
  };
}

describe("docSo", () => {
  it("nhận dấu phẩy, dấu chấm, số âm, dạng mũ; từ chối chữ", () => {
    expect(docSo("12,5")).toBe(12.5);
    expect(docSo(" 0.1 ")).toBe(0.1);
    expect(docSo("-3")).toBe(-3);
    expect(docSo("1e3")).toBe(1000);
    expect(docSo("")).toBeNull();
    expect(docSo("12a")).toBeNull();
    expect(docSo("1,2,3")).toBeNull();
  });
});

describe("tuCauHoi / thanhDauVaoCau", () => {
  it("trắc nghiệm giữ phương án và đáp án", () => {
    const c = tuCauHoi(q(1));
    expect(c).toMatchObject({ id: 1, options: ["a", "b"], dapAn: 1 });
    expect(thanhDauVaoCau({ ...c, content: "  Hỏi " })).toEqual({
      question_type: "CHOICE",
      content: "Hỏi",
      options: ["a", "b"],
      answer: { index: 1 },
      tolerance: null,
    });
  });

  it("nhập số: hiện dấu phẩy, gửi số; đơn vị trống thì options null", () => {
    const c = tuCauHoi(
      q(2, { question_type: "NUMERIC", options: { unit: "mL" }, answer: { value: 12.5 }, tolerance: "0.1" }),
    );
    expect(c).toMatchObject({ giaTri: "12,5", saiSo: "0,1", donVi: "mL" });
    expect(thanhDauVaoCau({ ...c, donVi: " " })).toMatchObject({
      options: null,
      answer: { value: 12.5 },
      tolerance: 0.1,
    });
  });

  it("chọn bộ phận", () => {
    const c = tuCauHoi(q(3, { question_type: "PICK_PART", options: null, answer: { part_id: 7 } }));
    expect(c.partId).toBe(7);
    expect(thanhDauVaoCau(c)).toMatchObject({ options: null, answer: { part_id: 7 } });
  });
});

describe("kiemTraCau", () => {
  it("trắc nghiệm: chưa chọn đáp án, phương án trống / trùng", () => {
    const loi = kiemTraCau({ ...cauMoi(), content: "Hỏi", options: ["Vây", " vây ", "", "d"] }, parts);
    expect(loi).toEqual({
      "options.1": "Trùng với phương án khác",
      "options.2": "Hãy nhập phương án hoặc bỏ phương án này",
      answer: "Hãy chọn đáp án đúng",
    });
  });

  it("chọn bộ phận: bài chưa có nhãn / bộ phận không còn", () => {
    const c = { ...cauMoi("PICK_PART"), content: "Bấm", partId: 9 };
    expect(kiemTraCau(c, []).answer).toMatch(/chưa gắn nhãn/);
    expect(kiemTraCau(c, parts).answer).toBe("Hãy chọn bộ phận đúng");
    expect(kiemTraCau({ ...c, partId: 7 }, parts)).toEqual({});
  });

  it("nhập số: thiếu đáp án, sai số âm", () => {
    const c = { ...cauMoi("NUMERIC"), content: "Bao nhiêu?", giaTri: "x", saiSo: "-1" };
    expect(Object.keys(kiemTraCau(c, parts)).sort()).toEqual(["answer", "tolerance"]);
    expect(kiemTraCau({ ...c, giaTri: "12,5", saiSo: "0" }, parts)).toEqual({});
  });

  it("nội dung trống", () => {
    expect(kiemTraCau({ ...cauMoi("NUMERIC"), giaTri: "1", saiSo: "0" }, parts)).toEqual({
      content: "Hãy nhập nội dung câu hỏi",
    });
  });
});

describe("doiLoai / khacDaLuu", () => {
  it("đổi loại giữ nội dung, câu đã lưu không đổi gì thì không khác", () => {
    const c = doiLoai({ ...tuCauHoi(q(1)), content: "Hỏi" }, "NUMERIC");
    expect(c).toMatchObject({ id: 1, content: "Hỏi", question_type: "NUMERIC", options: [] });
    expect(khacDaLuu(tuCauHoi(q(1)), q(1))).toBe(false);
    expect(khacDaLuu({ ...tuCauHoi(q(1)), dapAn: 0 }, q(1))).toBe(true);
    expect(khacDaLuu(cauMoi(), null)).toBe(false);
    expect(khacDaLuu({ ...cauMoi(), content: "x" }, null)).toBe(true);
    const so = q(2, { question_type: "NUMERIC", options: null, answer: { value: 12.5 }, tolerance: "0.1" });
    expect(khacDaLuu({ ...tuCauHoi(so), giaTri: "12.5", saiSo: "0.10" }, so)).toBe(false);
    expect(khacDaLuu({ ...tuCauHoi(so), giaTri: "12.6" }, so)).toBe(true);
  });
});

describe("loiCauTuMayChu / chuyenCau", () => {
  it("lấy lỗi theo ô", () => {
    const e = new ApiError(422, "VALIDATION_ERROR", "Sai", [
      { field: "options.1", message: "Trùng" },
      { field: "answer", message: "Chọn" },
      { field: "question_type", message: "X" },
    ]);
    expect(loiCauTuMayChu(e)).toEqual({ "options.1": "Trùng", answer: "Chọn" });
    expect(loiCauTuMayChu(new ApiError(409, "LESSON_PUBLISHED", "x", null))).toBeNull();
  });

  it("chuyển câu và đánh số lại như máy chủ", () => {
    const ds = [q(10, { sort_order: 0 }), q(11, { sort_order: 1 }), q(12, { sort_order: 2 })];
    expect(chuyenCau(ds, 12, 0).map((x) => [x.id, x.sort_order])).toEqual([
      [12, 0],
      [10, 1],
      [11, 2],
    ]);
    expect(chuyenCau(ds, 10, 99).map((x) => x.id)).toEqual([11, 12, 10]);
  });
});
