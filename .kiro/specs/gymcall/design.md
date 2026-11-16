# 설계: 운동기 (Gymcall)

요구사항: `.kiro/specs/gymcall/requirements.md`. 스택은 `.kiro/steering/tech.md`를 따른다.

> 바뀜 (2026-11-16): 계정(R7)과 탭 밖 알림(R8)을 반영했다. 데이터 모델 표는 `prisma/schema.prisma`와 겹쳐 틀어지므로 설계상 제약만 남겼다. 받는 사람별 `nextClip`/`usedDate` 규칙은 쓰지 않는다.

## 임시값 (열린 질문)
- 무응답 확정 대기: 알람 시각 후 10분. 상수 `NO_RESPONSE_MINUTES` 한 곳에 둔다.
- 알람 반복: 매일 반복. 요일 설정은 MVP에서 뺀다. 알람은 시각(HH:MM)만 가진다.

## 구조

```
브라우저 A ──POST──> Route Handlers ──> Prisma(SQLite)
브라우저 B <──SSE─── /api/groups/:id/events <── events.ts (프로세스 내 pub/sub)
브라우저 ──클립 업로드──> /api/groups/:id/clips ──> data/clips/
서버 타이머(alarm-push.ts) ──웹 푸시──> 탭을 닫은 브라우저
안드로이드 AlarmWatchService ──10초 폴링──> /api/auth/me, /api/groups/:id
```

- 서버는 단일 프로세스다. SSE 구독자 목록이 메모리에 있으므로 replicas는 1이다.
- 알람 소리는 열린 화면이 스스로 판정해 낸다. 탭이 닫혀 있으면 서버가 웹 푸시 알림만 보낸다 (아래 "탭 밖 알림").
- 상태 변경이 생기면 서버가 그룹 단위로 SSE 이벤트를 발행한다.

## 코드와 판단 위치
LLM은 쓰지 않는다. 모든 판단은 결정론 코드다.

| 모듈 | 하는 일 |
|---|---|
| `lib/alarm.ts` | 현재 시각과 알람 시각으로 "울려야 하는가", "오늘 날짜 키" 계산 |
| `lib/attendance.ts` | 응답 목록과 시각으로 멤버별 상태(pending, going, skipping, no_response) 집계 |
| `lib/penalty.ts` | 확정된 불참 목록으로 포인트 차감 계산 |
| `lib/clip.ts` | 녹화 형식 선택, 영상/음성 판정 |
| `lib/events.ts` | 그룹별 SSE 구독과 발행 |
| `lib/auth.ts` | 비밀번호 해시, 쿠키 세션, API 권한 확인 |
| `lib/alarm-push.ts` | 알람 시각에 미응답 멤버에게 웹 푸시 |

## 데이터 모델 (Prisma)

필드 정의의 정본은 `prisma/schema.prisma`다. 여기에는 설계상 이유가 있는 제약만 적는다.

- `Response`와 `PenaltyLog`는 `(memberId, date)` unique. 하루 한 응답, 하루 한 차감. 무응답 차감을 여러 번 평가해도 한 번만 깎인다.
- `Member`는 `(groupId, userId)` unique. 한 계정은 그룹마다 멤버 하나다. `userId`가 비어 있는 멤버는 로그인 도입 전 데이터이고, 같은 닉네임 계정이 참여하면 그 멤버를 이어받는다.
- `AuthSession`에는 토큰의 SHA-256 해시만 둔다. 원문 토큰은 쿠키에만 있다.
- `Clip.toMemberId`는 쓰지 않는다(항상 비움). 클립은 보낸 멤버의 카드에 걸린다.
- `WakeCall`은 찌르기 기록이다. `PushSubscription`은 `endpoint` unique.
- `date`는 알람이 울리는 날의 로컬 날짜 `YYYY-MM-DD`다.
- 불참 확정은 "skipping 응답" 또는 "알람 시각 + 10분이 지났는데 응답 없음"이다.

## API

| 메서드 경로 | 요구사항 | 동작 |
|---|---|---|
| POST `/api/auth/signup` | R7 | 가입하고 세션 쿠키 발급. 중복 닉네임은 409 |
| POST `/api/auth/login` | R7 | 로그인. 틀리면 401 |
| POST `/api/auth/logout` | R7 | 세션 삭제 |
| GET `/api/auth/me` | R7 | 내 계정과 내 그룹 목록. 로그인 전이면 `{ user: null }` |
| POST `/api/groups` | R1 | 그룹과 첫 멤버 생성, 초대 코드 발급 |
| POST `/api/groups/join` | R1 | 초대 코드 또는 그룹 id로 참여. 없으면 404, 이미 멤버면 그 멤버를 돌려줌 |
| GET `/api/groups/:id/preview` | R1 | 그룹 링크로 들어온 비멤버에게 그룹 이름만 보임 |
| GET `/api/groups/:id` | R5, R6 | 그룹, 멤버, 오늘 상태, 포인트 |
| PUT `/api/groups/:id/alarm` | R2 | 알람 시각과 벌금 설정. `group.updated` 발행 |
| POST `/api/groups/:id/respond` | R3 | 오늘 응답 기록. skipping이면 즉시 차감. `response.created` 발행 |
| DELETE `/api/groups/:id/respond` | — | 시연용 임시 기능. 오늘 응답을 지우고 No Go 차감을 돌려줌 |
| POST `/api/groups/:id/clips` | R4 | multipart 업로드. 10초, 8MB 이하, `video/*` 또는 `audio/*`만 허용. `clip.created` 발행 |
| GET `/api/clips/:id` | R4, R7 | 저장된 mimeType으로 스트림. 그 그룹 멤버만 |
| POST `/api/groups/:id/poke` | R5 | 아래 "찌르기" |
| GET `/api/groups/:id/events` | R2, R3, R5 | SSE 스트림 |
| GET `/api/push/key` | R8 | VAPID 공개키 |
| POST `/api/groups/:id/push` | R8 | 내 멤버의 푸시 구독 저장 |

- 모임 장소와 위치 API는 `.kiro/specs/gymcall-meetup/design.md`에 있다.
- 가입, 로그인, `auth/me`, `push/key` 말고는 모두 로그인이 필요하다. 멤버 id를 받는 API는 그 멤버가 내 것인지(`requireMember`), 그룹 API는 내가 그 그룹 멤버인지(`requireGroupMember`) 확인한다.
- 입력은 Zod로 검증한다. 스키마는 `lib/schemas.ts` 한 곳에만 정의하고 클라이언트도 같은 것을 쓴다.
- 무응답 확정은 `GET /api/groups/:id`가 호출될 때 지연 평가한다. 별도 스케줄러를 두지 않는다. 확정되면 PenaltyLog를 만들고 `penalty.applied`를 발행한다.
- 시작 포인트는 그룹 생성 시 100, 차감량 기본값은 10이다. 차감량은 알람 설정에서 바꾼다.

## SSE 이벤트
`group.updated`, `response.created`, `clip.created`, `penalty.applied`, `poke.sent`, `location.updated`.
이벤트는 "다시 불러오라"는 신호만 담고, 화면은 `GET /api/groups/:id`로 상태를 갱신한다. 상태 정의가 한 곳에 남는다.

## 화면
원칙: 매일 보는 그룹 화면에는 "오늘 할 일"만 둔다. 가끔 바꾸는 값은 설정 화면으로 뺀다. 아침에 보는 사람의 인지 부하를 줄이기 위해서다.

- `/` 로그인·가입, 내 그룹 목록, 그룹 만들기, 코드로 참여
- `/g/[id]` 그룹 화면 (매일, 셋로그식 카드 그리드). 멤버가 아니면 그룹 이름과 참여 버튼만 보인다
  - 알람 시각 한 줄. 시각이 없으면 설정으로 가는 안내 하나. "알람 켜기" 버튼은 없다(앱은 WebView 설정으로 자동 재생, 브라우저는 첫 터치로 소리 허락)
  - 멤버 카드 2열 그리드. 내 카드가 맨 앞. 각 카드는 그 멤버의 최근 클립을 소리 없이 반복 재생하고 닉네임과 상태를 보인다. 벌금이 켜져 있을 때만 포인트와 벌금 장부를 보인다
  - 다른 멤버 카드는 눌러서 고른다(토글). 내 카드는 누르면 "클립 만들기" 버튼이 겹쳐 보인다
  - 화면 아래 고정 영역: "Go / No Go"(지금 응답 강조, 알람 중엔 크게), 그 아래 "찌르기". 아래 여백은 `env(safe-area-inset-bottom)`
  - 알람 중: 배경에 잔잔한 원형 파장, 다른 멤버 카드 소리 켜짐. 찔리면: 파장이 세지고 화면이 출렁임(약 2.7초)
  - 별도 알람 오버레이 화면은 두지 않는다
- `/g/[id]/settings` 모임 설정 (가끔)
  - 모임 시간(알람 시각), 시연용 "1분 뒤로"
  - 벌금(선택): 끄면 차감량 0으로 저장하고 차감 기록을 만들지 않는다
  - 친구 초대: 그룹 링크 QR, 초대 코드, 코드·링크 복사

## 비주얼 스타일
기본 스타일은 팝 애니(Muse Dash 계열)다. 사이버펑크 네온이 아니다. 앱 아이콘, 일러스트, 새 화면 모두 이 규칙을 따른다.

| 요소 | 규칙 |
|---|---|
| 윤곽선 | 검은 선 대신 색 있는 두꺼운 선 |
| 색 | 채도 높은 핑크, 시안, 노랑. 흐린 파스텔과 어두운 네온은 쓰지 않는다 |
| 명암 | 그라데이션보다 면으로 끊어 칠하는 셀 셰이딩. 질감이 필요하면 하프톤 점 |
| 캐릭터 | 치비(2등신), 표정이 있는 마스코트 |
| 구도 | 기울이거나 튀어나오는 역동적인 구도 |
| 아이콘 | 1024px 정사각 PNG. 글자와 워터마크는 넣지 않는다. 중요한 모양은 가운데 70% 안에 둔다 |

## 녹화 흐름
1. 카메라가 켜져 있으면 `getUserMedia({ video: true, audio: true })`, 꺼져 있으면 `{ audio: true }`로 스트림을 연다.
2. 카메라 권한만 거부되면 `{ audio: true }`로 다시 연다 (R4.3).
3. `MediaRecorder`가 브라우저가 지원하는 형식으로 녹화한다. Chrome은 `video/webm`, 음성만이면 `audio/webm`이다.
4. 10초 타이머로 자동 정지하고, 결과 Blob을 mimeType과 함께 업로드한다.

## 녹화 형식은 코드 한 곳에서 고른다
`lib/clip.ts`가 `MediaRecorder.isTypeSupported`로 후보 목록(`video/webm`, `video/mp4`, `audio/webm`, `audio/mp4`)에서 첫 번째 지원 형식을 고른다. 재생은 `hasVideo`로 `<video>`와 `<audio>`를 가른다.

## 알람 재생 흐름
1. 그룹 화면이 열리면 AudioContext를 만들고 바로 재생을 시도한다. 안드로이드 앱은 `setMediaPlaybackRequiresUserGesture(false)`라 바로 된다. 브라우저에서 막히면 아무 곳이나 첫 터치 때 다시 시도한다.
2. 브라우저 타이머가 1초마다 `alarm.ts`로 판정한다.
3. 울려야 하면 그룹 화면에 잔잔한 파장이 퍼지고, 다른 멤버 카드의 클립 소리를 켠다. 들을 클립이 하나도 없으면 기본 알람음(WebAudio)을 쓴다.
4. 사용자가 "Go / No Go"를 누르면 `respond`를 호출하고 소리와 파장을 멈춘다. 같은 날 다시 누르면 응답을 바꾼다(`respond`는 새로 만들면 201, 바꾸면 200). No Go → Go면 그날 skipping 차감을 지우고 포인트를 돌려준다.
5. 같은 날짜 키로는 다시 울리지 않는다. 이미 응답했으면(응답을 바꿔도) 울리지 않는다.

## 탭 밖 알림
- 서버가 시작될 때 `instrumentation.ts`가 `alarm-push.ts` 타이머를 켠다. 20초마다 지금 시각(HH:MM)이 알람인 그룹을 찾아, 오늘 응답이 없는 멤버의 구독으로 푸시를 보낸다. 같은 날 같은 멤버에게는 한 번만 보낸다(메모리 기록).
- 찌르기도 받은 멤버에게 푸시를 보낸다.
- VAPID 키는 env가 없으면 `data/vapid.json`에 한 번 만들어 계속 쓴다. 만료된 구독(404, 410)은 지운다.
- 안드로이드 앱은 웹 푸시 대신 `AlarmWatchService`(포그라운드 서비스)를 쓴다. WebView 쿠키로 10초마다 `auth/me`와 `groups/:id`를 불러, 내 상태가 `pending`이고 알람 시각이 지났으면 화면 위 오버레이에 알람과 Go / No Go를 띄운다. `lastPoke`가 바뀌면 진동한다.

## 찌르기
- `POST /api/groups/:id/poke` `{ fromMemberId, toMemberIds[] }`. 자기 자신 400, 그룹 밖 멤버 404. `WakeCall` 테이블에 한 줄씩 남기고 `poke.sent`를 발행한다.
- `GET /api/groups/:id`가 멤버별 `lastPoke { at, fromNickname }`을 내려준다. 화면은 내 `lastPoke.at`이 바뀌면 찔림 효과를 낸다. 첫 로딩 때 값은 기준으로만 쓴다.
- 클립은 `toMemberId` 없이 저장한다. 멤버별 `clip`은 그 멤버가 보낸 가장 최근 클립이다.
- 연타: 보낸 사람 화면에서 10초 안에 다시 찌르면 숫자가 오른다. 2회부터 찌르기 버튼 왼쪽 위에 "N연타"를 보인다. 10초 동안 안 누르면 0으로 돌아간다. 화면에만 있고 저장하지 않는다. 연타 단계: 2~4 빨강, 5~9 주황 그라데이션과 빛, 10~19 노랑·주황·빨강에 불꽃 아이콘과 깜빡이는 빛, 20 이상 무지개가 흐르고 흔들린다. 경계값은 `STREAK_TIERS` 한 곳에 둔다. 단계가 오르는 순간(5, 10, 20)에는 배지가 다시 생기지 않고 같은 배지가 다음 단계 모양으로 바뀐다(모핑). 배경 층 4개를 겹쳐 두고 투명도로 서로 바꾸며, 글자 크기와 빛은 transition으로 넘어간다. 바뀌는 순간 빛 고리 두 개가 퍼지고, 10에서는 불꽃 아이콘이 돌며 자라난다. 숫자만 누를 때마다 튄다. 찌르기가 되면 따로 문구를 띄우지 않는다(버튼 튐과 연타가 피드백이다).

## 오류 처리
- 마이크 권한 거부: 이유와 브라우저 설정 안내를 보인다 (R4.8).
- 카메라 권한 거부: 음성 녹음으로 넘어가고 그 사실을 화면에 알린다 (R4.3).
- 10초 초과 녹화: 클라이언트가 10초에 멈추고 서버도 크기와 mimeType을 검증한다.
- 재생할 수 없는 형식: 기본 알람음으로 대신 울린다.
- SSE 끊김: 브라우저가 자동 재연결하고 재연결 시 상태를 다시 불러온다.
- 오디오 재생 차단: 알람 중인데 소리가 막혀 있으면 "화면을 한 번 누르면 소리가 나요"를 보인다.

## 테스트 (결정론 코드만)
- `alarm.ts`: 시각 경계, 이미 응답한 날, 날짜 키 변경
- `attendance.ts`: 응답 전, 응답, 10분 경과 무응답
- `penalty.ts`: 중복 차감 방지, 음수 포인트 허용 여부(허용, 0 미만도 기록)
- `clip.ts`: 지원 형식 선택 순서, 음성만일 때 audio 형식 선택

## 배포
- 컨테이너 한 개, replicas 1, `Recreate`, `data/`는 PVC. `.kiro/steering/deploy.md`를 따른다.
- 카메라와 마이크는 HTTPS가 필요하므로 배포 도메인은 TLS를 쓴다.
