# Hook PreToolUse (Bash): giữ quy trình Git của nhóm (mục "Quy trình Git" trong CLAUDE.md).
# - Đang ở main / dev: chặn git commit, merge, rebase, cherry-pick.
# - Ở mọi nhánh: chặn git push nhắm vào main / dev (kể cả --force, HEAD:main, +dev, :dev, --all, --mirror).
# - Lệnh nhiều vế (&&, ||, ;, |, xuống dòng) kiểm tra từng vế; theo dõi việc đổi nhánh trong cùng lệnh
#   (git switch -c feature/x && git commit  -> được phép).
# Giới hạn: chỉ đọc chuỗi lệnh, không chặn được bash -c "...", alias git hay script riêng.
# Thoát mã 2 = CHẶN (stderr gửi lại cho Claude); mã 0 = cho phép.
import json
import os
import re
import shlex
import subprocess
import sys

NHANH_CHINH = {"main", "dev"}
LENH_CHAN_TREN_NHANH_CHINH = {"commit", "merge", "rebase", "cherry-pick"}
# Các lệnh trên chỉ thoát khỏi trạng thái dở dang, không tạo commit mới: cho phép.
TUY_CHON_THOAT = {"--abort", "--quit", "--skip"}
DAU_NOI = {"&&", "||", ";", "|", "&", "\n", "(", ")", "|&", ";;", ";&", "{", "}"}
# Tùy chọn của git (đứng trước lệnh con) có kèm giá trị ở token sau.
TUY_CHON_GIT_CO_GIA_TRI = {"-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env", "--super-prefix"}
TUY_CHON_PUSH_CO_GIA_TRI = {"--repo", "-o", "--push-option", "--receive-pack", "--exec"}
KHONG_RO = None  # nhánh không xác định được (ví dụ sau "git switch -")

THONG_BAO_COMMIT = (
    "Đang ở nhánh {nhanh}: không commit / merge / rebase / cherry-pick thẳng lên main hay dev. "
    "Hãy tạo nhánh việc từ dev: git switch dev && git pull && git switch -c feature/<mã-việc>-<mô-tả> "
    "(xem mục \"Quy trình Git\" trong CLAUDE.md)."
)
THONG_BAO_PUSH = (
    "Không push thẳng vào main hay dev ({chi_tiet}). Hãy push nhánh việc của mình "
    "(git push -u origin feature/...) rồi tạo Pull Request vào dev trên GitHub."
)
THONG_BAO_KHONG_RO = (
    "Không xác định được nhánh hiện tại nên không cho {viec}. Hãy chạy git status, "
    "chuyển sang nhánh feature/... hoặc fix/... rồi làm lại."
)


def nhanh_hien_tai(goc: str) -> str | None:
    try:
        kq = subprocess.run(
            ["git", "-C", goc, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return KHONG_RO
    return kq.stdout.strip() if kq.returncode == 0 and kq.stdout.strip() else KHONG_RO


def nhanh_ton_tai(goc: str, ten: str) -> bool:
    for ref in (f"refs/heads/{ten}", f"refs/remotes/origin/{ten}"):
        kq = subprocess.run(
            ["git", "-C", goc, "show-ref", "--verify", "--quiet", ref], capture_output=True, timeout=10
        )
        if kq.returncode == 0:
            return True
    return False


def bo_noi_dung_heredoc(lenh: str) -> str:
    """Bỏ phần thân heredoc (ví dụ commit message viết bằng <<'EOF'), để chữ trong đó không bị hiểu là lệnh."""
    dong_giu: list[str] = []
    cho: list[tuple[str, bool]] = []  # (dấu kết thúc, có <<- hay không)
    for dong in lenh.split("\n"):
        if cho:
            ket_thuc, bo_tab = cho[0]
            if (dong.lstrip("\t") if bo_tab else dong) == ket_thuc:
                cho.pop(0)
            continue
        dong_giu.append(dong)
        for m in re.finditer(r"<<(-?)\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\2", dong):
            cho.append((m.group(3), m.group(1) == "-"))
    return "\n".join(dong_giu)


def tach_cac_ve(lenh: str) -> list[list[str]]:
    """Tách lệnh shell thành các vế (danh sách token), tôn trọng dấu nháy."""
    lenh = bo_noi_dung_heredoc(lenh)
    try:
        lex = shlex.shlex(lenh, posix=True, punctuation_chars="();<>|&\n")
        lex.whitespace = " \t\r"
        lex.whitespace_split = True
        tokens = list(lex)
    except ValueError:
        # Dấu nháy không khớp: tách thô, thà chặn nhầm còn hơn bỏ sót.
        tokens = re.sub(r"(&&|\|\||[;|&\n()])", r" \1 ", lenh).split()
    cac_ve: list[list[str]] = [[]]
    for t in tokens:
        if t in DAU_NOI:
            cac_ve.append([])
        else:
            cac_ve[-1].append(t)
    return [v for v in cac_ve if v]


def doc_lenh_git(ve: list[str]) -> tuple[str, list[str]] | None:
    """Trả (lệnh con, tham số) nếu vế là một lệnh git; None nếu không phải."""
    i = 0
    while i < len(ve) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", ve[i]):
        i += 1  # VAR=gia_tri git ...
    while i < len(ve) and ve[i] in {"command", "exec", "time", "nohup"}:
        i += 1
    if i >= len(ve) or os.path.basename(ve[i]).lower() not in {"git", "git.exe"}:
        return None
    i += 1
    while i < len(ve) and ve[i].startswith("-"):
        i += 2 if ve[i] in TUY_CHON_GIT_CO_GIA_TRI else 1
    if i >= len(ve):
        return None
    return ve[i], ve[i + 1 :]


def nhanh_sau_khi_doi(goc: str, lenh_con: str, tham_so: list[str], nhanh: str | None) -> str | None:
    """Mô phỏng git switch / git checkout để biết các vế sau chạy trên nhánh nào."""
    if lenh_con == "switch":
        for i, t in enumerate(tham_so):
            if t in {"-c", "-C", "--create", "--force-create", "--orphan"} and i + 1 < len(tham_so):
                return tham_so[i + 1]
            if t in {"-d", "--detach"}:
                return "HEAD"
        vi_tri = [t for t in tham_so if t == "-" or not t.startswith("-")]
        if vi_tri:
            return KHONG_RO if vi_tri[0] == "-" else vi_tri[0]
        return nhanh
    if lenh_con == "checkout":
        for i, t in enumerate(tham_so):
            if t in {"-b", "-B", "--orphan"} and i + 1 < len(tham_so):
                return tham_so[i + 1]
            if t == "--":
                return nhanh  # git checkout -- <file>: chỉ khôi phục file
        vi_tri = [t for t in tham_so if t == "-" or not t.startswith("-")]
        if vi_tri:
            if vi_tri[0] == "-":
                return KHONG_RO
            # git checkout <file> không đổi nhánh: chỉ coi là đổi nhánh khi tên đó là một nhánh có thật.
            if nhanh_ton_tai(goc, vi_tri[0]):
                return vi_tri[0]
        return nhanh
    return nhanh


def dich_cua_push(tham_so: list[str], nhanh: str | None) -> list[str | None]:
    """Các nhánh đích mà git push sẽ ghi vào (None = không xác định được)."""
    vi_tri: list[str] = []
    i = 0
    while i < len(tham_so):
        t = tham_so[i]
        if t in {"--all", "--mirror", "--branches"}:
            return ["main"]  # đẩy mọi nhánh, gồm cả main / dev
        if t in TUY_CHON_PUSH_CO_GIA_TRI:
            i += 2
            continue
        if not t.startswith("-"):
            vi_tri.append(t)
        i += 1
    refspec = vi_tri[1:]  # vi_tri[0] là remote
    if not refspec:
        return [nhanh]  # git push / git push origin: đẩy nhánh hiện tại
    dich: list[str | None] = []
    for r in refspec:
        r = r.lstrip("+")
        nguon, co_hai_cham, dich_r = r.rpartition(":")
        ten = dich_r if co_hai_cham else r
        if not ten:
            ten = nguon
        if ten == "HEAD":
            dich.append(nhanh)
            continue
        dich.append(ten.removeprefix("refs/heads/"))
    return dich


def kiem_tra(lenh: str, goc: str) -> str | None:
    """Trả câu thông báo nếu phải chặn, None nếu cho phép."""
    nhanh = nhanh_hien_tai(goc)
    for ve in tach_cac_ve(lenh):
        git = doc_lenh_git(ve)
        if git is None:
            continue
        lenh_con, tham_so = git
        if lenh_con in {"switch", "checkout"}:
            nhanh = nhanh_sau_khi_doi(goc, lenh_con, tham_so, nhanh)
        elif lenh_con in LENH_CHAN_TREN_NHANH_CHINH:
            if lenh_con != "commit" and TUY_CHON_THOAT & set(tham_so):
                continue
            if nhanh is KHONG_RO:
                return THONG_BAO_KHONG_RO.format(viec=f"git {lenh_con}")
            if nhanh in NHANH_CHINH:
                return THONG_BAO_COMMIT.format(nhanh=nhanh)
        elif lenh_con == "push":
            for d in dich_cua_push(tham_so, nhanh):
                if d is KHONG_RO:
                    return THONG_BAO_KHONG_RO.format(viec="git push không ghi nhánh đích")
                if d in NHANH_CHINH:
                    return THONG_BAO_PUSH.format(chi_tiet=f"đích: {d}")
    return None


def main() -> None:
    sys.stderr.reconfigure(encoding="utf-8")
    du_lieu = json.load(sys.stdin)
    lenh = du_lieu.get("tool_input", {}).get("command", "")
    if not lenh or "git" not in lenh:
        sys.exit(0)
    goc = os.environ.get("CLAUDE_PROJECT_DIR") or du_lieu.get("cwd") or os.getcwd()
    thong_bao = kiem_tra(lenh, goc)
    if thong_bao:
        print(thong_bao, file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
