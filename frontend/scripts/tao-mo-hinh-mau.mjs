// Sinh mô hình mẫu cho trang thử 3D: phân tử nước H2O, mỗi bộ phận một mesh có tên riêng
// (để thử chọn bộ phận ở BH01). Chạy trong frontend/: node scripts/tao-mo-hinh-mau.mjs
// Kết quả: src/assets/mo-hinh-thu/phan-tu-nuoc.v1.glb (tên có số phiên bản theo docs/quyet-dinh.md). Để trong src/
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

const glb = await new GLTFExporter().parseAsync(goc, { binary: true });
const dich = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/assets/mo-hinh-thu/phan-tu-nuoc.v1.glb",
);
mkdirSync(dirname(dich), { recursive: true });
writeFileSync(dich, Buffer.from(glb));
console.log(`Đã ghi ${dich} (${glb.byteLength} byte)`);
