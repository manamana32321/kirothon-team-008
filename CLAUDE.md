# 운동기 (Gymcall) — Claude Code 안내

KIROTHON 2026(2026-11-14)에 Kiro로 만든 프로젝트. 해커톤 이후 Claude Code로 이어서 완성한다.

**규칙과 설계의 정본은 `.kiro/`다.** 이 파일은 어디를 읽을지만 알려 준다. 같은 내용을 여기에 다시 쓰지 않는다. 규칙을 바꾸면 `.kiro/` 쪽을 고친다.

## 먼저 읽을 것

1. `docs/HANDOFF.md` — 지금 상태, 남은 일, 함정, 지울 시험 데이터
2. `AGENTS.md` — Next.js 16은 학습 데이터와 API가 다르다. 코드 쓰기 전에 `node_modules/next/dist/docs/` 확인

## 규칙 (`.kiro/steering/`, 전부 적용)

| 파일 | 내용 |
|---|---|
| `user-context.md` | 작업 규칙: 추정 단정 금지, 범위 밖 수정 금지, 설명 주석 금지, 과설계 금지, 근본 원인 우선 |
| `behavior.md` | 코딩 전에 생각, 단순함 우선, 수술적 변경, 검증 가능한 목표 |
| `product.md` | 제품 정의, 이름(Gymcall / 운동기 / 아이콘 ㅇㄷㄱ), 범위 밖 |
| `tech.md` | 스택, 저장, 인증, 알람 재생 제약 |
| `structure.md` | 디렉터리, 네이밍, 커밋 |
| `design.md` | 비주얼 스타일 |
| `deploy.md` | 홈랩 K3s 배포 규칙과 배포 검증 4단계 |
| `worktree.md` | 워크트리, main 직접 커밋 금지, PR은 에이전트가 만들고 사용자가 머지, 화면 변경은 눈 확인 후 머지 |

## 기능 정의 (`.kiro/specs/`)

| spec | 상태 |
|---|---|
| `gymcall/` | 본 기능. requirements·design·tasks. 정본 |
| `gymcall-meetup/` | 모임 지도·자동 출석. 구현됨, 그룹 화면의 지도 탭은 숨김 |
| `gymcall-wakeup/` | 실시간 깨우기. 찌르기로 합쳐짐. requirements 맨 위 "바뀜" 참고 |

기획이 바뀌면 spec부터 고치고 코드를 고친다. 작업이 끝나면 `tasks.md` 체크.

## Kiro 훅 (`.kiro/hooks/`) — Claude Code에서는 자동으로 안 돈다

Kiro 전용 형식이라 Claude Code가 실행하지 않는다. 같은 규칙을 직접 지킨다.

| 훅 | 지킬 것 |
|---|---|
| `secret-guard` | 키·토큰·`.env`를 커밋하지 않는다. 레포는 Public |
| `main-branch-guard` | `main`에 직접 커밋·push 금지 |
| `visual-check` | `src/app`(API 제외)·`src/components`·`public`이 바뀌면 `.kiro/skills/local-check-guide` 절차로 사용자 눈 확인 안내 |
| `doc-sync` | 해커톤 제출용(`BUILD_REPORT.md` 갱신 요구). 해커톤이 끝나 더는 필요 없음 |

## 스킬 (`.kiro/skills/`)

`local-check-guide`(화면 확인 안내), `android-build`(안드로이드 빌드), `wrap-up`(세션 정리). 필요할 때 SKILL.md를 읽고 따른다.

## 명령

```bash
pnpm install
pnpm db:migrate
TZ=Asia/Seoul pnpm dev
TZ=Asia/Seoul pnpm test
pnpm lint && pnpm exec tsc --noEmit
```
