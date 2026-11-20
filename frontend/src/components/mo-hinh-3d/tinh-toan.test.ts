import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Texture,
} from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DemKhungHinh,
  ganTenPhan,
  giaiPhong,
  KHOA_TEN_PHAN,
  khoangCachVuaKhung,
  phanTramDaTai,
  type ThamChieuGltf,
  tenPhanCua,
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

    expect(thongKeMoHinh(goc)).toEqual({ soMesh: 2, soTamGiac: 24, tenMesh: ["hop", "nap"], soKhongTen: 0 });
  });

  it("geometry không có index thì tính theo số đỉnh; mesh không tên đếm riêng, không vào danh sách tên", () => {
    const hinh = new BufferGeometry();
    hinh.setAttribute("position", new BufferAttribute(new Float32Array(9 * 3), 3));
    const goc = new Group().add(new Mesh(hinh, new MeshBasicMaterial()));

    expect(thongKeMoHinh(goc)).toEqual({ soMesh: 1, soTamGiac: 3, tenMesh: [], soKhongTen: 1 });
  });

  it("mô hình rỗng", () => {
    expect(thongKeMoHinh(new Group())).toEqual({ soMesh: 0, soTamGiac: 0, tenMesh: [], soKhongTen: 0 });
  });

  it("dùng tên phần gốc (userData) thay cho tên Three.js đã đổi; tên trùng chỉ ghi một lần", () => {
    const mat1 = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mat1.name = "Mắt_trái"; // tên Three.js đã đổi
    mat1.userData[KHOA_TEN_PHAN] = "Mắt";
    const mat2 = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mat2.name = "mesh_1";
    mat2.userData[KHOA_TEN_PHAN] = "Mắt";
    const khongTen = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    khongTen.name = "mesh_2"; // GLTFLoader tự đặt, file không có tên
    khongTen.userData[KHOA_TEN_PHAN] = "";

    const kq = thongKeMoHinh(new Group().add(mat1, mat2, khongTen));
    expect(kq.tenMesh).toEqual(["Mắt"]);
    expect(kq.soKhongTen).toBe(1);
    expect(kq.soMesh).toBe(3);
  });
});

describe("ganTenPhan", () => {
  // Dựng lại đúng cấu trúc GLTFLoader tạo ra cho từng trường hợp, kèm bảng tham chiếu (parser.associations).
  const meshMoi = () => new Mesh(new BoxGeometry(), new MeshBasicMaterial());

  it("lấy tên node GỐC (có dấu cách, dấu chấm), không lấy tên Three.js đã đổi", () => {
    const vay = meshMoi();
    vay.name = "Vây_lưng"; // GLTFLoader đổi khoảng trắng thành "_"
    const goc = new Group().add(vay);
    const thamChieu = new Map<Object3D, ThamChieuGltf>([[vay, { nodes: 0, meshes: 0 }]]);

    ganTenPhan(goc, { nodes: [{ name: "Vây lưng", mesh: 0 }], meshes: [{ name: "vay" }] }, thamChieu);
    expect(tenPhanCua(vay)).toBe("Vây lưng");
  });

  it("node không tên thì lấy tên mesh; cả hai không tên (hoặc toàn khoảng trắng) thì là phần không tên", () => {
    const mat = meshMoi();
    mat.name = "Mắt";
    const khongTen = meshMoi();
    khongTen.name = "mesh_1";
    const goc = new Group().add(mat, khongTen);
    const thamChieu = new Map<Object3D, ThamChieuGltf>([
      [mat, { nodes: 0, meshes: 0 }],
      [khongTen, { nodes: 1, meshes: 1 }],
    ]);

    ganTenPhan(
      goc,
      { nodes: [{ mesh: 0 }, { name: "   ", mesh: 1 }], meshes: [{ name: "Mắt" }, {}] },
      thamChieu,
    );
    expect(tenPhanCua(mat)).toBe("Mắt");
    expect(tenPhanCua(khongTen)).toBe("");
    expect(thongKeMoHinh(goc).soKhongTen).toBe(1);
  });

  it("mesh nhiều primitive: mọi Mesh con của node mang tên node; node con giữ tên riêng", () => {
    const p0 = meshMoi();
    const p1 = meshMoi();
    const nodeCon = meshMoi();
    const nhom = new Group().add(p0, p1, nodeCon); // GLTFLoader: Group cho node, primitive là Mesh con
    const thamChieu = new Map<Object3D, ThamChieuGltf>([
      [nhom, { nodes: 0, meshes: 0 }],
      [p0, { meshes: 0 }],
      [p1, { meshes: 0 }],
      [nodeCon, { nodes: 1, meshes: 1 }],
    ]);

    ganTenPhan(
      new Group().add(nhom),
      {
        nodes: [
          { name: "Thân", mesh: 0 },
          { name: "Đuôi", mesh: 1 },
        ],
        meshes: [{}, {}],
      },
      thamChieu,
    );
    expect([tenPhanCua(p0), tenPhanCua(p1), tenPhanCua(nodeCon)]).toEqual(["Thân", "Thân", "Đuôi"]);
  });

  it("node không có mesh (chỉ để nhóm) không gán tên cho gì", () => {
    const con = meshMoi();
    con.name = "con";
    const nhom = new Group().add(con);
    ganTenPhan(new Group().add(nhom), { nodes: [{ name: "Nhóm" }] }, new Map([[nhom, { nodes: 0 }]]));
    expect(con.userData[KHOA_TEN_PHAN]).toBeUndefined();
    expect(tenPhanCua(con)).toBe("con"); // chưa gán thì dùng name (mô hình tự dựng bằng code)
  });

  it("node không tên có mesh nhiều primitive: một phần không tên (như máy chủ), không phải số primitive", () => {
    const p0 = meshMoi();
    const p1 = meshMoi();
    const p2 = meshMoi();
    const nhom = new Group().add(p0, p1, p2);
    const goc = new Group().add(nhom);
    ganTenPhan(
      goc,
      { nodes: [{ mesh: 0 }], meshes: [{}] },
      new Map<Object3D, ThamChieuGltf>([
        [nhom, { nodes: 0, meshes: 0 }],
        [p0, { meshes: 0 }],
        [p1, { meshes: 0 }],
        [p2, { meshes: 0 }],
      ]),
    );
    expect(thongKeMoHinh(goc)).toMatchObject({ soMesh: 3, tenMesh: [], soKhongTen: 1 });
  });

  it("phần là điểm (Points) hoặc đường (Line) cũng có tên gốc, có trong danh sách tên như máy chủ", () => {
    const duongSuc = new LineSegments(new BufferGeometry(), new LineBasicMaterial());
    duongSuc.name = "Đường_sức_từ";
    const hat = new Points(new BufferGeometry(), new PointsMaterial());
    const goc = new Group().add(duongSuc, hat);
    ganTenPhan(
      goc,
      { nodes: [{ name: "Đường sức từ", mesh: 0 }, { mesh: 1 }], meshes: [{}, { name: "Hạt" }] },
      new Map<Object3D, ThamChieuGltf>([
        [duongSuc, { nodes: 0, meshes: 0 }],
        [hat, { nodes: 1, meshes: 1 }],
      ]),
    );
    expect(thongKeMoHinh(goc)).toMatchObject({ soMesh: 0, tenMesh: ["Đường sức từ", "Hạt"], soKhongTen: 0 });
  });

  it("node vừa có camera vừa có mesh nhiều primitive (GLTFLoader bọc thêm một Group): Mesh cấp cháu vẫn có tên", () => {
    const p0 = meshMoi();
    const p1 = meshMoi();
    const boc = new Group().add(p0, p1); // Group các primitive, không có tham chiếu node
    const node = new Group().add(boc);
    ganTenPhan(
      new Group().add(node),
      { nodes: [{ name: "Ống kính", mesh: 0 }], meshes: [{}] },
      new Map<Object3D, ThamChieuGltf>([
        [node, { nodes: 0 }],
        [p0, { meshes: 0 }],
        [p1, { meshes: 0 }],
      ]),
    );
    expect([tenPhanCua(p0), tenPhanCua(p1)]).toEqual(["Ống kính", "Ống kính"]);
  });
});

describe("giaiPhong", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("đóng ImageBitmap của texture (dispose() không tự giải phóng ảnh đã giải mã)", () => {
    class AnhGia {
      close = vi.fn();
    }
    vi.stubGlobal("ImageBitmap", AnhGia);
    const anh = new AnhGia();
    const texture = new Texture(anh as unknown as ImageBitmap);
    giaiPhong(new Group().add(new Mesh(new BoxGeometry(), new MeshStandardMaterial({ map: texture }))));
    expect(anh.close).toHaveBeenCalledTimes(1);
  });

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
