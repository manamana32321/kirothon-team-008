# BUILD REPORT

## Kiro 활용 내역

| 단계 | 사용한 Kiro 기능 | 무엇을 했는지 | 결과물 위치 |
|---|---|---|---|
| 기획 | Spec (requirements) | 요구사항 6개와 인수 조건 작성. Crew 에이전트가 Spec 형식에 맞춰 작성했고 Kiro IDE의 Spec 흐름으로 만든 것은 아님 | `.kiro/specs/gymcall/requirements.md` |
| 기획 | Steering | 짐콜(그룹 알람, 영상 알람, 참가 공유, 가상 벌금) 제품 정의 | `.kiro/steering/product.md` |
| 설계 | Spec (design) | 데이터 모델, API, SSE 이벤트, 알람 재생 흐름 작성. Crew 에이전트가 Spec 형식에 맞춰 작성 | `.kiro/specs/gymcall/design.md` |
| 설계 | Spec (tasks) | 9개 작업으로 분해. 하위 작업마다 요구사항 번호 연결, 병렬 가능 구간 표시. Crew 에이전트가 Spec 형식에 맞춰 작성 | `.kiro/specs/gymcall/tasks.md` |
| 설계 | Steering | 웹 앱, SSE, MediaRecorder, SQLite 스택과 폴더 구조 정의 | `.kiro/steering/tech.md`, `.kiro/steering/structure.md` |
| 설계 | Steering | 개인 하네스(karpathy 규칙)를 Kiro 형식으로 이식 | `.kiro/steering/behavior.md` |
| 설계 | Steering | 홈랩 k8s/ArgoCD 배포 규칙 정의 | `.kiro/steering/deploy.md` |
| 구현 | Spec (tasks 1) | 작업 1 골격: Next.js 16 + Tailwind 4 + shadcn/ui, Prisma 7 + SQLite(better-sqlite3 어댑터), Zod, Vitest. lint, tsc, build, 페이지 응답 확인 | `package.json`, `prisma.config.ts`, `src/db.ts` |
| 구현 | Spec (tasks 2·3·4) + Crew 병렬 서브에이전트 | 작업 2(데이터 모델), 3(결정론 로직), 4(SSE)를 서브에이전트 3개가 각자 워크트리에서 동시에 구현. 공유 문서는 건드리지 않게 소유권을 나눠 충돌 없이 PR #4~#6으로 머지. 머지 전 네 브랜치를 합쳐 테스트 29개, lint, build, 마이그레이션·시드 확인 | `prisma/`, `src/lib/`, `src/app/api/groups/[id]/events/`, `tests/` |
| 구현 | Spec (tasks 5) | API 7개 구현. 클립 선택 규칙(받는 사람의 가장 오래된 미사용 클립)을 서버 한 곳에 두고 `nextClip`으로 내려줌. dev 서버에 curl 시나리오로 생성·참여·409·404·400·클립 업로드/재생 바이트 일치·무응답 지연 차감·중복 차감 없음·SSE 이벤트 수신 확인 | `src/app/api/`, `src/lib/penalty-store.ts`, `src/lib/http.ts` |
| 구현 | Spec (tasks 8 준비) | 기능과 겹치지 않는 배포 준비를 먼저 진행: Dockerfile, GHCR Actions, Kustomize 매니페스트, 홈랩 ArgoCD Application과 DNS(별도 레포 PR) | `Dockerfile`, `.github/workflows/image.yml`, `infra/k8s/` |
| 기타 | Steering | 이름과 아이콘 정의: 영어 Gymcall, 한국어 운동기, 아이콘 ㅇㄷㄱ | `.kiro/steering/product.md`, `src/app/icon.svg` |
| 구현 | Hooks (Stop) | 코드 변경 시 BUILD_REPORT와 문서 갱신을 점검 | `.kiro/hooks/doc-sync.json`, `.kiro/hooks/doc-sync.sh` |
| 검증 | Hooks (PreToolUse) | 시크릿 유출 차단. kiro-cli 3.3.0에서 가짜 AWS 키 쓰기 차단, 평문 통과 확인 | `.kiro/hooks/secret-guard.json`, `.kiro/hooks/secret-guard.sh` |
| 검증 | Hooks (Stop) | doc-sync 훅이 에이전트의 BUILD_REPORT 갱신을 실제로 유도함을 확인 | `.kiro/hooks/doc-sync.json` |
| 기타 | Steering + Hooks | 개인 worktree 규칙과 main 직접 커밋/push 차단 훅 이식. 스크립트 단독 시험만 완료, Kiro 실행 시험은 아직 | `.kiro/steering/worktree.md`, `.kiro/hooks/main-branch-guard.json` |
| 검증 | Skills + Hooks (Stop) | 화면 변경은 사용자가 눈으로 확인 후 머지. 개인 Claude Code 스킬 `local-check-guide`를 Kiro 워크스페이스 스킬로 이식하고, main 대비 화면 파일 변경이 있는데 확인 안내 표시가 없으면 에이전트를 멈춰 안내를 요구하는 훅 추가. 스크립트 단독 시험 6가지 통과 | `.kiro/skills/local-check-guide/SKILL.md`, `.kiro/hooks/visual-check.json` |

## 개발 과정에서 바뀐 점

- 사람 특징 기억 도우미에서 짐콜로 주제를 바꿨다. 이유: 평일 매일 겪는 불편이고, 외부 API 없이 작동하며, 두 화면이 동시에 바뀌는 데모가 가능하다.
- 전화 버튼을 비동기 음성 녹음 전송으로 바꿨다. 이유: WebRTC 없이 구현 가능하고 친구 목소리가 알람이 된다.
- 음성 녹음을 10초 영상으로 바꾸고, 카메라를 끄면 음성만 보내게 했다. 이유: 같은 `MediaRecorder` 흐름이라 구현 차이가 작고, 친구 얼굴이 뜨는 알람이 데모 효과가 크다. 영상과 음성은 Clip 모델 하나로 두고 mimeType만 다르게 저장한다.
- 앱 이름을 가칭 wake-buddy에서 짐콜(Gymcall)로 정했다. 한국어 이름은 운동기, 아이콘은 친구에게 보내던 카톡 "ㅇㄷㄱ?"에서 따왔다. 이유: 깨우기만이 아니라 같이 운동하러 부르는 것이 핵심이고, 원래 쓰던 우회 행동을 그대로 이름에 남긴다.
- 매니페스트 폴더를 `deploy/k8s/`에서 `infra/k8s/`로 옮겼다. 이유: 기존 AMANG 레포와 같은 구조로 맞춘다.
- TWA/네이티브 대신 웹으로 정했다. 이유: TWA도 Chrome 엔진이라 백그라운드 알람과 자동 재생 제약이 같다.
- LLM과 Bedrock을 뺐다. 이유: 비용과 키 관리 부담, 핵심 가치와 무관.
- 벌금은 실제 결제 대신 가상 포인트 장부로 한정했다.

## 어려웠던 점과 해결 방법

- 기존 하네스가 Claude Code 형식이었다. 훅 입력 JSON 필드가 다를 수 있어 특정 필드 대신 입력 전체를 검사하도록 다시 짰고, 실제 Kiro에서 시험했다.
- Stop 훅 트리거 이름을 `AgentStop`으로 썼더니 동작하지 않았다. 이름 네 가지를 동시에 시험해 `Stop`이 맞음을 확인했다.
- 한계: 훅 시험은 Windows의 kiro-cli로만 했고 IDE에서는 확인하지 못했다.
