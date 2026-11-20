/**
 * Dữ liệu mẫu theo khuôn dạng API 9 (đề xuất, `LessonView`) cho trang thử khung bài học – CHỈ dùng ở bản dev.
 * HT02 thay bằng dữ liệu thật từ GET /api/lessons/{id}.
 */
import type { LessonView, LessonViewPart } from "@/api/types";
import urlKinhHienVi from "@/assets/mo-hinh-thu/kinh-hien-vi.v1.glb?url";
import urlPhanTuNuoc from "@/assets/mo-hinh-thu/phan-tu-nuoc.v1.glb?url";

function boPhan(id: number, label: string, mesh_names: string[], description: string | null): LessonViewPart {
  return { id, label, mesh_names, description, camera_view: null, sort_order: id };
}

export const BAI_KINH_HIEN_VI: LessonView = {
  id: 9001,
  subject: { id: 2, name: "Khoa học tự nhiên" },
  grade: 6,
  chapter: "Mở đầu về Khoa học tự nhiên",
  lesson_no: 4,
  title: "Kính hiển vi quang học",
  lesson_type: "STRUCTURE",
  asset: { file_url: urlKinhHienVi, file_size: null, attribution: "Mô hình mẫu do nhóm Stem3D dựng · CC0" },
  config: { camera_view: null, film_script: null },
  parts: [
    boPhan(1, "Thị kính", ["thi_kinh"], "Thấu kính mắt nhìn vào, phóng to thêm ảnh do vật kính tạo ra."),
    boPhan(2, "Ống kính", ["ong_kinh"], "Ống nối thị kính với vật kính, giữ hai thấu kính thẳng hàng."),
    boPhan(3, "Vật kính", ["vat_kinh_1", "vat_kinh_2"], "Thấu kính sát vật mẫu; xoay để đổi độ phóng đại."),
    boPhan(4, "Bàn kính", ["ban_kinh"], "Nơi đặt tiêu bản cần quan sát, có kẹp giữ tiêu bản."),
    boPhan(5, "Đèn chiếu sáng", ["den"], "Chiếu ánh sáng qua tiêu bản để nhìn rõ mẫu vật."),
    boPhan(
      6,
      "Ốc điều chỉnh",
      ["oc_dieu_chinh_trai", "oc_dieu_chinh_phai"],
      "Vặn để nâng hạ bàn kính, làm ảnh rõ nét.",
    ),
    boPhan(7, "Thân kính", ["than kinh"], "Phần nối chân kính với ống kính; cầm vào đây khi di chuyển kính."),
    boPhan(8, "Chân kính", ["chan_kinh"], "Đế nặng giữ kính đứng vững trên bàn."),
  ],
  questions: [],
};

export const BAI_PHAN_TU_NUOC: LessonView = {
  id: 9002,
  subject: { id: 4, name: "Hóa học" },
  grade: 10,
  chapter: "Liên kết hóa học",
  lesson_no: 10,
  title: "Phân tử nước",
  lesson_type: "STRUCTURE",
  asset: { file_url: urlPhanTuNuoc, file_size: null, attribution: null },
  config: { camera_view: null, film_script: null },
  parts: [
    boPhan(
      1,
      "Nguyên tử oxygen",
      ["nguyen_tu_O"],
      "Nguyên tử trung tâm, liên kết với hai nguyên tử hydrogen.",
    ),
    boPhan(
      2,
      "Nguyên tử hydrogen",
      ["nguyen_tu_H_1", "nguyen_tu_H_2"],
      "Hai nguyên tử hydrogen, mỗi nguyên tử góp một electron.",
    ),
    boPhan(
      3,
      "Liên kết O–H",
      ["lien_ket_1", "lien_ket_2"],
      "Liên kết cộng hóa trị phân cực; góc liên kết khoảng 104,5°.",
    ),
  ],
  questions: [],
};

/** Bài dựng từ một file GLB trên máy: mỗi mesh là một bộ phận (để đo tốc độ với mô hình thật). */
export function baiTuTep(ten: string, tenMesh: string[]): LessonView {
  return {
    id: 9999,
    subject: { id: 0, name: "Thử mô hình" },
    grade: 12,
    chapter: ten,
    lesson_no: null,
    title: "Mô hình trên máy",
    lesson_type: "STRUCTURE",
    asset: null,
    config: { camera_view: null, film_script: null },
    parts: tenMesh.map((t, i) => boPhan(i + 1, t, [t], null)),
    questions: [],
  };
}
