# 인계 노트 (2026-11-16)

Kiro Crew 세션에서 Claude Code로 넘기며 남기는 상태. 다 쓰면 이 파일을 지우거나 줄인다.

## 지금 상태

| 항목 | 상태 |
|---|---|
| 해커톤 | 2026-11-14 18:00 제출 완료 (team-008 · 1398). 마지막 심사 커밋 `017c0c6` |
| 배포 | [gymcall.json-server.win](https://gymcall.json-server.win). 홈랩 K3s, ns `gymcall` |
| 파이프라인 | `main` push → `.github/workflows/image.yml`(verify 통과 후 build) → GHCR에 `:<커밋 SHA>`와 `:latest` → ArgoCD Image Updater가 SHA 태그 중 최신을 골라 Application에 기록(`write-back-method: argocd`, Git에는 안 남음) → 롤아웃. base의 `:latest`는 자리 표시 |
| ArgoCD Application | 홈랩 레포 `k8s/argocd/applications/apps/gymcall.yaml`, 소스는 이 레포 `infra/k8s/overlays/prod` |
| DNS | 홈랩 레포 `cloudflare/dns.tf`의 `gymcall` CNAME (Terraform, 적용됨) |
| 테스트 | Vitest 52개 (결정론 로직만) |
| 열린 PR | 없음 |

## 남은 일

1. `tasks.md` 작업 7(데모 검증): API E2E는 프로덕션에서 통과. 화면(카메라, 소리, 파장·흔들림)은 사람 눈 확인이 안 됨
2. 안드로이드 앱 재빌드 후 확인: 하단 시스템 바 가림 수정(`MainActivity` WindowInsets), 터치 없는 소리 재생(`setMediaPlaybackRequiresUserGesture(false)`). PR #36에서 코드만 바꾸고 기기 확인 못 함
3. `main-branch-guard`, `visual-check` 훅은 스크립트 단독 시험만 했고 Kiro 안에서 실제로 도는지 확인 못 함 (Claude Code로 옮기면 의미 없음)
4. README "다음": 실제 친구와 2주 사용 후 답장 대기 57%가 얼마나 줄었는지 측정, iOS 앱

## 함정 (실제로 걸렸던 것)

- **Next 16 `cacheComponents`**: Client Component에서 `useParams()`를 Suspense 밖에서 쓰면 prerender 실패. 서버 페이지에서 `params`를 Suspense 안에서 풀어 넘긴다. Route Handler에 `runtime`/`dynamic` export를 넣으면 빌드 에러
- **Prisma 7**: SQLite도 드라이버 어댑터(`@prisma/adapter-better-sqlite3`) 필요. 클라이언트는 `src/generated/prisma`(gitignore). `pnpm add -D prisma`가 8 rc를 받아 오니 7.x로 고정
- **시간대**: 알람·날짜 키가 로컬 시각 기준. 로컬 실행과 테스트는 `TZ=Asia/Seoul`. 컨테이너는 `TZ` env로 설정됨
- **SSE**: 페이지가 연결을 계속 열어 두므로 Playwright `waitUntil: "networkidle"`이 안 끝남. `"load"`를 쓴다
- **replicas 1 전제**: SSE 구독자와 위치 저장소가 프로세스 메모리. 스케일아웃하면 깨짐. 배포는 `Recreate`
- **마이그레이션**: 컨테이너 시작 시 `prisma migrate deploy`. SQLite가 RWO PVC라 PreSync Job을 쓸 수 없음
- **클립 경로**: `path.join`에 `/*turbopackIgnore: true*/` 없으면 전체 프로젝트 트레이싱 경고
- **카메라·마이크·위치**: HTTPS 또는 localhost만. 로컬은 `127.0.0.1`로 띄우고 시크릿 창으로 두 사람 시연
- **응답 바꾸기**: `respond`는 새로 만들면 201, 바꾸면 200. No Go → Go면 그날 skipping 차감 환불, 무응답 차감은 유지

## 프로덕션에 남은 시험 데이터 (지울 것)

| 종류 | 이름 |
|---|---|
| 계정 | `qa_a_446`, `qa_b_446`, `새벽곰500`, `아침여우500`, `늦잠거북500` |
| 그룹 | "[검증] 데모 E2E", "새벽 헬스", "리허설 새벽조" |

삭제 API는 없다. Pod 안 SQLite(`/app/data/app.db`)에서 지우거나, 데이터가 중요하지 않으면 PVC를 비운다. 비우기 전에 실제 사용자 데이터가 없는지 확인할 것.

## 일부러 레포에 넣지 않은 것

- 근거로 쓴 카카오톡 대화 원문 (README에는 집계 숫자만)
- 개인 프로필 원본 (`.kiro/steering/user-context.md`는 작업 규칙만 추린 것)

## 참고 기록

- 결정 이력과 이유: `BUILD_REPORT.md`의 "개발 과정에서 바뀐 점", 각 PR 본문
- 발표 자료: `PRESENTATION.pdf`, 원본 `design/slides/slides.html`, 스크린샷 스크립트 `design/slides/shoot.mjs`
