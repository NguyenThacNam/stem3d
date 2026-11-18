# Hook PostToolUse: tự định dạng đúng file vừa sửa.
# - File .py  -> ruff format (nếu đã cài ruff)
# - File frontend (.ts .tsx .js .jsx .css .json) -> prettier (nếu frontend đã cài prettier)
# Không có công cụ thì bỏ qua, không báo lỗi; hook này không bao giờ chặn thao tác.
import json
import os
import shutil
import subprocess
import sys

du_lieu = json.load(sys.stdin)
duong_dan = du_lieu.get("tool_input", {}).get("file_path", "")
if not duong_dan or not os.path.isfile(duong_dan):
    sys.exit(0)

goc = os.environ.get("CLAUDE_PROJECT_DIR") or du_lieu.get("cwd") or os.getcwd()
duoi = os.path.splitext(duong_dan)[1].lower()

try:
    if duoi == ".py":
        if shutil.which("ruff"):
            subprocess.run(["ruff", "format", "--quiet", duong_dan], timeout=30)
        else:
            subprocess.run([sys.executable, "-m", "ruff", "format", "--quiet", duong_dan],
                           timeout=30, capture_output=True)
    elif duoi in {".ts", ".tsx", ".js", ".jsx", ".css", ".json"}:
        frontend = os.path.join(goc, "frontend")
        ten = "prettier.cmd" if os.name == "nt" else "prettier"
        prettier = os.path.join(frontend, "node_modules", ".bin", ten)
        if os.path.abspath(duong_dan).startswith(os.path.abspath(frontend)) and os.path.isfile(prettier):
            subprocess.run([prettier, "--write", "--log-level", "warn", duong_dan], timeout=60, cwd=frontend)
except Exception:
    pass

sys.exit(0)
