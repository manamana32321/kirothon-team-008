#!/usr/bin/env bash
set -u

INPUT=$(cat)

if ! printf '%s' "$INPUT" | grep -qE 'git[[:space:]]+(commit|push)'; then
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
PUSH_MAIN=0
if printf '%s' "$INPUT" | grep -qE 'git[[:space:]]+push[^"]*[[:space:]:]main([[:space:]"]|$)'; then
  PUSH_MAIN=1
fi

if [ "$BRANCH" != "main" ] && [ "$PUSH_MAIN" = "0" ]; then
  exit 0
fi

printf 'main 브랜치에 직접 커밋 또는 push 하려고 해서 차단했습니다.\n워크트리를 만들어 브랜치에서 작업하고 PR로 합치세요. 규칙은 .kiro/steering/worktree.md 에 있습니다.\n' >&2
exit 2
