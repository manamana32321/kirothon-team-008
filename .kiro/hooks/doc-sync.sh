#!/usr/bin/env bash
set -u

cat >/dev/null

[ -f BUILD_REPORT.md ] || exit 0

REPORT_TIME=$(stat -c %Y BUILD_REPORT.md)
NEWEST=0
NEWEST_FILE=""

while IFS= read -r f; do
  t=$(stat -c %Y "$f")
  if [ "$t" -gt "$NEWEST" ]; then
    NEWEST=$t
    NEWEST_FILE=$f
  fi
done < <(find src prisma infra tests Dockerfile package.json -type f 2>/dev/null)

if [ "$NEWEST" -le "$REPORT_TIME" ]; then
  exit 0
fi

printf '코드가 BUILD_REPORT.md보다 나중에 바뀌었습니다 (최근 변경: %s).\n다음을 처리하세요.\n1. BUILD_REPORT.md의 표에 이번 변경의 단계, 사용한 Kiro 기능, 한 일, 결과물 위치를 한 줄 추가합니다. Kiro 기능 칸에는 Spec, Steering, Hooks, MCP처럼 구체적인 기능 이름을 씁니다.\n2. 이번 변경으로 틀려진 내용이 있으면 .kiro/steering/, .kiro/specs/, .kiro/hooks/, README.md를 함께 고칩니다. 영향이 없으면 건드리지 않습니다.\n3. 처리 후 BUILD_REPORT.md를 저장하면 이 점검은 통과합니다.\n' "$NEWEST_FILE" >&2
exit 1
