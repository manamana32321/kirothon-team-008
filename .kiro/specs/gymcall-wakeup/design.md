# 설계: 실시간 깨우기

요구사항: `.kiro/specs/gymcall-wakeup/requirements.md`. 본 앱 설계는 `.kiro/specs/gymcall/design.md`를 따르고, 아래는 추가분만 적는다.

## 임시값 (열린 질문)
- `WAKE_CALL_MAX_MINUTES = 5`. `lib/config.ts`에 둔다.
- 호출 횟수 제한 없음.

## 구조 (1단계)

```
보낸 브라우저 ──POST wake──> Route Handler ──> Prisma(WakeCall)
                                   │
                                   └─ publish wake.called ──> events.ts ──SSE──> 받는 브라우저
받는 브라우저 ──POST wake/ack──> Route Handler ──> WakeCall.ackedAt ──> wake.acked ──SSE──> 보낸 브라우저
```

- 알람 울림 로직은 새로 만들지 않는다. 본 앱 알람 오버레이와 재생 코드를 재사용하고, 시작 조건만 "시각이 됨"에서 "활성 호출이 있음"으로 바뀐다.
- 호출 상태 판단은 서버 코드가 한다. 클라이언트는 신호를 받으면 다시 불러오기만 한다.

## 코드와 판단 위치
LLM은 쓰지 않는다. 모두 결정론 코드다.

| 모듈 | 하는 일 |
|---|---|
| `lib/wake.ts` | `wakeStatus(call, now)`: active, acked, expired. `activeCallFor(calls, memberId, now)` |
| `lib/events.ts` | `wake.called`, `wake.acked` 이벤트 추가 |

## 데이터 모델 변경 (Prisma)

| 모델 | 필드 | 메모 |
|---|---|---|
| WakeCall | id, groupId, fromMemberId, toMemberId, createdAt, ackedAt(nullable) | 만료 시각은 저장하지 않고 `createdAt + 5분`으로 계산한다 |
| PushSubscription (2단계) | id, memberId, endpoint(unique), p256dh, auth, createdAt | |

- 상태는 저장하지 않고 계산한다: `ackedAt`이 있으면 acked, 없고 `createdAt + 5분`이 지났으면 expired, 아니면 active. 상태 정의가 `wake.ts` 한 곳에 남는다.
- "일어남" 표시는 멤버의 오늘 WakeCall 중 acked가 있는지로 계산한다. Response는 건드리지 않는다.
- 새 상태는 `AttendanceStatus`에 넣지 않는다. 이 값은 "간다 / 못 간다 / 무응답"을 위한 것이고 불참 확정과 연결되어 있다. 별도 필드 `awake: boolean`을 멤버별로 내려준다.

## API

| 메서드 경로 | 요구사항 | 동작 |
|---|---|---|
| POST `/api/groups/:id/wake` | R11 | body `{ toMemberId }`. 같은 그룹 멤버인지 검증하고 WakeCall 생성. `wake.called` 발행 |
| POST `/api/groups/:id/wake/ack` | R13 | 호출한 멤버에게 온 active 호출을 모두 `ackedAt = now`로 닫는다. `wake.acked` 발행 |

- `GET /api/groups/:id`는 멤버별 `awake`(오늘 일어났다를 누름)와 `wake`(그 멤버에게 온 가장 최근 호출의 `status`, 보낸 사람, `expiresAt`)를 내려준다. 요청한 멤버를 알 수 없어도 되도록 멤버 ID 파라미터를 받지 않고, 받는 쪽은 자기 항목을, 보낸 쪽은 상대 항목을 읽는다. 상태는 `calling`, `acked`, `expired`다.
- 입력은 Zod로 검증하고 스키마는 `lib/schemas.ts`에 추가한다.
- 자기 자신 호출은 400이다.
- 재생할 클립은 본 앱 규칙(받는 사람의 미사용 클립 중 가장 오래된 것)을 따른다. ack가 그 클립의 usedDate를 채운다.

## SSE 이벤트
`wake.called`, `wake.acked`. 본 앱 규칙대로 "다시 불러오라"는 신호만 담는다. 받는 쪽 화면이 `GET /api/groups/:id`로 `activeWake`를 확인하고 있으면 울린다.

## 화면
- 멤버 목록: 다른 멤버 옆에 "지금 깨우기" 버튼. 보낸 뒤에는 "호출 중", "OO 일어남", "응답 없음"을 보인다. 오늘 일어남인 멤버에는 표시가 붙는다.
- 호출 오버레이: 알람 오버레이 컴포넌트를 재사용한다. 닉네임, 재생 중인 클립, "일어났다" 버튼 하나만 둔다. 닫기 동작은 없다.
- 새로고침 시 `activeWake`가 있으면 다시 울린다 (R12.7).
- 만료 판정은 화면이 `expiresAt`으로 하고, 서버도 같은 `wake.ts`로 판정한다.

## 오류 처리
- 오디오 재생 차단: "알람 켜기"를 누르지 않았으면 호출 오버레이에 경고를 보이고, 화면 점멸과 진동(`navigator.vibrate`)으로 대신한다.
- 상대가 그룹에 없음: 404.
- SSE 끊김: 재연결 후 상태를 다시 불러오므로 놓친 호출도 만료 전이면 울린다.
- 서버 재시작: WakeCall은 DB에 있으므로 유지된다.

## 2단계: 웹 푸시

```
받는 브라우저 ──subscribe──> POST /api/push/subscribe ──> PushSubscription
POST wake ──> 멤버의 SSE 구독 없음? ──> web-push 라이브러리 ──> 브라우저 푸시 서비스 ──> Service Worker
```

- 라이브러리 `web-push`, VAPID 키는 스크립트로 한 번 생성해 `.env`에 둔다. 공개 키만 클라이언트에 내려준다.
- Service Worker가 푸시를 받아 알림을 띄우고, 클릭하면 `/g/[id]`를 열어 R12 흐름으로 이어진다.
- 탭이 열려 있는지는 `events.ts`의 SSE 연결을 멤버 ID별로 세어 판단한다(구독 시 멤버 ID를 함께 등록). 받는 멤버의 연결이 없을 때만 푸시를 보낸다 (R14.6).
- 푸시 서비스가 410을 돌려주면 그 구독을 삭제한다.
- 푸시 알림은 소리가 반복되지 않는다 (R14.4). 반복 알람은 앱이 열린 뒤에 시작된다.

## 테스트 (결정론 코드만)
- `wake.ts`: 만료 경계(4분 59초와 5분 1초), ack 후 상태, 여러 호출 중 active 선택, 같은 멤버 중복 호출 시 활성 하나

## 개인정보와 한계
- 호출 횟수 제한이 없다. 그룹 안 친구끼리 쓰는 전제이고 README 한계에 적는다.
- 1단계는 탭이 닫히면 울리지 않는다. 2단계로 푸시 알림까지만 보강하고 반복 소리는 앱이 열려야 난다.
- 푸시 구독 정보는 DB에 저장되고 멤버 ID가 열쇠다.

## 배포
추가 컨테이너는 없다. 2단계는 환경 변수 `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`가 필요하고, 넣는 방법은 `.kiro/steering/deploy.md`를 따른다. 푸시는 HTTPS가 필요하다.
