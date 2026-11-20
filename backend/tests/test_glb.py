"""Bộ đọc GLB (app/services/glb.py): chỉ số kiểm tra mô hình khi nạp (API 46) và từ chối file hỏng."""

import base64
import io
import struct

import pytest

from app.services.glb import BaoCaoGlb, GlbKhongHopLe, LOI_FILE_NGOAI, doc_glb, kich_thuoc_anh
from tests.glb_mau import gltf_co_anh, gltf_mau, jpeg, ktx2, png, tao_glb, webp


def doc(du_lieu: bytes) -> BaoCaoGlb:
    return doc_glb(io.BytesIO(du_lieu))


def loi(du_lieu: bytes) -> str:
    with pytest.raises(GlbKhongHopLe) as e:
        doc(du_lieu)
    return str(e.value)


# ---------------------------------------------------------------- đọc đúng
def test_mo_hinh_don_gian() -> None:
    bao_cao = doc(tao_glb(gltf_mau(so_chi_so=6)))
    assert bao_cao == BaoCaoGlb(triangle_count=2, max_texture_px=None, mesh_names=["Than_ca"], unnamed_meshes=0)


def test_khong_co_indices_thi_dem_theo_so_dinh() -> None:
    gltf = gltf_mau()
    gltf["meshes"] = [{"primitives": [{"attributes": {"POSITION": 0}}]}]
    gltf["accessors"][0]["count"] = 9
    assert doc(tao_glb(gltf)).triangle_count == 3


def test_mesh_dung_o_nhieu_node_tinh_nhieu_lan() -> None:
    bao_cao = doc(tao_glb(gltf_mau(ten_node=["Mat_trai", "Mat_phai"], so_chi_so=30)))
    assert bao_cao.triangle_count == 20
    assert bao_cao.mesh_names == ["Mat_trai", "Mat_phai"]


@pytest.mark.parametrize(("mode", "tam_giac"), [(4, 3), (5, 7), (6, 7), (0, 0), (1, 0), (3, 0)])
def test_cac_mode_ve(mode: int, tam_giac: int) -> None:
    gltf = gltf_mau(so_chi_so=9)
    gltf["meshes"][0]["primitives"][0]["mode"] = mode
    assert doc(tao_glb(gltf)).triangle_count == tam_giac


def test_node_khong_ten_va_ten_trung() -> None:
    bao_cao = doc(tao_glb(gltf_mau(ten_node=["Vay", None, "  ", "Vay"])))
    assert bao_cao.mesh_names == ["Vay"]
    assert bao_cao.unnamed_meshes == 2
    assert bao_cao.triangle_count == 4


def test_node_khong_ten_thi_lay_ten_mesh() -> None:
    # Giống Duck.glb mẫu của Khronos: node không tên, mesh tên "LOD3spShape" – Three.js đặt tên đối tượng theo mesh.
    gltf = gltf_mau(ten_node=[None, "Mo"])
    gltf["meshes"][0]["name"] = "LOD3spShape"
    bao_cao = doc(tao_glb(gltf))
    assert bao_cao.mesh_names == ["LOD3spShape", "Mo"]
    assert bao_cao.unnamed_meshes == 0


def test_ten_sai_kieu() -> None:
    loi(tao_glb(gltf_mau(them={"nodes": [{"mesh": 0, "name": 5}]})))


def test_duyet_node_con_theo_thu_tu_cay() -> None:
    gltf = gltf_mau(them={
        "scenes": [{"nodes": [0]}],
        "nodes": [
            {"name": "Ca", "children": [1, 2]},
            {"name": "Dau", "mesh": 0, "children": [3]},
            {"name": "Duoi", "mesh": 0},
            {"name": "Mat", "mesh": 0},
        ],
    })
    bao_cao = doc(tao_glb(gltf))
    assert bao_cao.mesh_names == ["Dau", "Mat", "Duoi"]
    assert bao_cao.triangle_count == 3


def test_chi_tinh_canh_mac_dinh() -> None:
    gltf = gltf_mau(ten_node=["Canh_0", "Canh_1"], them={"scene": 1})
    gltf["scenes"] = [{"nodes": [0]}, {"nodes": [1]}]
    assert doc(tao_glb(gltf)).mesh_names == ["Canh_1"]


def test_khong_co_canh_thi_lay_moi_node() -> None:
    gltf = gltf_mau(ten_node=["A", "B"])
    del gltf["scenes"], gltf["scene"]
    assert doc(tao_glb(gltf)).mesh_names == ["A", "B"]


def test_texture_lay_canh_lon_nhat() -> None:
    gltf, bin_ = gltf_co_anh(png(1024, 512), jpeg(800, 2048), webp(300, 100), ktx2(4096, 4096))
    assert doc(tao_glb(gltf, bin_)).max_texture_px == 4096


def test_texture_trong_data_uri() -> None:
    uri = "data:image/png;base64," + base64.b64encode(png(512, 2048)).decode()
    assert doc(tao_glb(gltf_mau(them={"images": [{"uri": uri}]}))).max_texture_px == 2048


@pytest.mark.parametrize(
    ("anh", "kich_thuoc"),
    [(png(7, 9), (7, 9)), (jpeg(640, 480), (640, 480)), (webp(16384, 1), (16384, 1)), (ktx2(256, 128), (256, 128))],
)
def test_kich_thuoc_anh(anh: bytes, kich_thuoc: tuple[int, int]) -> None:
    assert kich_thuoc_anh(anh) == kich_thuoc


def test_webp_vp8l_va_vp8() -> None:
    bit = (99 - 1) | ((50 - 1) << 14)
    vp8l = b"RIFF" + b"\0" * 4 + b"WEBPVP8L" + b"\0" * 4 + b"\x2f" + bit.to_bytes(4, "little")
    assert kich_thuoc_anh(vp8l) == (99, 50)
    vp8 = b"RIFF" + b"\0" * 4 + b"WEBPVP8 " + b"\0" * 4 + b"\0" * 3 + b"\x9d\x01\x2a" + struct.pack("<HH", 320, 240)
    assert kich_thuoc_anh(vp8) == (320, 240)


# ---------------------------------------------------------------- từ chối file hỏng
@pytest.mark.parametrize(
    "du_lieu",
    [b"", b"glTF", b"PK\x03\x04" + b"\0" * 40, tao_glb(gltf_mau(), magic=b"GLTF")],
    ids=["rong", "qua-ngan", "file-zip", "sai-magic"],
)
def test_khong_phai_glb(du_lieu: bytes) -> None:
    assert "không phải định dạng GLB" in loi(du_lieu)


def test_sai_phien_ban() -> None:
    assert "phiên bản 2" in loi(tao_glb(gltf_mau(), phien_ban=1))
    assert "phiên bản 2" in loi(tao_glb(gltf_mau(them={"asset": {"version": "1.0"}})))


@pytest.mark.parametrize("lech", [-4, 4])
def test_do_dai_khong_khop(lech: int) -> None:
    assert "thiếu hoặc thừa" in loi(tao_glb(gltf_mau(), lech_do_dai=lech))


def test_file_bi_cat_cut() -> None:
    du_lieu = tao_glb(gltf_mau())
    cut = du_lieu[:-8]
    # Sửa độ dài trong header cho khớp phần còn lại: chunk JSON khai báo dài hơn phần có thật.
    cut = cut[:8] + struct.pack("<I", len(cut)) + cut[12:]
    loi(cut)


def test_json_hong() -> None:
    j = b'{"asset": {"version": "2.0"' + b" "
    du_lieu = struct.pack("<II", len(j), 0x4E4F534A) + j
    loi(struct.pack("<4sII", b"glTF", 2, 12 + len(du_lieu)) + du_lieu)


def test_json_long_qua_sau() -> None:
    j = b"[" * 100_000 + b"]" * 100_000
    du_lieu = struct.pack("<II", len(j), 0x4E4F534A) + j
    loi(struct.pack("<4sII", b"glTF", 2, 12 + len(du_lieu)) + du_lieu)


@pytest.mark.parametrize(
    "sua",
    [
        lambda g: g.__setitem__("nodes", [{"mesh": 5}]),
        lambda g: g.__setitem__("nodes", [{"mesh": True}]),
        lambda g: g["meshes"][0]["primitives"][0].__setitem__("indices", 9),
        lambda g: g["accessors"][1].__setitem__("count", -3),
        lambda g: g["accessors"][1].__setitem__("count", "3"),
        lambda g: g["meshes"][0].__setitem__("primitives", []),
        lambda g: g["meshes"][0]["primitives"][0].__setitem__("mode", 7),
        lambda g: g.__setitem__("scene", 3),
        lambda g: g.__setitem__("nodes", "khong-phai-mang"),
        lambda g: g.__delitem__("asset"),
    ],
    ids=["mesh-ngoai-mang", "mesh-bool", "indices-ngoai-mang", "count-am", "count-chuoi", "khong-primitive",
         "mode-la", "scene-ngoai-mang", "nodes-sai-kieu", "thieu-asset"],
)
def test_cau_truc_sai(sua) -> None:  # type: ignore[no-untyped-def]
    gltf = gltf_mau()
    sua(gltf)
    assert "Cấu trúc file GLB không hợp lệ" in loi(tao_glb(gltf))


@pytest.mark.parametrize(
    "children",
    [[[0]], [[1], [0]], [[1], []]],
    ids=["tu-tro-chinh-no", "vong-hai-node", "node-hai-cha"],
)
def test_cay_node_lap(children: list[list[int]]) -> None:
    nodes = [{"name": f"N{i}", "mesh": 0, "children": c} for i, c in enumerate(children)]
    goc = [0, 1] if children == [[1], []] else [0]
    loi(tao_glb(gltf_mau(them={"nodes": nodes, "scenes": [{"nodes": goc}]})))


def test_tham_chieu_file_ngoai() -> None:
    assert loi(tao_glb(gltf_mau(them={"buffers": [{"uri": "ca-chep.bin", "byteLength": 4}]}))) == LOI_FILE_NGOAI
    assert loi(tao_glb(gltf_mau(them={"images": [{"uri": "vay.png"}]}))) == LOI_FILE_NGOAI


def test_texture_dinh_dang_la() -> None:
    gltf, bin_ = gltf_co_anh(b"GIF89a" + b"\0" * 20)
    assert "PNG, JPEG, WebP hoặc KTX2" in loi(tao_glb(gltf, bin_))


def test_texture_vuot_ra_ngoai_chunk_bin() -> None:
    gltf, bin_ = gltf_co_anh(png(8, 8))
    gltf["bufferViews"][0]["byteLength"] = len(bin_) + 100
    loi(tao_glb(gltf, bin_))


def test_texture_tro_buffer_khong_ton_tai_bin() -> None:
    gltf, _ = gltf_co_anh(png(8, 8))
    loi(tao_glb(gltf))  # không có chunk BIN


def test_data_uri_base64_hong() -> None:
    loi(tao_glb(gltf_mau(them={"images": [{"uri": "data:image/png;base64,@@@"}]})))


def test_cau_bao_loi_khong_chua_du_lieu_trong_file() -> None:
    gltf = gltf_mau(ten_node=["<script>BI_MAT</script>"])
    gltf["accessors"][1]["count"] = "BI_MAT"
    assert "BI_MAT" not in loi(tao_glb(gltf))
