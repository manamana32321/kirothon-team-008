# Tech

## 스택
- 앱: Next.js (App Router) + TypeScript, API는 Route Handlers
- UI: Tailwind CSS + shadcn/ui
- DB: SQLite + Prisma (설치 없이 clone 후 바로 실행)
- 검증: Zod
- 패키지 매니저: pnpm
- 실시간: Server-Sent Events (Route Handler, Node 런타임)
- 녹음: 브라우저 `MediaRecorder`, 10초 이하로 제한
- 재생: `HTMLAudioElement` 반복 재생

## 저장
- 오디오 파일은 `data/audio/`에 저장하고 DB에는 경로만 둔다. `data/`는 `.gitignore`에 포함한다.
- 시드 데이터는 가상 닉네임과 무음 또는 합성 오디오만 쓴다.

## 인증
- 로그인은 없다. 닉네임과 그룹 초대 코드만 쓴다. 기기는 로컬 저장소에 멤버 ID를 보관한다.

## 알람 동작 제약
- 브라우저는 사용자 입력 없이 소리를 재생하지 못한다. "알람 켜기" 버튼을 한 번 눌러 재생 권한을 얻는다.
- 탭이 열려 있어야 알람이 울린다. 백그라운드 알람은 범위 밖이다.
- 마이크는 HTTPS 또는 localhost에서만 동작한다.

## 규칙
- 코드에 설명 주석을 달지 않는다. 근거는 커밋 메시지에 둔다.
- 요청된 범위만 구현한다. 추상화와 설정 옵션을 미리 만들지 않는다.
- 테스트는 결정론 코드(알람 발동 판정, 참가 상태 집계, 포인트 차감)에 대해서만 작성한다.
- `.env`는 커밋하지 않는다.
