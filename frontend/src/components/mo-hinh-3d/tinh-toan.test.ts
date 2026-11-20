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
  Box3,
  Texture,
  Vector3,
} from "three";
import { describe, expect, it, vi } from "vitest";
import {
  chuanHoaTenMesh,
  chuyenDongMem,
  DemKhungHinh,
  duaTamVeGoc,
  giaiPhong,
  gioiHanCamera,
  huongTach,
  khoangCachVuaKhung,
  phanTramDaTai,
  tenPhanCuaVat,
  thongKeMoHinh,
  timMeshTheoTen,
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

describe("duaTamVeGoc", () => {
  function moHinhLech() {
    const goc = new Group();
    const hop = new Mesh(new BoxGeometry(2, 4, 6), new MeshBasicMaterial()); // khối bao 2 × 4 × 6
    hop.position.set(10, -3, 5);
    goc.add(hop);
    return goc;
  }

  it("đưa tâm khối bao của toàn bộ mô hình về gốc tọa độ, không co giãn, không xoay", () => {
    const goc = moHinhLech();
    const kq = duaTamVeGoc(goc);
    const hop = new Box3().setFromObject(goc);
    const tam = hop.getCenter(new Vector3());
    expect(tam.length()).toBeCloseTo(0, 6);
    expect(hop.getSize(new Vector3()).toArray()).toEqual([2, 4, 6]);
    expect(goc.scale.toArray()).toEqual([1, 1, 1]);
    expect(goc.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(kq?.banKinh).toBeCloseTo(Math.sqrt(1 + 4 + 9), 6); // nửa đường chéo khối bao
  });

  it("gọi hai lần cho cùng kết quả (ND03 và BH01 dựng ra cùng hệ tọa độ)", () => {
    const goc = moHinhLech();
    duaTamVeGoc(goc);
    const lan1 = goc.position.clone();
    duaTamVeGoc(goc);
    expect(goc.position.distanceTo(lan1)).toBeCloseTo(0, 6);
    expect(lan1.toArray()).toEqual([-10, 3, -5]);
  });

  it("mô hình không có hình nào thì trả null", () => {
    expect(duaTamVeGoc(new Group())).toBeNull();
  });
});

describe("chuanHoaTenMesh, timMeshTheoTen", () => {
  it("chuẩn hóa như Three.js: khoảng trắng thành _, bỏ [ ] . : /", () => {
    expect(chuanHoaTenMesh("than kinh")).toBe("than_kinh");
    expect(chuanHoaTenMesh("Tâm thất trái")).toBe("Tâm_thất_trái");
    expect(chuanHoaTenMesh("a[1].b:c/d")).toBe("a1bcd");
    expect(chuanHoaTenMesh(chuanHoaTenMesh("than kinh"))).toBe("than_kinh");
  });

  it("khớp tên gốc trong file với tên Three.js đặt; nút nhóm lấy mọi mesh con; báo tên không có", () => {
    const goc = new Group();
    const than = new Group();
    than.name = "than_kinh"; // Three.js đã chuẩn hóa từ "than kinh"
    const duoi = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const tren = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    than.add(duoi, tren);
    const mat = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mat.name = "mat";
    goc.add(than, mat);

    const kq = timMeshTheoTen(goc, ["than kinh", "mat", "khong co"]);
    expect(new Set(kq.meshes)).toEqual(new Set([duoi, tren, mat]));
    expect(kq.thieu).toEqual(["khong co"]);
  });
});

describe("chuyenDongMem, huongTach", () => {
  it("chuyển động bắt đầu 0, kết thúc 1, đối xứng ở giữa, kẹp ngoài [0, 1]", () => {
    expect(chuyenDongMem(0)).toBe(0);
    expect(chuyenDongMem(1)).toBe(1);
    expect(chuyenDongMem(0.5)).toBeCloseTo(0.5, 6);
    expect(chuyenDongMem(-1)).toBe(0);
    expect(chuyenDongMem(2)).toBe(1);
  });

  it("tách theo hướng từ tâm mô hình ra tâm bộ phận", () => {
    const h = huongTach(new Vector3(0, 3, 0), 10, new Vector3(0, 0, 1));
    expect(h.toArray()).toEqual([0, 1, 0]);
  });

  it("bộ phận ở sát tâm mô hình thì tách về phía camera", () => {
    const h = huongTach(new Vector3(0.1, 0, 0), 10, new Vector3(0, 0, 5));
    expect(h.toArray()).toEqual([0, 0, 1]);
  });
});

describe("gioiHanCamera", () => {
  it("mô hình tính bằng mm (lớn gấp 1000 lần) có giới hạn lớn gấp 1000 lần – không bị cắt mất", () => {
    const m = gioiHanCamera(1, 45, 1.5);
    const mm = gioiHanCamera(1000, 45, 1.5);
    expect(mm.near).toBeCloseTo(m.near * 1000, 6);
    expect(mm.far).toBeCloseTo(m.far * 1000, 3);
    expect(mm.minDistance).toBeCloseTo(m.minDistance * 1000, 6);
    expect(mm.maxDistance).toBeCloseTo(m.maxDistance * 1000, 3);
  });

  it("góc nhìn vừa khung và lúc thu nhỏ hết cỡ đều nằm giữa mặt cắt gần và xa", () => {
    for (const r of [0.001, 1, 400, 5000]) {
      const gh = gioiHanCamera(r, 45, 1.5);
      const vua = khoangCachVuaKhung(r, 45, 1.5);
      expect(gh.near).toBeLessThan(vua - r);
      expect(gh.far).toBeGreaterThan(gh.maxDistance + r);
      expect(gh.minDistance).toBeLessThan(vua);
      expect(gh.minDistance - r).toBeLessThan(0); // phóng sát vào được tới gần mặt mô hình
      expect(gh.minDistance).toBeGreaterThan(gh.near);
    }
  });
});

describe("tenPhanCuaVat", () => {
  it("đi ngược lên cha tới tên khớp sau chuẩn hóa, trả tên gốc", () => {
    const goc = new Group();
    const nhom = new Group();
    nhom.name = chuanHoaTenMesh("Vây lưng.001");
    const con = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    nhom.add(con);
    const la = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    la.name = "khong_co";
    goc.add(nhom, la);
    expect(tenPhanCuaVat(con, ["mat", "Vây lưng.001"])).toBe("Vây lưng.001");
    expect(tenPhanCuaVat(la, ["mat"])).toBeNull();
    expect(tenPhanCuaVat(null, ["mat"])).toBeNull();
  });
});
