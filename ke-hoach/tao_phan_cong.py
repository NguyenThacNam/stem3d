# -*- coding: utf-8 -*-
"""Sinh file Excel phân công công việc từ TIEN_DO.md và kế hoạch gốc.

Chạy (ở bất kỳ thư mục nào):  python ke-hoach/tao_phan_cong.py
Ra:  ke-hoach/Phan_cong_cong_viec.xlsx
Cần:  Python 3.10+, openpyxl 3.1.5 (pip install openpyxl==3.1.5 – ghim phiên bản vì bản khác có thể ghi XML khác)

Nguồn dữ liệu (KHÔNG nhập tay trạng thái vào Excel):
- TIEN_DO.md mục 2  – mã, trạng thái, commit, ghi chú của 45 việc
- TIEN_DO.md mục 9  – thứ tự nên làm, API, màn hình, nhánh gợi ý, cần xong trước (điều chỉnh), xuyên suốt,
                      phần việc khi tách đôi, điều chỉnh so với kế hoạch
- TIEN_DO.md mục 10 – các chỗ hai dev phải phối hợp
- docs/Ke_hoach_trien_khai_chuc_nang.xlsx – tên việc, người làm, ai dùng, cần xong trước, mức, giai đoạn

Không sửa tay file Excel. Đổi gì thì sửa TIEN_DO.md rồi chạy lại script. Excel bị xung đột khi gộp nhánh
thì chạy lại script trên nhánh đã gộp. Cùng nội dung TIEN_DO.md thì file ra giống hệt từng byte.
"""

import io
import re
import sys
import zipfile
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

GOC = Path(__file__).resolve().parents[1]
TIEN_DO = GOC / "TIEN_DO.md"
KE_HOACH = GOC / "docs" / "Ke_hoach_trien_khai_chuc_nang.xlsx"
RA = GOC / "ke-hoach" / "Phan_cong_cong_viec.xlsx"

TRANG_THAI = ["Chưa làm", "Đang làm", "Xong", "Tạm hoãn", "Bỏ"]
DA_XONG = {"Xong", "Bỏ"}  # việc không còn chặn ai
KHONG_CO_THU_TU = "—"
KHONG_CAN_CHO = "-"

# ---------------------------------------------------------------- định dạng (theo kế hoạch gốc)
F = "Arial"
NAVY = "1B365D"
NEN_GIAI_DOAN = "DCE6F2"
VIEN = Side(style="thin", color="D5DCE6")
BOX = Border(left=VIEN, right=VIEN, top=VIEN, bottom=VIEN)
# (tên, phụ trách, cần giỏi, màu nền, màu chữ)
NGUOI = [
    ("Trưởng nhóm", "Phần nền tảng: Docker, cơ sở dữ liệu, đăng nhập, phân quyền, nhật ký; chốt quy ước API",
     "FastAPI, PostgreSQL, Docker", "FDF0D5", "8A5A00"),
    ("Dev Bài học", "Mọi thứ có 3D: khung bài học 3D, tự khám phá, phim, thí nghiệm, bài kiểm tra, gắn nhãn bộ phận, "
     "3 bài thử nghiệm, điều khiển màn hình lớp (trình duyệt)", "Three.js, React", "DCEBFB", "1E4E8C"),
    ("Dev Quản lý", "Quản lý trường, học sinh, giáo viên, lớp, nhập Excel; biên tập bài học (nạp mô hình, tạo bài, "
     "câu hỏi); giao bài, chấm điểm, kết quả; sao lưu, triển khai", "Python (FastAPI), React", "EDE4F7", "5B2C83"),
]
TEN_NGUOI = [n[0] for n in NGUOI]
MAU_NGUOI = {n[0]: (n[3], n[4]) for n in NGUOI}
MAU_TRANG_THAI = {
    "Xong": ("C6EFCE", "006100"),
    "Đang làm": ("FFEB9C", "7A5A00"),
    "Tạm hoãn": ("E2E8F0", "475569"),
    "Bỏ": ("E2E8F0", "64748B"),
}
DEM_TRANG_THAI = ["Xong", "Đang làm", "Chưa làm", "Tạm hoãn", "Bỏ"]
SAN_SANG_NGAY = "Làm được ngay"


def loi(thong_bao: str) -> None:
    sys.exit(f"tao_phan_cong.py: {thong_bao}")


def fill(mau: str) -> PatternFill:
    return PatternFill(start_color=mau, end_color=mau, fill_type="solid")


def font(size: int = 11, bold: bool = False, color: str = "1E293B", italic: bool = False) -> Font:
    return Font(name=F, size=size, bold=bold, color=color, italic=italic)


def al(h: str = "left", wrap: bool = True) -> Alignment:
    return Alignment(horizontal=h, vertical="center", wrap_text=wrap)


# ---------------------------------------------------------------- đọc TIEN_DO.md
def lam_sach(o: str) -> str:
    return o.replace("\\|", "|").replace("`", "").replace("**", "").strip()


def tach_o(dong: str) -> list[str]:
    """Tách một dòng bảng Markdown thành các ô; `\\|` trong ô không phải dấu ngăn cột."""
    return [lam_sach(o) for o in re.split(r"(?<!\\)\|", dong.strip().strip("|"))]


def bang_trong_muc(noi_dung: str, so_muc: int) -> list[dict[str, str]]:
    """Bảng Markdown ĐẦU TIÊN trong mục '## <so_muc>. ...' -> danh sách dòng {tên cột: giá trị}."""
    m = re.search(rf"^## {so_muc}\. .*?$(.*?)(?=^## \d+\. |\Z)", noi_dung, re.M | re.S)
    if not m:
        loi(f"TIEN_DO.md không có mục '## {so_muc}.'")
    dong: list[str] = []
    for d in m.group(1).splitlines():
        if d.strip().startswith("|"):
            dong.append(d)
        elif dong:
            break  # hết bảng đầu tiên
    if len(dong) < 3:
        loi(f"TIEN_DO.md mục {so_muc}: không thấy bảng")
    cot = tach_o(dong[0])
    ket_qua = []
    for d in dong[2:]:
        o = tach_o(d)
        if len(o) != len(cot):
            loi(f"TIEN_DO.md mục {so_muc}: dòng có {len(o)} ô, cần {len(cot)} (dấu | trong ô viết \\|): {d.strip()}")
        ket_qua.append(dict(zip(cot, o)))
    return ket_qua


def doc_tien_do() -> tuple[dict, dict, list, tuple[int, int, int]]:
    noi_dung = TIEN_DO.read_text(encoding="utf-8")
    trang_thai = {d["Mã"]: d for d in bang_trong_muc(noi_dung, 2)}
    phan_cong = {d["Mã"]: d for d in bang_trong_muc(noi_dung, 9)}
    phoi_hop = bang_trong_muc(noi_dung, 10)
    m = re.search(r"Cập nhật:\s*(\d{1,2})/(\d{1,2})/(\d{4})", noi_dung)
    ngay = (int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else (2026, 1, 1)
    return trang_thai, phan_cong, phoi_hop, ngay


# ---------------------------------------------------------------- đọc kế hoạch gốc
def tach_ma(o: str) -> list[str]:
    return [x.strip() for x in str(o or "").split(",") if x.strip()]


def doc_ke_hoach() -> tuple[list, list]:
    wb = load_workbook(KE_HOACH, read_only=True, data_only=True)
    viec = []
    for r in wb["Chức năng"].iter_rows(values_only=True):
        if r[0] and re.fullmatch(r"[A-Z]{2}\d{2}", str(r[0])):
            ma, ten, nguoi, ai_dung, can_truoc, muc, _, ghi_chu, gd = r[:9]
            viec.append({
                "ma": ma, "ten": ten, "nguoi": nguoi, "ai_dung": ai_dung or "", "can_truoc_kh": tach_ma(can_truoc),
                "muc": muc, "ghi_chu_kh": ghi_chu or "", "gd": int(gd),
            })
    giai_doan = []
    for r in wb["Tổng quan"].iter_rows(values_only=True):
        if len(r) > 3 and isinstance(r[1], int) and r[2] and r[3]:
            giai_doan.append((r[1], r[2], r[3]))
    wb.close()
    return viec, giai_doan


# ---------------------------------------------------------------- ghép dữ liệu
def tach_theo_nguoi(o: str, cot: str) -> dict[str, str]:
    """'Dev Quản lý: A; Dev Bài học: B' -> {'Dev Quản lý': 'A', 'Dev Bài học': 'B'}."""
    ket_qua = {}
    for phan in [p.strip() for p in o.split(";") if p.strip()]:
        nguoi, _, viec = phan.partition(":")
        if nguoi.strip() not in TEN_NGUOI or not viec.strip():
            loi(f"TIEN_DO.md mục 9, cột '{cot}': cần dạng 'Người: ...' với Người thuộc {TEN_NGUOI}: {phan}")
        ket_qua[nguoi.strip()] = viec.strip()
    return ket_qua


def doc_can_truoc(o: str, v: dict) -> None:
    """Cột 'Cần xong trước (điều chỉnh)': trống | '-' | 'mã, mã' | 'Người: mã, mã; Người: mã'."""
    v["can_truoc_chung"], v["can_truoc_rieng"] = None, {}
    if not o:
        return
    if o == KHONG_CAN_CHO:
        v["can_truoc_chung"] = []
    elif ":" in o:
        v["can_truoc_rieng"] = {
            n: ([] if x == KHONG_CAN_CHO else tach_ma(x)) for n, x in tach_theo_nguoi(o, "Cần xong trước (điều chỉnh)").items()
        }
    else:
        v["can_truoc_chung"] = tach_ma(o)


def can_truoc(v: dict, nguoi: str | None = None) -> list[str]:
    """Các việc phải xong trước – riêng cho `nguoi` nếu mục 9 có ghi, rồi đến điều chỉnh chung, rồi kế hoạch gốc."""
    if nguoi and nguoi in v["can_truoc_rieng"]:
        return v["can_truoc_rieng"][nguoi]
    if v["can_truoc_chung"] is not None:
        return v["can_truoc_chung"]
    return v["can_truoc_kh"]


def chuoi_can_truoc(v: dict, nguoi: str | None = None) -> str:
    if nguoi is None and v["can_truoc_rieng"]:
        return "; ".join(f"{n}: {', '.join(x) or 'không'}" for n, x in v["can_truoc_rieng"].items())
    return ", ".join(can_truoc(v, nguoi))


def ghep() -> tuple[list, list, list, tuple[int, int, int]]:
    trang_thai, phan_cong, phoi_hop, ngay = doc_tien_do()
    viec, giai_doan = doc_ke_hoach()
    ma_ke_hoach = [v["ma"] for v in viec]
    for ten_bang, bang in (("mục 2", trang_thai), ("mục 9", phan_cong)):
        thieu, thua = set(ma_ke_hoach) - set(bang), set(bang) - set(ma_ke_hoach)
        if thieu or thua:
            loi(f"TIEN_DO.md {ten_bang} lệch kế hoạch gốc: thiếu {sorted(thieu)}, thừa {sorted(thua)}")

    thu_tu_da_dung: dict[int, str] = {}
    for v in viec:
        t, p = trang_thai[v["ma"]], phan_cong[v["ma"]]
        if t["Người phụ trách"] != v["nguoi"] or t["GĐ"] != str(v["gd"]):
            loi(f"{v['ma']}: mục 2 ghi '{t['Người phụ trách']}', GĐ {t['GĐ']} nhưng kế hoạch gốc là '{v['nguoi']}', "
                f"GĐ {v['gd']} – đổi người làm thì sửa cả kế hoạch gốc (hỏi trưởng nhóm)")
        v["trang_thai"] = t["Trạng thái"]
        if v["trang_thai"] not in TRANG_THAI:
            loi(f"{v['ma']}: trạng thái '{v['trang_thai']}' không thuộc {TRANG_THAI}")
        v["commit"], v["ghi_chu_td"] = t["Commit"], t["Ghi chú"]
        v["api"], v["man_hinh"], v["nhanh"] = p["API"], p["Màn hình"], p["Nhánh gợi ý"]
        v["dieu_chinh"] = p["Điều chỉnh so với kế hoạch"]
        v["xuyen_suot"] = p["Xuyên suốt"].lower() == "có"
        v["phan_viec"] = tach_theo_nguoi(p["Phần việc khi tách đôi"], "Phần việc khi tách đôi")
        doc_can_truoc(p["Cần xong trước (điều chỉnh)"], v)
        tt = p["Thứ tự"]
        if tt == KHONG_CO_THU_TU:
            if v["trang_thai"] not in DA_XONG:
                loi(f"{v['ma']}: chưa xong ({v['trang_thai']}) nhưng mục 9 ghi thứ tự '—'")
            v["thu_tu"] = None
        elif not tt.isdigit():
            loi(f"{v['ma']}: mục 9 cột Thứ tự phải là số hoặc '—', đang là '{tt}'")
        else:
            v["thu_tu"] = int(tt)
            if v["thu_tu"] in thu_tu_da_dung:
                loi(f"{v['ma']}: trùng thứ tự {v['thu_tu']} với {thu_tu_da_dung[v['thu_tu']]} ở mục 9")
            thu_tu_da_dung[v["thu_tu"]] = v["ma"]
        v["nguoi_lam"] = [v["nguoi"]] + [n for n in v["phan_viec"] if n != v["nguoi"]]

    theo_ma = {v["ma"]: v for v in viec}
    for v in viec:
        la = set(v["can_truoc_rieng"]) - set(v["nguoi_lam"])
        if la:
            loi(f"{v['ma']}: 'Cần xong trước (điều chỉnh)' ghi cho {sorted(la)} nhưng người này không làm việc này "
                f"(thêm vào 'Phần việc khi tách đôi' ở mục 9)")
        for n in v["nguoi_lam"]:
            for d in can_truoc(v, n):
                if d not in theo_ma:
                    loi(f"{v['ma']}: 'cần xong trước' có mã lạ {d}")
                dv = theo_ma[d]
                # Việc chưa xong không được xếp trước việc nó phải chờ.
                if (v["thu_tu"] is not None and dv["trang_thai"] not in DA_XONG and not dv["xuyen_suot"]
                        and dv["thu_tu"] > v["thu_tu"]):
                    loi(f"{v['ma']} (thứ tự {v['thu_tu']}) cần {d} xong trước nhưng {d} xếp thứ tự {dv['thu_tu']} – "
                        f"sửa thứ tự hoặc cột 'Cần xong trước (điều chỉnh)' ở mục 9")
    return viec, giai_doan, phoi_hop, ngay


def san_sang(v: dict, theo_ma: dict, nguoi_xem: str) -> str:
    if v["trang_thai"] == "Xong":
        return "Đã xong"
    if v["trang_thai"] == "Bỏ":
        return "Bỏ"
    # Việc xuyên suốt (NT06) chỉ xong ở cuối dự án: không bắt việc khác phải chờ.
    cho = [d for d in can_truoc(v, nguoi_xem) if theo_ma[d]["trang_thai"] not in DA_XONG and not theo_ma[d]["xuyen_suot"]]
    if not cho:
        return SAN_SANG_NGAY
    ai = lambda d: "của mình" if theo_ma[d]["nguoi"] == nguoi_xem else f"của {theo_ma[d]['nguoi']}"
    return "Chờ " + ", ".join(f"{d} {ai(d)}" for d in cho)


def ghi_chu_cho(v: dict, nguoi_xem: str | None) -> str:
    phan = []
    if v["phan_viec"]:
        if nguoi_xem and nguoi_xem in v["phan_viec"]:
            phan.append(f"Phần của bạn: {v['phan_viec'][nguoi_xem]}")
            phan += [f"Phần của {n}: {x}" for n, x in v["phan_viec"].items() if n != nguoi_xem]
        else:
            phan += [f"{n}: {x}" for n, x in v["phan_viec"].items()]
    if v["dieu_chinh"]:
        phan.insert(0, v["dieu_chinh"])
    else:
        # Không có điều chỉnh: dùng ghi chú mục 2, bỏ chữ "Nên có" đã có ở cột Mức; trống thì dùng ghi chú kế hoạch gốc.
        td = re.sub(r"^Nên có[;,.]?\s*", "", v["ghi_chu_td"]).strip()
        if td:
            phan.append(td)
        elif v["ghi_chu_kh"]:
            phan.append(v["ghi_chu_kh"])
    return ". ".join(p.rstrip(".") for p in phan)


# ---------------------------------------------------------------- ghi Excel
def tieu_de(ws, dong: int, cac_cot: list[str], bat_dau: int = 1) -> None:
    for i, h in enumerate(cac_cot, bat_dau):
        c = ws.cell(dong, i, h)
        c.font, c.fill, c.alignment, c.border = font(11, True, "FFFFFF"), fill(NAVY), al("center"), BOX
    ws.row_dimensions[dong].height = 30


def dong_du_lieu(ws, dong: int, gia_tri: list, giua: set[int], rong: list[int]) -> None:
    cao = 1
    for i, g in enumerate(gia_tri, 1):
        c = ws.cell(dong, i, g)
        c.font, c.border = font(10 if i == len(gia_tri) else 11), BOX
        c.alignment = al("center" if i in giua else "left")
        if g:
            cao = max(cao, -(-len(str(g)) // max(1, int(rong[i - 1] * 1.1))))
    ws.row_dimensions[dong].height = max(21, 15 * cao + 6)


def to_mau_trang_thai(o, trang_thai: str) -> None:
    if trang_thai in MAU_TRANG_THAI:
        nen, chu = MAU_TRANG_THAI[trang_thai]
        o.fill, o.font = fill(nen), font(11, color=chu)


def to_mau_nguoi(o, nguoi: str) -> None:
    nen, chu = MAU_NGUOI[nguoi]
    o.fill, o.font = fill(nen), font(11, True, chu)


def them_chon_trang_thai(ws, cot: str, dong_dau: int, dong_cuoi: int) -> None:
    dv = DataValidation(type="list", formula1='"' + ",".join(TRANG_THAI) + '"', allow_blank=True,
                        promptTitle="Không sửa tay", prompt="Sửa trạng thái trong TIEN_DO.md mục 2 rồi chạy lại ke-hoach/tao_phan_cong.py",
                        showInputMessage=True)
    ws.add_data_validation(dv)
    dv.add(f"{cot}{dong_dau}:{cot}{dong_cuoi}")


def dat_rong(ws, rong: list[int]) -> None:
    for i, w in enumerate(rong, 1):
        ws.column_dimensions[chr(64 + i)].width = w


def dau_trang(ws, tieu: str, phu: str) -> None:
    ws["A1"] = tieu
    ws["A1"].font = font(16, True, NAVY)
    ws.row_dimensions[1].height = 28
    ws["A2"] = phu
    ws["A2"].font = font(10, italic=True, color="64748B")
    ws.sheet_view.showGridLines = False


GHI_CHU_SINH = "Sinh tự động từ TIEN_DO.md bằng ke-hoach/tao_phan_cong.py – KHÔNG sửa tay; sửa TIEN_DO.md rồi chạy lại script."


def sheet_tong_quan(wb, viec: list, giai_doan: list) -> None:
    ws = wb.active
    ws.title = "Tổng quan"
    dat_rong(ws, [3, 16, 30, 50, 11, 11, 11, 11, 11, 11, 11, 13])
    ws.sheet_view.showGridLines = False
    ws["B1"] = "PHÂN CÔNG CÔNG VIỆC – PHÒNG THÍ NGHIỆM ẢO 3D STEM"
    ws["B1"].font = font(16, True, NAVY)
    ws.row_dimensions[1].height = 28
    ws["B2"] = GHI_CHU_SINH
    ws["B2"].font = font(10, italic=True, color="64748B")

    # Giai đoạn hiện tại: giai đoạn nhỏ nhất còn việc Bắt buộc chưa xong (không tính việc xuyên suốt như NT06).
    con_lai = lambda g: [v["ma"] for v in viec if v["gd"] == g and v["muc"] == "Bắt buộc"
                         and v["trang_thai"] not in DA_XONG and not v["xuyen_suot"]]
    hien_tai = next((g for g, _, _ in giai_doan if con_lai(g)), giai_doan[-1][0])
    ten_hien_tai = next(t for g, t, _ in giai_doan if g == hien_tai)
    xuyen_suot = [v["ma"] for v in viec if v["xuyen_suot"] and v["trang_thai"] not in DA_XONG]
    ws.merge_cells("B4:L4")
    ws["B4"] = (f"Giai đoạn hiện tại: {hien_tai} – {ten_hien_tai}   ·   Còn việc bắt buộc: {', '.join(con_lai(hien_tai)) or 'không'}"
                + (f"   ·   Việc xuyên suốt: {', '.join(xuyen_suot)}" if xuyen_suot else ""))
    ws["B4"].font, ws["B4"].fill, ws["B4"].alignment = font(12, True, NAVY), fill(NEN_GIAI_DOAN), al("left")
    ws.row_dimensions[4].height = 28

    dem = lambda dk: sum(1 for v in viec if dk(v))
    ws["B6"] = "THEO NGƯỜI"
    ws["B6"].font = font(12, True, NAVY)
    tieu_de(ws, 7, ["Người", "Cần giỏi", "Phụ trách", "Số việc", "Bắt buộc"] + DEM_TRANG_THAI + ["Bắt buộc đã xong"], 2)
    for k, (ten, pham_vi, gioi, _, _) in enumerate(NGUOI):
        d = 8 + k
        cua = lambda v, ten=ten: v["nguoi"] == ten
        bat_buoc = dem(lambda v: cua(v) and v["muc"] == "Bắt buộc" and v["trang_thai"] != "Bỏ")
        bat_buoc_xong = dem(lambda v: cua(v) and v["muc"] == "Bắt buộc" and v["trang_thai"] == "Xong")
        gia_tri = ([ten, gioi, pham_vi, dem(cua), bat_buoc]
                   + [dem(lambda v, s=s: cua(v) and v["trang_thai"] == s) for s in DEM_TRANG_THAI]
                   + [bat_buoc_xong / bat_buoc if bat_buoc else 0])
        for i, g in enumerate(gia_tri, 2):
            c = ws.cell(d, i, g)
            c.font, c.border, c.alignment = font(11), BOX, al("left" if i in (3, 4) else "center")
        to_mau_nguoi(ws.cell(d, 2), ten)
        ws.cell(d, 12).number_format = "0%"
        ws.row_dimensions[d].height = 48
    d_ghi = 8 + len(NGUOI)
    ws.merge_cells(start_row=d_ghi, start_column=2, end_row=d_ghi, end_column=12)
    ws.cell(d_ghi, 2, "Đếm theo người làm chính trong kế hoạch gốc. Việc tách đôi (TIEN_DO.md mục 9) hiện ở sheet của cả hai dev; "
                     "chỗ cần thống nhất xem sheet \"Phối hợp\".").font = font(10, italic=True, color="64748B")

    d0 = d_ghi + 2
    ws.cell(d0, 2, "THEO GIAI ĐOẠN").font = font(12, True, NAVY)
    tieu_de(ws, d0 + 1, ["Giai đoạn", "Tên", "Xong thì có gì"] + TEN_NGUOI + DEM_TRANG_THAI, 2)
    for k, (g, ten, muc_tieu) in enumerate(giai_doan):
        d = d0 + 2 + k
        cua = lambda v, g=g: v["gd"] == g
        gia_tri = ([g, ten, muc_tieu] + [dem(lambda v, n=n: cua(v) and v["nguoi"] == n) for n in TEN_NGUOI]
                   + [dem(lambda v, s=s: cua(v) and v["trang_thai"] == s) for s in DEM_TRANG_THAI])
        for i, x in enumerate(gia_tri, 2):
            c = ws.cell(d, i, x)
            c.font, c.border, c.alignment = font(11, bold=(g == hien_tai)), BOX, al("left" if i in (3, 4) else "center")
            if g == hien_tai:
                c.fill = fill(NEN_GIAI_DOAN)
        ws.row_dimensions[d].height = 32
    d_tong = d0 + 2 + len(giai_doan)
    ws.cell(d_tong, 3, "Tổng").font = font(11, True)
    tong = [dem(lambda v, n=n: v["nguoi"] == n) for n in TEN_NGUOI] + [dem(lambda v, s=s: v["trang_thai"] == s) for s in DEM_TRANG_THAI]
    for i, x in enumerate(tong, 5):
        c = ws.cell(d_tong, i, x)
        c.font, c.alignment = font(11, True), al("center")

    # Việc nên làm tiếp theo của mỗi dev.
    d1 = d_tong + 2
    ws.cell(d1, 2, "VIỆC NÊN LÀM TIẾP THEO").font = font(12, True, NAVY)
    tieu_de(ws, d1 + 1, ["Người", "Mã", "Việc", "Sẵn sàng"], 2)
    theo_ma = {v["ma"]: v for v in viec}
    d = d1 + 2
    for ten in ("Dev Quản lý", "Dev Bài học"):
        con = sorted([v for v in viec if ten in v["nguoi_lam"] and v["thu_tu"] is not None and v["trang_thai"] not in DA_XONG
                      and not v["xuyen_suot"]], key=lambda v: v["thu_tu"])
        for v in con[:3]:
            for i, x in enumerate([ten, v["ma"], v["ten"], san_sang(v, theo_ma, ten)], 2):
                c = ws.cell(d, i, x)
                c.font, c.border, c.alignment = font(11), BOX, al("center" if i == 3 else "left")
            to_mau_nguoi(ws.cell(d, 2), ten)
            ws.row_dimensions[d].height = 22
            d += 1


COT_DEV = [("Thứ tự", 7), ("Mã", 7), ("Tên việc", 40), ("GĐ", 5), ("Mức", 9), ("Cần xong trước", 14),
           ("Sẵn sàng", 24), ("API liên quan", 14), ("Màn hình", 26), ("Nhánh gợi ý", 36), ("Trạng thái", 11), ("Ghi chú", 60)]


def sheet_dev(wb, viec: list, ten: str) -> None:
    ws = wb.create_sheet(ten)
    rong = [w for _, w in COT_DEV]
    dat_rong(ws, rong)
    dau_trang(ws, f"VIỆC CỦA {ten.upper()} – THEO THỨ TỰ NÊN LÀM",
              "Làm từ trên xuống; \"Thứ tự\" đánh lại 1, 2, 3… riêng cho sheet này (số chung của cả nhóm ở sheet \"Tất cả việc\"). "
              "\"Sẵn sàng\" cho biết làm được ngay hay đang chờ ai. " + GHI_CHU_SINH)
    tieu_de(ws, 4, [h for h, _ in COT_DEV])
    theo_ma = {v["ma"]: v for v in viec}
    cua_minh = [v for v in viec if ten in v["nguoi_lam"]]
    con_lam = sorted([v for v in cua_minh if v["thu_tu"] is not None], key=lambda v: v["thu_tu"])
    da_xong = sorted([v for v in cua_minh if v["thu_tu"] is None], key=lambda v: (v["gd"], v["ma"]))
    d = 5
    for k, v in enumerate(con_lam + da_xong, 1):
        stt = k if v["thu_tu"] is not None else KHONG_CO_THU_TU
        ten_viec = v["ten"] if v["nguoi"] == ten else f"{v['ten']} (phần của mình; người chính: {v['nguoi']})"
        gia_tri = [stt, v["ma"], ten_viec, v["gd"], v["muc"], chuoi_can_truoc(v, ten), san_sang(v, theo_ma, ten),
                   v["api"], v["man_hinh"], v["nhanh"], v["trang_thai"], ghi_chu_cho(v, ten)]
        dong_du_lieu(ws, d, gia_tri, {1, 2, 4, 5, 6, 8, 11}, rong)
        to_mau_trang_thai(ws.cell(d, 11), v["trang_thai"])
        ss = ws.cell(d, 7)
        ss.font = font(11, True, "006100") if ss.value == SAN_SANG_NGAY else font(11, color="7A5A00" if str(ss.value).startswith("Chờ") else "64748B")
        if v["muc"] == "Nên có":
            ws.cell(d, 5).font = font(11, color="94A3B8")
        d += 1
    them_chon_trang_thai(ws, "K", 5, d - 1)
    ws.freeze_panes = "C5"
    ws.auto_filter.ref = f"A4:L{d - 1}"


COT_TAT_CA = [("Mã", 7), ("Chức năng", 46), ("Người làm", 14), ("Ai dùng", 20), ("Cần xong trước", 16), ("Mức", 9),
              ("Trạng thái", 11), ("Commit", 22), ("Thứ tự", 7), ("Ghi chú", 64)]


def sheet_tat_ca(wb, viec: list, giai_doan: list) -> None:
    ws = wb.create_sheet("Tất cả việc")
    rong = [w for _, w in COT_TAT_CA]
    dat_rong(ws, rong)
    dau_trang(ws, "TẤT CẢ VIỆC THEO KẾ HOẠCH (45 VIỆC)",
              "Nhóm theo giai đoạn như kế hoạch gốc, kèm trạng thái, commit và thứ tự chung của cả nhóm. " + GHI_CHU_SINH)
    tieu_de(ws, 4, [h for h, _ in COT_TAT_CA])
    d = 5
    for g, ten, muc_tieu in giai_doan:
        ws.merge_cells(start_row=d, start_column=1, end_row=d, end_column=len(COT_TAT_CA))
        c = ws.cell(d, 1, f"GIAI ĐOẠN {g} – {ten.upper()}   ·   {muc_tieu}")
        c.font, c.alignment = font(11, True, NAVY), Alignment(vertical="center", indent=1)
        for i in range(1, len(COT_TAT_CA) + 1):
            ws.cell(d, i).fill = fill(NEN_GIAI_DOAN)
        ws.row_dimensions[d].height = 24
        d += 1
        dau = d
        for v in [x for x in viec if x["gd"] == g]:
            gia_tri = [v["ma"], v["ten"], v["nguoi"], v["ai_dung"], chuoi_can_truoc(v), v["muc"], v["trang_thai"],
                       v["commit"], v["thu_tu"] if v["thu_tu"] is not None else KHONG_CO_THU_TU, ghi_chu_cho(v, None)]
            dong_du_lieu(ws, d, gia_tri, {1, 3, 5, 6, 7, 9}, rong)
            to_mau_nguoi(ws.cell(d, 3), v["nguoi"])
            to_mau_trang_thai(ws.cell(d, 7), v["trang_thai"])
            if v["muc"] == "Nên có":
                ws.cell(d, 6).font = font(11, color="94A3B8")
            d += 1
        them_chon_trang_thai(ws, "G", dau, d - 1)
    ws.freeze_panes = "B5"


COT_PHOI_HOP = [("Chủ đề", 22), ("Việc liên quan", 18), ("Dev Quản lý", 40), ("Dev Bài học", 40), ("Cần thống nhất", 52), ("Đã thống nhất", 18)]


def sheet_phoi_hop(wb, phoi_hop: list) -> None:
    ws = wb.create_sheet("Phối hợp")
    rong = [w for _, w in COT_PHOI_HOP]
    dat_rong(ws, rong)
    dau_trang(ws, "CHỖ HAI DEV PHẢI THỐNG NHẤT", "Thống nhất TRƯỚC khi làm các việc liên quan; ghi kết quả vào TIEN_DO.md mục 10. " + GHI_CHU_SINH)
    tieu_de(ws, 4, [h for h, _ in COT_PHOI_HOP])
    for k, p in enumerate(phoi_hop):
        d = 5 + k
        dong_du_lieu(ws, d, [p.get(h, "") for h, _ in COT_PHOI_HOP], {2}, rong)
        ws.cell(d, 1).font = font(11, True)
        xong = ws.cell(d, 6)
        if not xong.value:
            continue  # chưa ghi gì: không tô màu
        if str(xong.value).startswith("Chưa"):
            xong.fill, xong.font = fill("FFEB9C"), font(11, color="7A5A00")
        else:
            xong.fill, xong.font = fill("C6EFCE"), font(11, color="006100")
    ws.freeze_panes = "B5"


def luu_co_dinh(wb, ngay: tuple[int, int, int]) -> None:
    """Lưu sao cho cùng nội dung thì ra cùng từng byte: cố định ngày tạo / sửa và thời gian trong file zip."""
    bo_dem = io.BytesIO()
    wb.save(bo_dem)
    iso = f"{ngay[0]:04d}-{ngay[1]:02d}-{ngay[2]:02d}T00:00:00Z"
    with zipfile.ZipFile(bo_dem) as vao, zipfile.ZipFile(RA, "w", zipfile.ZIP_DEFLATED) as ra:
        for muc in vao.infolist():
            du_lieu = vao.read(muc.filename)
            if muc.filename == "docProps/core.xml":
                du_lieu = re.sub(rb"(<dcterms:(?:created|modified)[^>]*>)[^<]*(<)", lambda m: m.group(1) + iso.encode() + m.group(2), du_lieu)
            thong_tin = zipfile.ZipInfo(muc.filename, date_time=(ngay[0], ngay[1], ngay[2], 0, 0, 0))
            thong_tin.compress_type = zipfile.ZIP_DEFLATED
            # ZipInfo tự ghi hệ điều hành (Windows 0, Linux/macOS 3): cố định để mọi máy ra cùng từng byte.
            thong_tin.create_system = 0
            thong_tin.external_attr = 0o600 << 16
            ra.writestr(thong_tin, du_lieu)


def main() -> None:
    viec, giai_doan, phoi_hop, ngay = ghep()
    wb = Workbook()
    wb.properties.creator = "ke-hoach/tao_phan_cong.py"
    sheet_tong_quan(wb, viec, giai_doan)
    sheet_dev(wb, viec, "Dev Quản lý")
    sheet_dev(wb, viec, "Dev Bài học")
    sheet_tat_ca(wb, viec, giai_doan)
    sheet_phoi_hop(wb, phoi_hop)
    luu_co_dinh(wb, ngay)
    dem = {s: sum(v["trang_thai"] == s for v in viec) for s in TRANG_THAI}
    print(f"Đã sinh {RA.relative_to(GOC)}: {len(viec)} việc, " + ", ".join(f"{s} {n}" for s, n in dem.items() if n))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
