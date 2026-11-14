#!/usr/bin/env bash
set -u

INPUT=$(cat)
HITS=""

if printf '%s' "$INPUT" | grep -qE 'AKIA[0-9A-Z]{16}'; then
  HITS="${HITS}  - AWS Access Key ID\n"
fi

if printf '%s' "$INPUT" | grep -qE 'BEGIN [A-Z ]*PRIVATE KEY'; then
  HITS="${HITS}  - Private key\n"
fi

if printf '%s' "$INPUT" | grep -qE 'gh[pousr]_[A-Za-z0-9]{36,}'; then
  HITS="${HITS}  - GitHub token\n"
fi

if printf '%s' "$INPUT" | grep -qiE '(api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer)[^A-Za-z0-9]{1,6}[A-Za-z0-9+/=_-]{32,}'; then
  HITS="${HITS}  - 하드코딩된 시크릿 또는 토큰 값\n"
fi

if [ -z "$HITS" ]; then
  exit 0
fi

printf '시크릿으로 보이는 값이 감지되어 차단했습니다. 이 레포는 Public입니다.\n\n감지된 패턴:\n%b\n값은 환경변수로 읽고 .env는 커밋하지 마세요. .env.example에는 빈 값만 둡니다.\n' "$HITS" >&2
exit 2
