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
| 구현 | Spec (tasks 6) | 화면 4개 구현: 첫 화면(만들기/참여), 그룹 화면(알람 설정, 멤버 상태, 벌금 장부, SSE 갱신), 클립 녹화(카메라 토글, 카메라 거부 시 음성 전환, 10초 자동 정지), 알람 오버레이(클립 반복 재생, 없으면 WebAudio 비프, 간다/못 간다로 응답과 정지). API 응답 타입 `GroupState`를 서버와 화면이 같이 씀. lint, tsc, build, 페이지 200 확인 | `src/app/page.tsx`, `src/app/g/[id]/page.tsx`, `src/components/` |
| 구현 | Spec (gymcall-meetup tasks 1-3) | 사용자가 작성한 부가 기능 spec(모임 지도, 자동 출석)의 로직, 데이터 모델, API 구현. 위치는 DB가 아니라 메모리에만 둠. 테스트 23개 추가(총 52개). dev 서버 curl로 409·400·429, 자동 출석, 못 간다 유지, 정확도 초과, 늦은 도착 무시, 시간대 종료 시 삭제, SSE `location.updated` 확인 | `src/lib/geo.ts`, `src/lib/meetup.ts`, `src/lib/locations.ts`, `src/app/api/groups/[id]/location*/`, `prisma/migrations/*_meetup/` |
| 구현 | Spec (gymcall-meetup tasks 4) | 지도 화면: 현황/지도 탭, Leaflet + OSM(`next/dynamic` ssr 끔), 멤버 점과 60초 흐림, 공유 안 함 목록, 모임 장소 지정(지도 누르기, 50/100/200m), 위치 공유 스위치(권한 거부·시간대 밖 안내, 10초 묶음 전송, 끄거나 탭 닫으면 삭제), 자동 출석은 "도착"으로 표시. lint, tsc, build 통과 | `src/components/meetup-tab.tsx`, `src/components/meetup-map.tsx`, `src/lib/use-location-sharing.ts` |
| 구현 | Spec (design 화면 원칙 갱신) | 모임 설정 화면 추가: 모임 시간, 벌금 켜기/끄기, 모임 장소 지정·삭제, 초대 QR(`qrcode.react`)과 코드·링크 복사. 그룹 화면은 알람 한 줄, 멤버 상태, 탭만 남김. `DELETE /meetup` 추가, 벌금 0이면 차감 기록 안 만듦. curl로 설정 페이지 200, 벌금 끔 상태에서 못 간다 응답 시 차감 0건, 장소 저장·삭제 확인 | `src/app/g/[id]/settings/`, `src/components/group-settings.tsx`, `.kiro/specs/gymcall/design.md` |
| 구현 | Spec (gymcall-wakeup 1단계 작업 1-5) | 실시간 깨우기(SSE) 구현: `lib/wake.ts` 상태 계산(5분 만료), WakeCall 모델, 호출·확인 API, `wake.called/acked` 이벤트, 멤버별 `awake`와 `wake` 상태, 알람 오버레이 재사용("일어났다" 버튼 하나). 테스트 7개 추가(총 59개). curl로 자기 호출 400, 없는 멤버 404, 중복 호출 2건 확인 시 acked 2, 재확인 409, SSE 이벤트 2종 수신 확인 | `src/lib/wake.ts`, `src/app/api/groups/[id]/wake/`, `prisma/migrations/*_wake_call/`, `tests/wake.test.ts` |
| 구현 | Spec (gymcall R4·R5, design 화면·찌르기 갱신) | 그룹 홈을 셋로그식 카드 그리드로 다시 짬. 카드마다 멤버의 최근 클립 무음 반복, 다른 멤버 카드 토글 선택 → 하단 "찌르기"(`POST /poke`, 여러 명), 내 카드는 "클립 만들기" 오버레이. 별도 알람 화면을 없애고 알람 중엔 잔잔한 파장 + 다른 멤버 클립 소리, 찔리면 강한 파장과 흔들림. 클립 받는 사람 지정 제거(마이그레이션). PR #16의 전체 화면 호출은 찌르기로 합침. curl로 클립 201, 찌르기 400·404·201, `lastPoke` 반영, SSE `poke.sent` 확인 | `src/components/member-card.tsx`, `src/components/group-view.tsx`, `src/app/api/groups/[id]/poke/`, `src/app/globals.css` |
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
- 설정 화면 `/g/[id]/settings`를 따로 만들었다. 모임 시간, 벌금(선택), 모임 장소(선택), 초대 코드와 QR을 그리로 옮겼다. 이유: 매일 아침 보는 그룹 화면의 인지 부하를 줄인다. 벌금을 끄면 포인트와 장부도 그룹 화면에서 숨긴다.
- 그룹 홈을 셋로그식 카드 그리드로 바꾸고 별도 알람 화면을 없앴다. 깨우기는 "찌르기" 하나로 합쳤다(PR #16의 전체 화면 호출, "일어났다" 제거). 클립은 받는 사람을 고르지 않고 내 카드에 건다. 이유: 아침에 한 화면에서 친구들 상태를 보고 바로 찌를 수 있게 하고, 알람 중에는 응답 안 한 사람에게 여러 친구 목소리가 함께 울리게 해서 일어날 압박을 키운다.
- TWA/네이티브 대신 웹으로 정했다. 이유: TWA도 Chrome 엔진이라 백그라운드 알람과 자동 재생 제약이 같다.
- LLM과 Bedrock을 뺐다. 이유: 비용과 키 관리 부담, 핵심 가치와 무관.
- 벌금은 실제 결제 대신 가상 포인트 장부로 한정했다.

## 어려웠던 점과 해결 방법

- 기존 하네스가 Claude Code 형식이었다. 훅 입력 JSON 필드가 다를 수 있어 특정 필드 대신 입력 전체를 검사하도록 다시 짰고, 실제 Kiro에서 시험했다.
- Stop 훅 트리거 이름을 `AgentStop`으로 썼더니 동작하지 않았다. 이름 네 가지를 동시에 시험해 `Stop`이 맞음을 확인했다.
- 한계: 훅 시험은 Windows의 kiro-cli로만 했고 IDE에서는 확인하지 못했다.
- Next.js 16의 `cacheComponents`에서 `useParams()`를 Suspense 밖에서 쓰면 prerender가 막혔다. 페이지를 서버 컴포넌트로 두고 `params`를 Suspense 안에서 풀어 클라이언트 컴포넌트에 넘겨 해결했다.
