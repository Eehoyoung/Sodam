#!/usr/bin/env bash
# Codex PostToolUse 훅: 프론트엔드 TS/TSX/JS 파일 수정 시 prettier 자동 포맷.
# stdin으로 훅 JSON을 받아 file_path를 추출한다.

set -euo pipefail

INPUT=$(cat)

# jq 없이 file_path 추출 (Windows Git Bash 호환)
FILE_PATH=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

[ -z "$FILE_PATH" ] && exit 0

# 프론트엔드 소스만 대상 (백엔드 Java는 IDE 포맷터 사용)
case "$FILE_PATH" in
  *frontend/src/*.ts|*frontend/src/*.tsx|*frontend/src/*.js|*frontend\\src\\*.ts|*frontend\\src\\*.tsx|*frontend\\src\\*.js)
    PROJECT_DIR="${CODEX_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
    FRONTEND_DIR="$PROJECT_DIR/frontend"
    if [ -f "$FILE_PATH" ] && [ -d "$FRONTEND_DIR/node_modules/prettier" ]; then
      (cd "$FRONTEND_DIR" && npx prettier --write "$FILE_PATH" >/dev/null 2>&1) || true
    fi
    ;;
esac

exit 0
