// Sinh mô hình mẫu cho trang thử 3D (NT08) và khung bài học (BH01). Chạy trong frontend/: node scripts/tao-mo-hinh-mau.mjs
// - phan-tu-nuoc.v1.glb: phân tử nước H2O, 5 mesh có tên riêng (bộ phận "Nguyên tử hydro" gộp 2 mesh).
// - kinh-hien-vi.v1.glb: kính hiển vi quang học, 8 bộ phận / 11 mesh – để thử xếp thẻ chú thích. Có nút tên chứa
//   khoảng trắng ("than kinh", Three.js đổi thành "than_kinh") và nút nhóm nhiều mesh, để thử so khớp tên mesh.
// Kết quả trong src/assets/mo-hinh-thu/ (tên có số phiên bản theo docs/quyet-dinh.md). Để trong src/
// (không phải public/) để file chỉ vào bản build khi có trang import nó – trang thử chỉ có ở bản dev.
// Chạy lại cho ra cùng một file (không có dữ liệu ngẫu nhiên, không ghi thời gian).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter dùng FileReader của trình duyệt; Node không có nên thay bằng bản tối thiểu.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
};

const GOC_HOH = (104.5 * Math.PI) / 180; // góc liên kết H–O–H
const DO_DAI = 1.6; // khoảng cách tâm O đến tâm H (đơn vị tùy ý)

function vatLieu(ten, mau) {
  return new THREE.MeshStandardMaterial({ name: ten, color: mau, roughness: 0.55, metalness: 0 });
}

const oxy = vatLieu("oxy", 0xd0463b);
const hydro = vatLieu("hydro", 0xeeeeea);
const lienKet = vatLieu("lien_ket", 0x9aa09d);

const goc = new THREE.Group();
goc.name = "phan_tu_nuoc";

const O = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 16), oxy);
O.name = "nguyen_tu_O";
goc.add(O);

[-1, 1].forEach((dau, i) => {
  const huong = new THREE.Vector3(Math.sin(GOC_HOH / 2) * dau, -Math.cos(GOC_HOH / 2), 0);
  const H = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 12), hydro);
  H.name = `nguyen_tu_H_${i + 1}`;
  H.position.copy(huong).multiplyScalar(DO_DAI);
  goc.add(H);

  const que = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, DO_DAI, 16), lienKet);
  que.name = `lien_ket_${i + 1}`;
  que.position.copy(huong).multiplyScalar(DO_DAI / 2);
  que.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), huong);
  goc.add(que);
});

// ---------------------------------------------------------------- Kính hiển vi quang học (trục y hướng lên)
const kinh = new THREE.Group();
kinh.name = "kinh_hien_vi";

function khoi(ten, hinh, mau, x, y, z = 0) {
  const m = new THREE.Mesh(hinh, vatLieu(ten, mau));
  m.name = ten;
  m.position.set(x, y, z);
  return m;
}

const XAM_DAM = 0x3c4240;
kinh.add(khoi("chan_kinh", new THREE.BoxGeometry(2.4, 0.3, 1.6), XAM_DAM, 0, 0.15));
const than = new THREE.Group();
than.name = "than kinh"; // có khoảng trắng: Three.js đặt tên "than_kinh"
than.add(khoi("than_duoi", new THREE.BoxGeometry(0.45, 2.6, 0.55), XAM_DAM, -0.75, 1.6));
than.add(khoi("than_tren", new THREE.BoxGeometry(0.9, 0.35, 0.5), XAM_DAM, -0.35, 2.95));
kinh.add(than);
kinh.add(khoi("ban_kinh", new THREE.BoxGeometry(1.4, 0.12, 1.2), 0x5b6260, 0.2, 1.5));
kinh.add(khoi("den", new THREE.CylinderGeometry(0.22, 0.28, 0.25, 24), 0xe8d9a0, 0.2, 0.43));
kinh.add(khoi("ong_kinh", new THREE.CylinderGeometry(0.28, 0.28, 1.4, 24), 0xd5d8d6, 0.2, 3.05));
kinh.add(khoi("thi_kinh", new THREE.CylinderGeometry(0.2, 0.2, 0.5, 24), 0x2a2d2c, 0.2, 4.0));
kinh.add(khoi("vat_kinh_1", new THREE.CylinderGeometry(0.1, 0.12, 0.45, 16), 0xb9bdbb, 0.05, 2.12));
kinh.add(khoi("vat_kinh_2", new THREE.CylinderGeometry(0.1, 0.12, 0.45, 16), 0xb9bdbb, 0.35, 2.12));
for (const [ben, z] of [
  ["trai", 0.42],
  ["phai", -0.42],
]) {
  const oc = khoi(
    `oc_dieu_chinh_${ben}`,
    new THREE.CylinderGeometry(0.25, 0.25, 0.15, 24),
    0x6b7270,
    -0.75,
    1.9,
    z,
  );
  oc.rotation.x = Math.PI / 2;
  kinh.add(oc);
}

async function xuat(goc, tenFile) {
  const glb = await new GLTFExporter().parseAsync(goc, { binary: true });
  const dich = resolve(dirname(fileURLToPath(import.meta.url)), "../src/assets/mo-hinh-thu", tenFile);
  mkdirSync(dirname(dich), { recursive: true });
  writeFileSync(dich, Buffer.from(glb));
  console.log(`Đã ghi ${dich} (${glb.byteLength} byte)`);
}

await xuat(goc, "phan-tu-nuoc.v1.glb");
await xuat(kinh, "kinh-hien-vi.v1.glb");
