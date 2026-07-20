#!/usr/bin/env bash
# PreToolUse(Write|Edit) 훅 — 시크릿으로 보이는 내용의 파일 쓰기를 차단한다.
# exit 2 = 도구 호출 차단 (stderr 메시지가 Claude에게 전달됨)

set -uo pipefail

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

# 1) .env 계열 파일 자체를 프로젝트 안에 쓰는 것 차단 (.env.example 은 허용)
case "$FILE_PATH" in
  *.env.example|*.env.sample) ;;
  *.env|*/.env.*|*\\.env)
    echo "차단: .env 파일은 커밋 대상 저장소에 직접 쓰지 않는다 (.claude/rules/security.md). 사용자에게 직접 만들도록 안내할 것." >&2
    exit 2
    ;;
esac

# 2) 실 시크릿 패턴 차단 (프로덕션 키 형식 위주 — dev 디폴트/플레이스홀더는 통과)
PATTERNS='live_sk_[A-Za-z0-9]{10,}|live_ck_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|sk-ant-[A-Za-z0-9-]{20,}'

if printf '%s' "$INPUT" | grep -qE "$PATTERNS"; then
  echo "차단: 실 시크릿 패턴(토스 live 키/AWS 키/개인키 등)이 감지됐다. 시크릿은 .env 또는 환경변수로 주입하고 코드에는 플레이스홀더만 사용할 것." >&2
  exit 2
fi

exit 0
