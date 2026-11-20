"""Test hook chặn git trên main / dev. Chạy: python -m pytest .claude/hooks/tests (không cần CSDL, Docker).

Mỗi test dùng một kho git tạm trong tmp_path, đặt CLAUDE_PROJECT_DIR trỏ vào đó và chạy script thật
với dữ liệu giả lập Claude Code gửi qua stdin.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "chan_git_nhanh_chinh.py"


def _git(kho: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(kho), *args], check=True, capture_output=True)


@pytest.fixture(scope="module")
def kho(tmp_path_factory: pytest.TempPathFactory) -> Path:
    kho = tmp_path_factory.mktemp("kho")
    _git(kho, "init", "-q", "-b", "main")
    _git(kho, "config", "user.email", "thu@example.com")
    _git(kho, "config", "user.name", "Thu")
    _git(kho, "commit", "-q", "--allow-empty", "-m", "Khởi tạo")
    for nhanh in ("dev", "feature/NT01-thu", "fix/loi-nho", "docs/quy-tac"):
        _git(kho, "branch", nhanh)
    return kho


def chay(kho: Path, nhanh: str, lenh: str) -> subprocess.CompletedProcess:
    _git(kho, "switch", "-q", nhanh)
    du_lieu = {"tool_name": "Bash", "tool_input": {"command": lenh}, "cwd": str(kho)}
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=json.dumps(du_lieu),
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(kho)},
    )


# ---------- Đang ở main / dev: chặn commit, merge, rebase, cherry-pick ----------

LENH_SUA_LICH_SU = [
    "git commit -m 'Thêm chức năng'",
    "git commit --allow-empty -m x",
    "git merge feature/NT01-thu",
    "git rebase dev",
    "git cherry-pick abc1234",
    "git -C . commit -m x",
    'git -c user.name="A B" commit -m x',
    "GIT_AUTHOR_NAME=a git commit -m x",
    "cd frontend && git commit -m x",
    "git status; git commit -am x",
    "git add -A && git commit -F - <<'EOF'\nThêm chức năng\n\nCo-Authored-By: X\nEOF",
    "git add .\ngit commit -m x",
    "git checkout src/a.ts && git commit -m x",  # checkout một file: vẫn ở nhánh cũ
    "git commit -m 'thiếu dấu nháy",  # không tách được: vẫn phải chặn
]


@pytest.mark.parametrize("nhanh", ["main", "dev"])
@pytest.mark.parametrize("lenh", LENH_SUA_LICH_SU)
def test_chan_sua_lich_su_tren_nhanh_chinh(kho: Path, nhanh: str, lenh: str) -> None:
    kq = chay(kho, nhanh, lenh)

    assert kq.returncode == 2, kq.stderr
    assert f"Đang ở nhánh {nhanh}" in kq.stderr
    assert "feature/" in kq.stderr


@pytest.mark.parametrize(
    "lenh",
    [
        "git pull",
        "git pull origin dev",
        "git switch dev",
        "git status",
        "git log --oneline -5",
        "git diff --stat",
        "git fetch origin",
        "git switch -c feature/QL08-dat-lai-mat-khau",
        "git switch -c feature/QL08-dat-lai-mat-khau && git add -A && git commit -m x",
        "git checkout -b fix/sua-loi && git commit -m x",
        "git switch feature/NT01-thu && git commit -m x",
        "git merge --abort",
        "git rebase --abort",
        "echo 'git commit -m x'",
        "ls -la",
    ],
)
def test_cho_phep_tren_main(kho: Path, lenh: str) -> None:
    kq = chay(kho, "main", lenh)

    assert kq.returncode == 0, kq.stderr


def test_doi_sang_nhanh_chinh_roi_commit_bi_chan(kho: Path) -> None:
    kq = chay(kho, "feature/NT01-thu", "git switch dev && git commit -m x")

    assert kq.returncode == 2
    assert "Đang ở nhánh dev" in kq.stderr


@pytest.mark.parametrize("nhanh", ["feature/NT01-thu", "fix/loi-nho", "docs/quy-tac"])
@pytest.mark.parametrize(
    "lenh",
    [
        "git commit -m x",
        "git merge dev",
        "git rebase dev",
        "git cherry-pick abc1234",
        "git pull origin dev",
        "git push -u origin HEAD",
        # Thân heredoc nhắc tới main / dev không bị hiểu là lệnh.
        "git commit -F - <<'EOF'\nSửa lỗi\ngit push origin main\nEOF",
    ],
)
def test_cho_phep_tren_nhanh_viec(kho: Path, nhanh: str, lenh: str) -> None:
    kq = chay(kho, nhanh, lenh)

    assert kq.returncode == 0, kq.stderr


# ---------- git push nhắm vào main / dev: luôn chặn ----------


@pytest.mark.parametrize(
    "lenh",
    [
        "git push origin dev",
        "git push origin main",
        "git push -f origin main",
        "git push --force origin dev",
        "git push --force-with-lease origin HEAD:dev",
        "git push origin +main",
        "git push origin feature/NT01-thu:main",
        "git push origin feature/NT01-thu:refs/heads/dev",
        "git push origin :dev",
        "git push origin feature/NT01-thu main",
        "git push --all origin",
        "git push --mirror origin",
        "git push -o ci.skip origin dev",
        "git status && git push origin dev",
    ],
)
def test_chan_push_vao_nhanh_chinh_tu_nhanh_viec(kho: Path, lenh: str) -> None:
    kq = chay(kho, "feature/NT01-thu", lenh)

    assert kq.returncode == 2, kq.stderr
    assert "Không push thẳng vào main hay dev" in kq.stderr


@pytest.mark.parametrize("nhanh", ["main", "dev"])
@pytest.mark.parametrize("lenh", ["git push", "git push origin", "git push origin HEAD", "git push -u origin HEAD"])
def test_chan_push_nhanh_hien_tai_khi_dang_o_nhanh_chinh(kho: Path, nhanh: str, lenh: str) -> None:
    kq = chay(kho, nhanh, lenh)

    assert kq.returncode == 2, kq.stderr


@pytest.mark.parametrize(
    "lenh",
    [
        "git push",
        "git push origin",
        "git push -u origin feature/NT01-thu",
        "git push origin HEAD",
        "git push origin feature/NT01-thu:feature/NT01-thu",
        "git push origin --delete feature/cu",
        "git push origin --tags",
    ],
)
def test_cho_phep_push_nhanh_viec(kho: Path, lenh: str) -> None:
    kq = chay(kho, "feature/NT01-thu", lenh)

    assert kq.returncode == 0, kq.stderr


def test_switch_dau_gach_khong_ro_nhanh_thi_chan_commit(kho: Path) -> None:
    kq = chay(kho, "feature/NT01-thu", "git switch - && git commit -m x")

    assert kq.returncode == 2
    assert "Không xác định được nhánh" in kq.stderr


def test_khong_phai_bash_hoac_khong_co_lenh_thi_cho_qua(kho: Path) -> None:
    _git(kho, "switch", "-q", "main")
    kq = subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=json.dumps({"tool_name": "Edit", "tool_input": {"file_path": "a.py"}}),
        capture_output=True,
        text=True,
        env={**os.environ, "CLAUDE_PROJECT_DIR": str(kho)},
    )

    assert kq.returncode == 0


@pytest.mark.parametrize("lenh", ["git push -u origin docs/quy-tac", "git push origin HEAD"])
def test_cho_phep_push_nhanh_docs(kho: Path, lenh: str) -> None:
    kq = chay(kho, "docs/quy-tac", lenh)

    assert kq.returncode == 0, kq.stderr


def test_chan_push_vao_dev_tu_nhanh_docs(kho: Path) -> None:
    kq = chay(kho, "docs/quy-tac", "git push origin docs/quy-tac:dev")

    assert kq.returncode == 2
