# 설계: 운동 기상 버디

요구사항: `.kiro/specs/wake-buddy/requirements.md`. 스택은 `.kiro/steering/tech.md`를 따른다.

## 임시값 (열린 질문)
- 무응답 확정 대기: 알람 시각 후 10분. 상수 `NO_RESPONSE_MINUTES` 한 곳에 둔다.
- 알람 반복: 매일 반복. 요일 설정은 MVP에서 뺀다. 알람은 시각(HH:MM)만 가진다.

## 구조

```
브라우저 A ──POST──> Route Handlers ──> Prisma(SQLite)
브라우저 B <──SSE─── /api/events   <── events.ts (프로세스 내 pub/sub)
브라우저 ──녹음 업로드──> /api/voice ──> data/audio/
```

- 서버는 단일 프로세스다. SSE 구독자 목록이 메모리에 있으므로 replicas는 1이다.
- 알람 시각 판정은 각 브라우저가 한다. 서버가 푸시하지 않는다. 탭이 닫히면 울리지 않는다.
- 상태 변경이 생기면 서버가 그룹 단위로 SSE 이벤트를 발행한다.

## 코드와 판단 위치
LLM은 쓰지 않는다. 모든 판단은 결정론 코드다.

| 모듈 | 하는 일 |
|---|---|
| `lib/alarm.ts` | 현재 시각과 알람 시각으로 "울려야 하는가", "오늘 날짜 키" 계산 |
| `lib/attendance.ts` | 응답 목록과 시각으로 멤버별 상태(pending, going, skipping, no_response) 집계 |
| `lib/penalty.ts` | 확정된 불참 목록으로 포인트 차감 계산 |
| `lib/events.ts` | 그룹별 SSE 구독과 발행 |

## 데이터 모델 (Prisma)

| 모델 | 필드 | 메모 |
|---|---|---|
| Group | id, name, inviteCode(unique), alarmTime(nullable), startPoints, penaltyPoints | alarmTime은 "HH:MM" |
| Member | id, groupId, nickname, points | (groupId, nickname) unique |
| Response | id, memberId, date, choice(going/skipping), createdAt | (memberId, date) unique |
| Voice | id, groupId, fromMemberId, toMemberId, filePath, createdAt, usedDate(nullable) | 받는 사람의 다음 알람에 쓰면 usedDate를 채움 |
| PenaltyLog | id, memberId, date, points, reason | (memberId, date) unique. 중복 차감 방지 |

- `date`는 알람이 울리는 날의 로컬 날짜 `YYYY-MM-DD`다.
- 불참 확정은 "skipping 응답" 또는 "알람 시각 + 10분이 지났는데 응답 없음"이다.

## API

| 메서드 경로 | 요구사항 | 동작 |
|---|---|---|
| POST `/api/groups` | R1 | 그룹과 첫 멤버 생성, 초대 코드 발급 |
| POST `/api/groups/join` | R1 | 코드와 닉네임으로 참여. 없는 코드는 404, 중복 닉네임은 409 |
| GET `/api/groups/:id` | R5, R6 | 그룹, 멤버, 오늘 상태, 포인트 |
| PUT `/api/groups/:id/alarm` | R2 | 알람 시각과 벌금 설정. `group.updated` 발행 |
| POST `/api/groups/:id/respond` | R3 | 오늘 응답 기록. skipping이면 즉시 차감. `response.created` 발행 |
| POST `/api/groups/:id/voice` | R4 | multipart 업로드. 10초와 크기 제한 검증. `voice.created` 발행 |
| GET `/api/voice/:id` | R4 | 오디오 스트림 |
| GET `/api/groups/:id/events` | R2, R3, R5 | SSE 스트림 |

- 입력은 Zod로 검증한다. 스키마는 `lib/schemas.ts` 한 곳에만 정의하고 클라이언트도 같은 것을 쓴다.
- 무응답 확정은 `GET /api/groups/:id`가 호출될 때 지연 평가한다. 별도 스케줄러를 두지 않는다. 확정되면 PenaltyLog를 만들고 `penalty.applied`를 발행한다.

## SSE 이벤트
`group.updated`, `response.created`, `voice.created`, `penalty.applied`.
이벤트는 "다시 불러오라"는 신호만 담고, 화면은 `GET /api/groups/:id`로 상태를 갱신한다. 상태 정의가 한 곳에 남는다.

## 화면
- `/` 그룹 만들기, 코드로 참여
- `/g/[id]` 그룹 화면 하나에 모두 담는다.
  - 알람 시각 설정, "알람 켜기" 버튼
  - 멤버별 상태 목록과 포인트
  - 무응답 또는 응답 전 멤버 옆 "깨우기 녹음" 버튼
  - 알람이 울릴 때 전체 화면 오버레이: "간다 / 못 간다"

## 알람 재생 흐름
1. 사용자가 "알람 켜기"를 누른다. 무음 오디오를 한 번 재생해 자동 재생 권한을 얻는다.
2. 브라우저 타이머가 1초마다 `alarm.ts`로 판정한다.
3. 울려야 하면 오늘 받은 Voice 중 가장 오래된 것을 반복 재생한다. 없으면 기본 알람음을 쓴다.
4. 사용자가 응답을 누르면 `respond`를 호출하고 재생을 멈춘다. 사용한 Voice의 usedDate를 채운다.
5. 같은 날짜 키로는 다시 울리지 않는다. 이미 응답했으면 울리지 않는다.

## 오류 처리
- 마이크 권한 거부: 이유와 브라우저 설정 안내를 보인다 (R4.6).
- 10초 초과 녹음: 클라이언트가 10초에 멈추고 서버도 길이와 크기를 검증한다.
- SSE 끊김: 브라우저가 자동 재연결하고 재연결 시 상태를 다시 불러온다.
- 오디오 재생 차단: "알람 켜기"를 누르지 않았으면 화면에 경고를 보인다.

## 테스트 (결정론 코드만)
- `alarm.ts`: 시각 경계, 이미 응답한 날, 날짜 키 변경
- `attendance.ts`: 응답 전, 응답, 10분 경과 무응답
- `penalty.ts`: 중복 차감 방지, 음수 포인트 허용 여부(허용, 0 미만도 기록)

## 배포
- 컨테이너 한 개, replicas 1, `Recreate`, `data/`는 PVC. `.kiro/steering/deploy.md`를 따른다.
- 마이크는 HTTPS가 필요하므로 배포 도메인은 TLS를 쓴다.
