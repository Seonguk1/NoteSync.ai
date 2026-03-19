#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/../.venv/Scripts/python.exe}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python"
fi

# Windows/Git Bash에서 한글 로그가 깨지지 않도록 UTF-8 실행을 강제한다.
export PYTHONUTF8="${PYTHONUTF8:-1}"
export PYTHONIOENCODING="${PYTHONIOENCODING:-utf-8}"
export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"

exec "$PYTHON_BIN" -X utf8 scripts/smoke_e2e.py "$@"
