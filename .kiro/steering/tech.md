# Tech

## 스택
- 앱: Next.js 16 (App Router) + TypeScript, API는 Route Handlers
- UI: Tailwind CSS 4 + shadcn/ui
- DB: SQLite + Prisma 7 (`@prisma/adapter-better-sqlite3`). 클라이언트는 `src/generated/prisma`에 생성되고 커밋하지 않는다. DB 경로 기본값은 `src/lib/config.ts` 한 곳에 둔다
- 테스트: Vitest (`tests/**/*.test.ts`)
- 검증: Zod
- 패키지 매니저: pnpm
- 실시간: Server-Sent Events (Route Handler, Node 런타임)
- 녹화: 브라우저 `MediaRecorder`, 10초 이하. 카메라 켜면 영상+음성, 끄면 음성만
- 재생: 영상은 `HTMLVideoElement`, 음성은 `HTMLAudioElement` 반복 재생
- 데모 브라우저: Chrome (녹화 형식 webm)

## 저장
- 클립 파일은 `data/clips/`에 저장하고 DB에는 경로와 mimeType만 둔다. `data/`는 `.gitignore`에 포함한다.
- 시드 데이터는 가상 닉네임과 합성 영상·음성만 쓴다.

## 인증
- 로그인은 없다. 닉네임과 그룹 초대 코드만 쓴다. 기기는 로컬 저장소에 멤버 ID를 보관한다.

## 알람 동작 제약
- 브라우저는 사용자 입력 없이 소리를 재생하지 못한다. "알람 켜기" 버튼을 한 번 눌러 재생 권한을 얻는다.
- 탭이 열려 있어야 알람이 울린다. 백그라운드 알람은 범위 밖이다.
- 카메라와 마이크는 HTTPS 또는 localhost에서만 동작한다.

## 규칙
- 코드에 설명 주석을 달지 않는다. 근거는 커밋 메시지에 둔다.
- 요청된 범위만 구현한다. 추상화와 설정 옵션을 미리 만들지 않는다.
- 테스트는 결정론 코드(알람 발동 판정, 참가 상태 집계, 포인트 차감)에 대해서만 작성한다.
- `.env`는 커밋하지 않는다.
