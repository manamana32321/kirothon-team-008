# Git Worktree 규칙

- 브랜치 작업은 워크트리에서 한다. `main` 폴더에서 직접 편집하지 않는다.
- 워크트리는 레포 밖 형제 폴더에 만든다: `~/kirothon-team-008-worktrees/{워크트리명}`.
- 폴더 이름은 브랜치 이름에서 `feat/` 같은 접두어를 뗀 것이다.
- 생성: `git worktree add ~/kirothon-team-008-worktrees/{이름} -b {브랜치}`.
- 머지 후 정리: `git worktree remove {경로}` 와 `git branch -d {브랜치}`.
- `main`에는 직접 커밋과 push를 하지 않는다. 브랜치에서 작업하고 브랜치를 push한다.
- PR은 에이전트가 만들고, 사용자가 GitHub에서 머지한다. 에이전트는 `main`에 push하지 않는다.
- 화면(FE) 변경이 든 PR은 사용자가 직접 눈으로 본 뒤 머지한다. 에이전트는 `.kiro/skills/local-check-guide` 절차로 확인 안내를 보낸다. `visual-check` 훅이 이를 점검한다.
- gitignore된 `.env`는 워크트리로 복사하되 커밋하지 않는다.
