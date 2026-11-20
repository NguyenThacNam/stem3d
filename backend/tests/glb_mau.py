"""Dựng file GLB mẫu ngay trong test (không đưa file nhị phân vào Git). Dùng cho test_glb.py và test API 46."""

import json
import struct
from typing import Any

CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942


def tao_glb(
    gltf: dict[str, Any],
    bin_: bytes = b"",
    *,
    magic: bytes = b"glTF",
    phien_ban: int = 2,
    lech_do_dai: int = 0,
) -> bytes:
    """Ghép header + chunk JSON (+ chunk BIN). `lech_do_dai` làm sai độ dài ghi trong header để thử file hỏng."""
    j = json.dumps(gltf).encode()
    j += b" " * (-len(j) % 4)
    bin_ += b"\0" * (-len(bin_) % 4)
    than = struct.pack("<II", len(j), CHUNK_JSON) + j
    if bin_:
        than += struct.pack("<II", len(bin_), CHUNK_BIN) + bin_
    return struct.pack("<4sII", magic, phien_ban, 12 + len(than) + lech_do_dai) + than


def gltf_mau(
    *,
    ten_node: list[str | None] | None = None,
    so_chi_so: int = 3,
    them: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Cảnh một mesh tam giác (`so_chi_so` chỉ số), mỗi tên trong `ten_node` là một node dùng mesh đó
    (None = node không tên)."""
    ten_node = ["Than_ca"] if ten_node is None else ten_node
    nodes = [{"mesh": 0} | ({"name": t} if t is not None else {}) for t in ten_node]
    gltf = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
        "accessors": [{"count": 3, "componentType": 5126, "type": "VEC3"}, {"count": so_chi_so, "componentType": 5123, "type": "SCALAR"}],
    }
    return gltf | (them or {})


def png(rong: int, cao: int) -> bytes:
    """Phần đầu ảnh PNG (đủ để đọc kích thước)."""
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", rong, cao) + b"\x08\x06\0\0\0\0\0\0\0"


def jpeg(rong: int, cao: int) -> bytes:
    app0 = b"\xff\xe0" + struct.pack(">H", 16) + b"JFIF\0" + b"\0" * 9
    sof0 = b"\xff\xc0" + struct.pack(">HBHHB", 17, 8, cao, rong, 3) + b"\0" * 9
    return b"\xff\xd8" + app0 + sof0 + b"\xff\xda\0\x02\xff\xd9"


def webp(rong: int, cao: int) -> bytes:
    """WebP dạng mở rộng (VP8X)."""
    return (b"RIFF" + struct.pack("<I", 22) + b"WEBP" + b"VP8X" + struct.pack("<I", 10) + b"\0" * 4
            + (rong - 1).to_bytes(3, "little") + (cao - 1).to_bytes(3, "little"))


def ktx2(rong: int, cao: int) -> bytes:
    return b"\xabKTX 20\xbb\r\n\x1a\n" + b"\0" * 8 + struct.pack("<II", rong, cao) + b"\0" * 8


def gltf_co_anh(*anh: bytes) -> tuple[dict[str, Any], bytes]:
    """gltf_mau() kèm các ảnh texture nằm trong chunk BIN; trả (gltf, bin)."""
    bin_, views = b"", []
    for a in anh:
        bin_ += b"\0" * (-len(bin_) % 4)
        views.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": len(a)})
        bin_ += a
    bin_ += b"\0" * (-len(bin_) % 4)
    gltf = gltf_mau(them={
        "buffers": [{"byteLength": len(bin_)}],
        "bufferViews": views,
        "images": [{"bufferView": i, "mimeType": "image/png"} for i in range(len(anh))],
    })
    return gltf, bin_
