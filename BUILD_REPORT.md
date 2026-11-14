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
| 구현 | Hooks (Stop) | 코드 변경 시 BUILD_REPORT와 문서 갱신을 점검 | `.kiro/hooks/doc-sync.json`, `.kiro/hooks/doc-sync.sh` |
| 검증 | Hooks (PreToolUse) | 시크릿 유출 차단. kiro-cli 3.3.0에서 가짜 AWS 키 쓰기 차단, 평문 통과 확인 | `.kiro/hooks/secret-guard.json`, `.kiro/hooks/secret-guard.sh` |
| 검증 | Hooks (Stop) | doc-sync 훅이 에이전트의 BUILD_REPORT 갱신을 실제로 유도함을 확인 | `.kiro/hooks/doc-sync.json` |
| 기타 | Steering + Hooks | 개인 worktree 규칙과 main 직접 커밋/push 차단 훅 이식. 스크립트 단독 시험만 완료, Kiro 실행 시험은 아직 | `.kiro/steering/worktree.md`, `.kiro/hooks/main-branch-guard.json` |

## 개발 과정에서 바뀐 점

- 사람 특징 기억 도우미에서 짐콜로 주제를 바꿨다. 이유: 평일 매일 겪는 불편이고, 외부 API 없이 작동하며, 두 화면이 동시에 바뀌는 데모가 가능하다.
- 전화 버튼을 비동기 음성 녹음 전송으로 바꿨다. 이유: WebRTC 없이 구현 가능하고 친구 목소리가 알람이 된다.
- 음성 녹음을 10초 영상으로 바꾸고, 카메라를 끄면 음성만 보내게 했다. 이유: 같은 `MediaRecorder` 흐름이라 구현 차이가 작고, 친구 얼굴이 뜨는 알람이 데모 효과가 크다. 영상과 음성은 Clip 모델 하나로 두고 mimeType만 다르게 저장한다.
- 앱 이름을 가칭 wake-buddy에서 짐콜(gymcall)로 정했다. 이유: 깨우기만이 아니라 같이 운동하러 부르는 것이 핵심이다.
- TWA/네이티브 대신 웹으로 정했다. 이유: TWA도 Chrome 엔진이라 백그라운드 알람과 자동 재생 제약이 같다.
- LLM과 Bedrock을 뺐다. 이유: 비용과 키 관리 부담, 핵심 가치와 무관.
- 벌금은 실제 결제 대신 가상 포인트 장부로 한정했다.

## 어려웠던 점과 해결 방법

- 기존 하네스가 Claude Code 형식이었다. 훅 입력 JSON 필드가 다를 수 있어 특정 필드 대신 입력 전체를 검사하도록 다시 짰고, 실제 Kiro에서 시험했다.
- Stop 훅 트리거 이름을 `AgentStop`으로 썼더니 동작하지 않았다. 이름 네 가지를 동시에 시험해 `Stop`이 맞음을 확인했다.
- 한계: 훅 시험은 Windows의 kiro-cli로만 했고 IDE에서는 확인하지 못했다.
