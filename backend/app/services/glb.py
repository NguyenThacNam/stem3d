"""Đọc file GLB (glTF 2.0 dạng nhị phân) để kiểm tra mô hình khi nạp (UC 21, API 46).

Chỉ dùng thư viện chuẩn. File do người dùng gửi lên nên đọc thận trọng: mọi chỗ sai cấu trúc đều thành
`GlbKhongHopLe` (API trả 422 INVALID_GLB), không để lọt lỗi 500. Đọc từ file đang mở (seek), không nạp cả
file 150 MB vào bộ nhớ: chỉ đọc phần JSON và các ảnh texture.

Chỉ số rút ra (Bảng 3-11):
- `triangle_count`: số tam giác thực sự được vẽ trong cảnh mặc định – mesh dùng ở nhiều node tính nhiều lần.
- `max_texture_px`: cạnh lớn nhất trong các ảnh texture (PNG, JPEG, WebP, KTX2); None khi không có ảnh.
- `mesh_names`: tên các phần có hình (node có mesh), theo thứ tự trong cây, không trùng. Lấy như Three.js đặt
  tên đối tượng: tên node, node không tên thì lấy tên mesh. Đây là tên thấy được khi bấm vào một phần của mô hình
  để gắn nhãn. (Three.js còn đổi khoảng trắng thành "_" và bỏ ký tự []:./ – phía hiển thị phải so cùng cách.)
- `unnamed_meshes`: số phần có hình mà cả node lẫn mesh đều không có tên (không gắn nhãn được).

Không kiểm tra dữ liệu hình học (đỉnh, chỉ số) có khớp bộ đệm hay không: việc đó do bản xem trước 3D phát hiện.
"""

import base64
import json
import struct
from dataclasses import dataclass
from typing import Any, BinaryIO

MAGIC = b"glTF"
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
DO_DAI_DAU_FILE = 12
DO_DAI_DAU_CHUNK = 8

# mode của primitive (glTF 2.0): 0–3 điểm / đường, 4 tam giác, 5 dải tam giác, 6 quạt tam giác.
MODE_TAM_GIAC = 4
MODE_DAI_VA_QUAT = (5, 6)
MODE_KHONG_PHAI_TAM_GIAC = (0, 1, 2, 3)

PNG = b"\x89PNG\r\n\x1a\n"
KTX2 = b"\xabKTX 20\xbb\r\n\x1a\n"
# Các marker SOF của JPEG chứa kích thước ảnh (C4, C8, CC là marker khác).
JPEG_SOF = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}

LOI_CAU_TRUC = "Cấu trúc file GLB không hợp lệ, hãy xuất lại mô hình từ phần mềm dựng 3D"
LOI_FILE_NGOAI = "Mô hình tham chiếu file bên ngoài, hãy xuất lại thành một file GLB đầy đủ (gồm cả texture)"


class GlbKhongHopLe(Exception):
    """File không phải GLB hợp lệ. Câu báo lỗi (tiếng Việt) không chứa dữ liệu lấy từ file."""


@dataclass(frozen=True)
class BaoCaoGlb:
    triangle_count: int
    max_texture_px: int | None
    mesh_names: list[str]
    unnamed_meshes: int


def doc_glb(f: BinaryIO) -> BaoCaoGlb:
    """Đọc file GLB đang mở (chế độ nhị phân, seek được). Sai cấu trúc → GlbKhongHopLe."""
    try:
        return _doc(f)
    except GlbKhongHopLe:
        raise
    except (
        KeyError, TypeError, ValueError, IndexError, AttributeError, struct.error, OverflowError, RecursionError
    ) as e:
        # ValueError gồm cả lỗi JSON, lỗi mã UTF-8, lỗi base64; RecursionError: JSON lồng quá sâu.
        raise GlbKhongHopLe(LOI_CAU_TRUC) from e


# ---------------------------------------------------------------- khung file
def _doc(f: BinaryIO) -> BaoCaoGlb:
    f.seek(0, 2)
    kich_thuoc = f.tell()
    f.seek(0)
    dau = f.read(DO_DAI_DAU_FILE)
    if len(dau) < DO_DAI_DAU_FILE or dau[:4] != MAGIC:
        raise GlbKhongHopLe("File không phải định dạng GLB, hãy chọn file .glb")
    _, phien_ban, do_dai = struct.unpack("<4sII", dau)
    if phien_ban != 2:
        raise GlbKhongHopLe("Chỉ nhận GLB phiên bản 2 (glTF 2.0), hãy xuất lại mô hình")
    if do_dai != kich_thuoc:
        raise GlbKhongHopLe("File GLB bị thiếu hoặc thừa dữ liệu, hãy tải lên lại")

    do_dai_json, loai = _dau_chunk(f, DO_DAI_DAU_FILE, kich_thuoc)
    if loai != CHUNK_JSON:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    gltf = json.loads(f.read(do_dai_json).decode("utf-8"))
    if not isinstance(gltf, dict):
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    phien_ban_asset = gltf["asset"]["version"]
    if not isinstance(phien_ban_asset, str) or not phien_ban_asset.startswith("2."):
        raise GlbKhongHopLe("Chỉ nhận GLB phiên bản 2 (glTF 2.0), hãy xuất lại mô hình")

    # Chunk BIN (tùy chọn) ngay sau chunk JSON: (vị trí trong file, độ dài).
    vi_tri_bin = DO_DAI_DAU_FILE + DO_DAI_DAU_CHUNK + do_dai_json
    phan_bin: tuple[int, int] | None = None
    if vi_tri_bin < kich_thuoc:
        do_dai_bin, loai = _dau_chunk(f, vi_tri_bin, kich_thuoc)
        if loai == CHUNK_BIN:
            phan_bin = (vi_tri_bin + DO_DAI_DAU_CHUNK, do_dai_bin)

    for buffer in _ds(gltf, "buffers"):
        uri = buffer.get("uri")
        if uri is not None and not (isinstance(uri, str) and uri.startswith("data:")):
            raise GlbKhongHopLe(LOI_FILE_NGOAI)

    so_tam_giac, ten_mesh, khong_ten = _dem_mesh(gltf)
    return BaoCaoGlb(
        triangle_count=so_tam_giac,
        max_texture_px=_texture_lon_nhat(gltf, f, phan_bin),
        mesh_names=ten_mesh,
        unnamed_meshes=khong_ten,
    )


def _dau_chunk(f: BinaryIO, vi_tri: int, kich_thuoc: int) -> tuple[int, int]:
    f.seek(vi_tri)
    dau = f.read(DO_DAI_DAU_CHUNK)
    if len(dau) < DO_DAI_DAU_CHUNK:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    do_dai, loai = struct.unpack("<II", dau)
    if vi_tri + DO_DAI_DAU_CHUNK + do_dai > kich_thuoc:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return do_dai, loai


def _ds(gltf: dict[str, Any], khoa: str) -> list[dict[str, Any]]:
    """Mảng cấp cao nhất (nodes, meshes…); vắng thì rỗng; phần tử phải là object."""
    gia_tri = gltf.get(khoa, [])
    if not isinstance(gia_tri, list) or not all(isinstance(x, dict) for x in gia_tri):
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return gia_tri


def _so(x: Any, gioi_han: int | None = None) -> int:
    """Số nguyên không âm (không nhận bool); có `gioi_han` thì là chỉ số trong mảng dài `gioi_han`."""
    if not isinstance(x, int) or isinstance(x, bool) or x < 0 or (gioi_han is not None and x >= gioi_han):
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return x


# ---------------------------------------------------------------- mesh, tam giác
def _dem_mesh(gltf: dict[str, Any]) -> tuple[int, list[str], int]:
    nodes, meshes, accessors = _ds(gltf, "nodes"), _ds(gltf, "meshes"), _ds(gltf, "accessors")
    tam_giac_moi_mesh = [_tam_giac_cua_mesh(m, accessors) for m in meshes]
    tong, ten, da_co, khong_ten = 0, [], set(), 0
    for i in _node_duoc_ve(gltf, nodes):
        node = nodes[i]
        if "mesh" not in node:
            continue
        so_mesh = _so(node["mesh"], len(meshes))
        tong += tam_giac_moi_mesh[so_mesh]
        ten_phan = _ten(node) or _ten(meshes[so_mesh])
        if ten_phan is None:
            khong_ten += 1
        elif ten_phan not in da_co:
            da_co.add(ten_phan)
            ten.append(ten_phan)
    return tong, ten, khong_ten


def _ten(doi_tuong: dict[str, Any]) -> str | None:
    """Tên node / mesh; vắng, rỗng hoặc toàn khoảng trắng → None. Tên sai kiểu → file hỏng."""
    ten = doi_tuong.get("name")
    if ten is not None and not isinstance(ten, str):
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return ten if ten and ten.strip() else None


def _node_duoc_ve(gltf: dict[str, Any], nodes: list[dict[str, Any]]) -> list[int]:
    """Các node trong cảnh mặc định, duyệt theo thứ tự cây (cha trước con). Không có cảnh nào thì lấy mọi node."""
    scenes = _ds(gltf, "scenes")
    if scenes:
        canh = scenes[_so(gltf.get("scene", 0), len(scenes))]
        goc = canh.get("nodes", [])
    else:
        goc = list(range(len(nodes)))
    if not isinstance(goc, list):
        raise GlbKhongHopLe(LOI_CAU_TRUC)

    ket_qua, da_gap = [], set()
    ngan_xep = [_so(i, len(nodes)) for i in reversed(goc)]
    while ngan_xep:
        i = ngan_xep.pop()
        # glTF yêu cầu cây: một node chỉ có một cha. Gặp lại nghĩa là vòng lặp hoặc dùng chung → từ chối.
        if i in da_gap:
            raise GlbKhongHopLe(LOI_CAU_TRUC)
        da_gap.add(i)
        ket_qua.append(i)
        con = nodes[i].get("children", [])
        if not isinstance(con, list):
            raise GlbKhongHopLe(LOI_CAU_TRUC)
        ngan_xep.extend(_so(c, len(nodes)) for c in reversed(con))
    return ket_qua


def _tam_giac_cua_mesh(mesh: dict[str, Any], accessors: list[dict[str, Any]]) -> int:
    primitives = mesh["primitives"]
    if not isinstance(primitives, list) or not primitives:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    tong = 0
    for p in primitives:
        mode = _so(p.get("mode", MODE_TAM_GIAC))
        # Có chỉ số (indices) thì đếm theo chỉ số, không thì theo số đỉnh.
        accessor = p["indices"] if "indices" in p else p["attributes"]["POSITION"]
        so_luong = _so(accessors[_so(accessor, len(accessors))]["count"])
        if mode == MODE_TAM_GIAC:
            tong += so_luong // 3
        elif mode in MODE_DAI_VA_QUAT:
            tong += max(so_luong - 2, 0)
        elif mode not in MODE_KHONG_PHAI_TAM_GIAC:
            raise GlbKhongHopLe(LOI_CAU_TRUC)
    return tong


# ---------------------------------------------------------------- texture
def _texture_lon_nhat(gltf: dict[str, Any], f: BinaryIO, phan_bin: tuple[int, int] | None) -> int | None:
    lon_nhat = None
    for anh in _ds(gltf, "images"):
        rong, cao = kich_thuoc_anh(_byte_anh(anh, gltf, f, phan_bin))
        lon_nhat = max(lon_nhat or 0, rong, cao)
    return lon_nhat


def _byte_anh(anh: dict[str, Any], gltf: dict[str, Any], f: BinaryIO, phan_bin: tuple[int, int] | None) -> bytes:
    if "uri" in anh:
        return _giai_data_uri(anh["uri"])
    view = _ds(gltf, "bufferViews")[_so(anh["bufferView"], len(_ds(gltf, "bufferViews")))]
    buffers = _ds(gltf, "buffers")
    so_buffer = _so(view["buffer"], len(buffers))
    bat_dau, do_dai = _so(view.get("byteOffset", 0)), _so(view["byteLength"])
    buffer = buffers[so_buffer]
    if "uri" in buffer:
        du_lieu = _giai_data_uri(buffer["uri"])
        if bat_dau + do_dai > len(du_lieu):
            raise GlbKhongHopLe(LOI_CAU_TRUC)
        return du_lieu[bat_dau : bat_dau + do_dai]
    # Buffer không có uri: chỉ buffer 0 trỏ tới chunk BIN của file GLB.
    if so_buffer != 0 or phan_bin is None or bat_dau + do_dai > phan_bin[1]:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    f.seek(phan_bin[0] + bat_dau)
    return f.read(do_dai)


def _giai_data_uri(uri: Any) -> bytes:
    if not isinstance(uri, str) or not uri.startswith("data:"):
        raise GlbKhongHopLe(LOI_FILE_NGOAI)
    dau, _, noi_dung = uri.partition(",")
    if not dau.endswith(";base64"):
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return base64.b64decode(noi_dung, validate=True)


def kich_thuoc_anh(b: bytes) -> tuple[int, int]:
    """(rộng, cao) của ảnh PNG, JPEG, WebP, KTX2 – chỉ đọc phần đầu ảnh, không giải mã."""
    if b[:8] == PNG and b[12:16] == b"IHDR":
        rong, cao = struct.unpack(">II", b[16:24])
    elif b[:2] == b"\xff\xd8":
        rong, cao = _kich_thuoc_jpeg(b)
    elif b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        rong, cao = _kich_thuoc_webp(b)
    elif b[:12] == KTX2:
        rong, cao = struct.unpack("<II", b[20:28])
    else:
        raise GlbKhongHopLe("Texture có định dạng không đọc được, chỉ nhận PNG, JPEG, WebP hoặc KTX2")
    if rong <= 0 or cao <= 0:
        raise GlbKhongHopLe(LOI_CAU_TRUC)
    return rong, cao


def _kich_thuoc_jpeg(b: bytes) -> tuple[int, int]:
    i = 2
    while i + 4 <= len(b):
        if b[i] != 0xFF:
            raise GlbKhongHopLe(LOI_CAU_TRUC)
        marker = b[i + 1]
        if marker == 0xFF:  # byte đệm
            i += 1
            continue
        if marker == 0x01 or 0xD0 <= marker <= 0xD7:  # marker không có độ dài
            i += 2
            continue
        if marker in (0xD9, 0xDA):  # hết ảnh / bắt đầu dữ liệu mà chưa gặp SOF
            break
        (do_dai,) = struct.unpack(">H", b[i + 2 : i + 4])
        if marker in JPEG_SOF:
            cao, rong = struct.unpack(">HH", b[i + 5 : i + 9])
            return rong, cao
        i += 2 + do_dai
    raise GlbKhongHopLe(LOI_CAU_TRUC)


def _kich_thuoc_webp(b: bytes) -> tuple[int, int]:
    loai = b[12:16]
    if loai == b"VP8X":
        return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
    if loai == b"VP8L" and b[20:21] == b"\x2f":
        bit = int.from_bytes(b[21:25], "little")
        return (bit & 0x3FFF) + 1, ((bit >> 14) & 0x3FFF) + 1
    if loai == b"VP8 " and b[23:26] == b"\x9d\x01\x2a":
        return int.from_bytes(b[26:28], "little") & 0x3FFF, int.from_bytes(b[28:30], "little") & 0x3FFF
    raise GlbKhongHopLe(LOI_CAU_TRUC)
