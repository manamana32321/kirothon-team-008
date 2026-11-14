#!/usr/bin/env bash
set -u

cat >/dev/null

git rev-parse --git-dir >/dev/null 2>&1 || exit 0
BASE=$(git merge-base HEAD origin/main 2>/dev/null) || exit 0

FE_PATHS=(src/app src/components public ':(exclude)src/app/api')
STAMP=.tmp/visual-check.sha

CHANGED=$( { git diff --name-only "$BASE" -- "${FE_PATHS[@]}"; git ls-files --others --exclude-standard -- "${FE_PATHS[@]}"; } | sort -u)
[ -z "$CHANGED" ] && exit 0

HASH=$( { git diff "$BASE" -- "${FE_PATHS[@]}"; git ls-files --others --exclude-standard -z -- "${FE_PATHS[@]}" | xargs -0 -r cat; } | sha1sum | cut -d' ' -f1)
[ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$HASH" ] && exit 0

printf '화면(FE) 변경이 있습니다. 사용자가 직접 눈으로 확인해야 머지할 수 있습니다.\n\n바뀐 화면 파일:\n%s\n\n다음을 처리하세요.\n1. .kiro/skills/local-check-guide/SKILL.md 절차대로 이 워크트리에서 서버를 띄우고, 확인용 그룹과 멤버를 만들고, 기계로 볼 수 있는 것은 직접 확인합니다.\n2. 사용자에게 확인 안내(주소, 누를 것, 보여야 할 것 표)를 보냅니다.\n3. 안내를 보낸 뒤 아래 명령으로 표시를 남기면 같은 변경에 대해서는 다시 묻지 않습니다. 화면 파일이 또 바뀌면 다시 안내해야 합니다.\n   mkdir -p .tmp && echo %s > %s\n' "$CHANGED" "$HASH" "$STAMP" >&2
exit 1
