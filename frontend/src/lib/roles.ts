/** Menu thanh bên theo vai trò (Hình 3-1), nhãn nhóm theo docs/giao-dien-chuong-3.html. */
import {
  BookOpen,
  Box,
  ChartColumn,
  ClipboardList,
  PenLine,
  School,
  ScrollText,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/api/types";

export interface MenuItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Câu phụ dưới tiêu đề trang. */
  description: string;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export const ROLE_LABEL: Record<Role, string> = {
  SYSTEM_ADMIN: "Quản trị hệ thống",
  CONTENT_EDITOR: "Biên tập viên",
  SCHOOL_ADMIN: "Quản trị trường",
  TEACHER: "Giáo viên",
  STUDENT: "Học sinh",
};

const M = {
  baiDuocGiao: {
    path: "/bai-duoc-giao",
    label: "Bài được giao",
    icon: ClipboardList,
    description: "Các bài thầy cô đã giao cho em",
  },
  thuVien: {
    path: "/thu-vien",
    label: "Thư viện bài học",
    icon: BookOpen,
    description: "Bài học theo môn, lớp và chương trong sách",
  },
  ketQuaCuaToi: {
    path: "/ket-qua-cua-toi",
    label: "Kết quả của tôi",
    icon: ChartColumn,
    description: "Điểm các bài đã nộp",
  },
  lopCuaToi: {
    path: "/lop-cua-toi",
    label: "Lớp của tôi",
    icon: Users,
    description: "Các lớp thầy cô được phân công giảng dạy",
  },
  ketQuaLop: {
    path: "/ket-qua-lop",
    label: "Kết quả cả lớp",
    icon: ChartColumn,
    description: "Kết quả bài đã giao theo từng lớp",
  },
  qlHocSinh: {
    path: "/quan-ly/hoc-sinh",
    label: "Học sinh",
    icon: User,
    description: "Hồ sơ và tài khoản học sinh của trường",
  },
  qlGiaoVien: {
    path: "/quan-ly/giao-vien",
    label: "Giáo viên",
    icon: Users,
    description: "Hồ sơ và tài khoản giáo viên của trường",
  },
  qlLop: {
    path: "/quan-ly/lop",
    label: "Lớp và phân công",
    icon: School,
    description: "Lớp học, xếp lớp và phân công giảng dạy",
  },
  qlBaoCao: {
    path: "/quan-ly/bao-cao",
    label: "Báo cáo sử dụng",
    icon: ChartColumn,
    description: "Mức độ sử dụng hệ thống của trường",
  },
  btBaiHoc: {
    path: "/bien-tap/bai-hoc",
    label: "Bài học",
    icon: BookOpen,
    description: "Soạn, xuất bản và gỡ xuất bản bài học",
  },
  btMoHinh: {
    path: "/bien-tap/mo-hinh",
    label: "Mô hình 3D",
    icon: Box,
    description: "Nạp và kiểm tra mô hình 3D",
  },
  htTruong: {
    path: "/he-thong/truong",
    label: "Trường",
    icon: School,
    description: "Các trường đang dùng hệ thống",
  },
  htBienTap: {
    path: "/he-thong/bien-tap-vien",
    label: "Biên tập viên",
    icon: PenLine,
    description: "Tài khoản biên tập viên nội dung",
  },
  htNhatKy: {
    path: "/he-thong/nhat-ky",
    label: "Nhật ký hệ thống",
    icon: ScrollText,
    description: "Các thao tác quan trọng trong hệ thống",
  },
} satisfies Record<string, MenuItem>;

export const MENUS: Record<Role, MenuGroup[]> = {
  STUDENT: [{ label: "Học tập", items: [M.baiDuocGiao, M.thuVien, M.ketQuaCuaToi] }],
  TEACHER: [
    { label: "Giảng dạy", items: [M.lopCuaToi, M.ketQuaLop] },
    { label: "Học tập", items: [M.thuVien] },
  ],
  SCHOOL_ADMIN: [{ label: "Quản lý trường", items: [M.qlHocSinh, M.qlGiaoVien, M.qlLop, M.qlBaoCao] }],
  CONTENT_EDITOR: [{ label: "Nội dung", items: [M.btBaiHoc, M.btMoHinh] }],
  // Quản trị hệ thống kế thừa biên tập viên: có thêm Bài học, Mô hình 3D.
  SYSTEM_ADMIN: [
    { label: "Hệ thống", items: [M.htTruong, M.htBienTap, M.htNhatKy] },
    { label: "Nội dung", items: [M.btBaiHoc, M.btMoHinh] },
  ],
};

/** Mọi trang trong menu, kèm các vai trò được vào. */
export const ALL_PAGES: { item: MenuItem; roles: Role[] }[] = (() => {
  const map = new Map<string, { item: MenuItem; roles: Role[] }>();
  for (const role of Object.keys(MENUS) as Role[]) {
    for (const group of MENUS[role]) {
      for (const item of group.items) {
        const entry = map.get(item.path) ?? { item, roles: [] };
        entry.roles.push(role);
        map.set(item.path, entry);
      }
    }
  }
  return [...map.values()];
})();

/** Trang chủ theo vai trò: mục đầu tiên của menu. */
export function homePath(role: Role): string {
  // Phòng vai trò lạ từ máy chủ (chưa thể xảy ra): về màn đăng nhập thay vì trắng trang.
  return MENUS[role]?.[0]?.items[0]?.path ?? "/dang-nhap";
}
