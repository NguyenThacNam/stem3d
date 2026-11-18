# Hook PreToolUse: chặn mọi thao tác sửa/ghi file trong thư mục docs/ (đề bài thiết kế).
import json
import os
import sys

sys.stderr.reconfigure(encoding="utf-8")  # để thông báo tiếng Việt không bị lỗi phông trên Windows

du_lieu = json.load(sys.stdin)  # Claude Code gửi thông tin thao tác qua stdin
duong_dan = du_lieu.get("tool_input", {}).get("file_path", "")
if not duong_dan:
    sys.exit(0)

goc = os.environ.get("CLAUDE_PROJECT_DIR") or du_lieu.get("cwd") or os.getcwd()
tuong_doi = os.path.relpath(os.path.abspath(os.path.join(goc, duong_dan)), goc).replace("\\", "/")

if tuong_doi == "docs" or tuong_doi.startswith("docs/"):
    # Thoát với mã 2 = CHẶN thao tác; nội dung stderr được gửi lại cho Claude
    print("Không được sửa file trong docs/ (tài liệu thiết kế). Cần đổi thiết kế thì hỏi người dùng.", file=sys.stderr)
    sys.exit(2)

sys.exit(0)  # Mã 0 = cho phép
