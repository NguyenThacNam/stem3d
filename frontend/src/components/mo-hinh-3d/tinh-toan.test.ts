import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Texture,
} from "three";
import { describe, expect, it, vi } from "vitest";
import {
  banDoTenPhan,
  DemKhungHinh,
  emDan,
  giaiPhong,
  khoangCachVuaKhung,
  laGocNhin,
  phanTramDaTai,
  tenPhanGoc,
  thongKeMoHinh,
} from "./tinh-toan";

describe("khoangCachVuaKhung", () => {
  it("khung vuông, fov 90°: khoảng cách = r / sin(45°) × lề", () => {
    expect(khoangCachVuaKhung(1, 90, 1, 1)).toBeCloseTo(Math.SQRT2, 6);
  });

  it("khung dọc (hẹp ngang) cần lùi xa hơn khung ngang", () => {
    const ngang = khoangCachVuaKhung(1, 45, 16 / 9);
    const doc = khoangCachVuaKhung(1, 45, 9 / 16);
    expect(doc).toBeGreaterThan(ngang);
  });

  it("tỉ lệ với bán kính", () => {
    expect(khoangCachVuaKhung(10, 45, 1.5)).toBeCloseTo(10 * khoangCachVuaKhung(1, 45, 1.5), 6);
  });

  it("dữ liệu hỏng (bán kính 0, khung 0 px) không trả NaN hay vô cực", () => {
    expect(khoangCachVuaKhung(0, 45, 1)).toBe(1);
    expect(khoangCachVuaKhung(1, 45, 0)).toBe(1);
    expect(khoangCachVuaKhung(Number.NaN, 45, 1)).toBe(1);
  });
});

describe("thongKeMoHinh", () => {
  it("đếm mesh, tam giác theo index và giữ tên mesh theo thứ tự", () => {
    const goc = new Group();
    const hop = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    hop.name = "hop";
    const conCuaHop = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    conCuaHop.name = "nap";
    hop.add(conCuaHop);
    goc.add(hop);

    expect(thongKeMoHinh(goc)).toEqual({ soMesh: 2, soTamGiac: 24, tenMesh: ["hop", "nap"] });
  });

  it("geometry không có index thì tính theo số đỉnh; mesh không tên ghi rõ", () => {
    const hinh = new BufferGeometry();
    hinh.setAttribute("position", new BufferAttribute(new Float32Array(9 * 3), 3));
    const goc = new Group().add(new Mesh(hinh, new MeshBasicMaterial()));

    expect(thongKeMoHinh(goc)).toEqual({ soMesh: 1, soTamGiac: 3, tenMesh: ["(không tên)"] });
  });

  it("mô hình rỗng", () => {
    expect(thongKeMoHinh(new Group())).toEqual({ soMesh: 0, soTamGiac: 0, tenMesh: [] });
  });
});

describe("giaiPhong", () => {
  it("giải phóng geometry, vật liệu, texture – dùng chung thì chỉ một lần", () => {
    const hinh = new BoxGeometry();
    const anh = new Texture();
    const vatLieu = new MeshStandardMaterial({ map: anh, normalMap: anh });
    const vatLieu2 = new MeshBasicMaterial();
    const goc = new Group().add(new Mesh(hinh, vatLieu), new Mesh(hinh, [vatLieu, vatLieu2]));

    const spy = [hinh, anh, vatLieu, vatLieu2].map((x) => vi.spyOn(x, "dispose"));
    giaiPhong(goc);
    for (const s of spy) expect(s).toHaveBeenCalledTimes(1);
  });

  it("giải phóng cả điểm (Points) và đường (LineSegments), không chỉ mesh", () => {
    const hinhDiem = new BufferGeometry();
    const vlDiem = new PointsMaterial();
    const hinhDuong = new BufferGeometry();
    const vlDuong = new LineBasicMaterial();
    const goc = new Group().add(new Points(hinhDiem, vlDiem), new LineSegments(hinhDuong, vlDuong));

    const spy = [hinhDiem, vlDiem, hinhDuong, vlDuong].map((x) => vi.spyOn(x, "dispose"));
    giaiPhong(goc);
    for (const s of spy) expect(s).toHaveBeenCalledTimes(1);
  });
});

describe("phanTramDaTai", () => {
  it("làm tròn và giới hạn 0–100", () => {
    expect(phanTramDaTai(1, 3)).toBe(33);
    expect(phanTramDaTai(5, 4)).toBe(100);
  });

  it("không biết tổng dung lượng thì trả null", () => {
    expect(phanTramDaTai(100, 0)).toBeNull();
  });
});

describe("DemKhungHinh", () => {
  it("60 khung trong 1 giây ≈ 60 fps", () => {
    const dem = new DemKhungHinh();
    for (let i = 0; i <= 60; i++) dem.ghi(i * (1000 / 60));
    expect(dem.fps()).toBeCloseTo(60, 0);
  });

  it("bỏ các mốc cũ hơn cửa sổ: máy chậm lại thì fps giảm theo", () => {
    const dem = new DemKhungHinh(1000);
    for (let i = 0; i <= 60; i++) dem.ghi(i * (1000 / 60)); // 60 fps trong giây đầu
    for (let i = 1; i <= 20; i++) dem.ghi(1000 + i * 50); // sau đó 20 fps
    expect(dem.fps()).toBeCloseTo(20, 0);
  });

  it("chưa đủ 2 mốc thì trả 0", () => {
    const dem = new DemKhungHinh();
    expect(dem.fps()).toBe(0);
    dem.ghi(10);
    expect(dem.fps()).toBe(0);
  });
});

describe("tenPhanGoc / banDoTenPhan", () => {
  const json = {
    nodes: [{ name: "Vây lưng", mesh: 0 }, { name: "  ", mesh: 1 }, { mesh: 2 }, { name: "Nhóm" }],
    meshes: [{ name: "m0" }, { name: "mat.001" }, {}],
  };

  it("tên node trước, node không tên thì tên mesh, không có tên nào thì null (giống máy chủ)", () => {
    expect(tenPhanGoc(json, 0)).toBe("Vây lưng");
    expect(tenPhanGoc(json, 1)).toBe("mat.001");
    expect(tenPhanGoc(json, 2)).toBeNull();
    expect(tenPhanGoc(json, 9)).toBeNull();
  });

  it("mesh nhiều primitive (Group chứa Mesh con) lấy tên theo node của Group", () => {
    const goc = new Group();
    const vay = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const nhom = new Group();
    const con1 = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const con2 = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const khongTen = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    nhom.add(con1, con2);
    goc.add(vay, nhom, khongTen);
    const lienKet = new Map<unknown, { nodes?: number }>([
      [vay, { nodes: 0 }],
      [nhom, { nodes: 1 }],
      [con1, {}],
      [khongTen, { nodes: 2 }],
    ]);
    const bd = banDoTenPhan(goc, lienKet, json);
    expect(bd.get(vay)).toBe("Vây lưng");
    expect(bd.get(con1)).toBe("mat.001");
    expect(bd.get(con2)).toBe("mat.001");
    expect(bd.has(khongTen)).toBe(false);
  });
});

describe("laGocNhin / emDan", () => {
  it("chỉ nhận hai bộ ba số hữu hạn", () => {
    expect(laGocNhin({ position: [1, 2, 3], target: [0, 0, 0] })).toBe(true);
    expect(laGocNhin({ position: [1, 2], target: [0, 0, 0] })).toBe(false);
    expect(laGocNhin({ position: [1, 2, Number.NaN], target: [0, 0, 0] })).toBe(false);
    expect(laGocNhin(null)).toBe(false);
  });

  it("đi từ 0 tới 1, kẹp ngoài khoảng", () => {
    expect(emDan(-1)).toBe(0);
    expect(emDan(0.5)).toBeCloseTo(0.5, 6);
    expect(emDan(2)).toBe(1);
  });
});
