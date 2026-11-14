# 작업 목록: 실시간 깨우기

요구사항: `requirements.md`. 설계: `design.md`. 본 앱 `.kiro/specs/gymcall/tasks.md`의 작업 6.4(알람 오버레이)가 끝난 뒤에 시작한다. 모임 지도 스펙(`gymcall-meetup`)보다 먼저 한다. 각 작업은 끝나면 `BUILD_REPORT.md`에 한 줄 남긴다.

## 1단계: SSE

- [x] 1. 결정론 로직과 테스트
  - [x] 1.1 `lib/config.ts`에 `WAKE_CALL_MAX_MINUTES = 5`.
  - [x] 1.2 `lib/wake.ts`: `wakeStatus`, `activeCallFor`. 테스트: 만료 경계, ack 후 상태, 여러 호출 중 active 선택.
    - _Requirements: 12.5, 12.6, 13.3_
  - [x] 1.3 `lib/schemas.ts`에 호출 입력 스키마 추가.
    - _Requirements: 11.2_

- [x] 2. 데이터 모델 (1과 병렬 가능)
  - `prisma/schema.prisma`에 WakeCall 추가, 마이그레이션 생성.
  - _Requirements: 11.2, 13.1_

- [x] 3. 실시간과 API (1, 2 이후)
  - [x] 3.1 `lib/events.ts`에 `wake.called`, `wake.acked` 추가.
    - _Requirements: 12.1, 13.2_
  - [x] 3.2 `POST /api/groups/:id/wake`. 같은 그룹 검증, 자기 자신은 400, 횟수 제한 없음. 발행.
    - _Requirements: 11.2, 11.4, 11.5_
  - [x] 3.3 `POST /api/groups/:id/wake/ack`. 호출 멤버의 active 호출을 모두 닫고 사용한 클립 usedDate를 채운다. 발행.
    - _Requirements: 13.1, 13.2, 12.3_
  - [x] 3.4 `GET /api/groups/:id`에 멤버별 `awake`, 요청 멤버 기준 `activeWake`, 보낸 사람 기준 호출 상태를 추가.
    - _Requirements: 12.7, 13.3, 13.4, 13.5_

- [x] 4. 화면 (3 이후)
  - [x] 4.1 멤버 목록에 "지금 깨우기" 버튼과 "호출 중 / 일어남 / 응답 없음" 표시. 일어남 표시.
    - _Requirements: 11.1, 11.3, 13.2, 13.3, 13.4_
  - [x] 4.2 호출 오버레이: 알람 오버레이 재사용, "일어났다" 버튼만. 5분 만료 자동 정지, 새로고침 시 재개, 재생 차단 시 점멸과 진동. 탭 필요 안내.
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [ ] 5. 검증 (4 이후)
  - [ ] 5.1 Chrome 두 창: A가 B 호출 → 1초 안에 B 울림 → "일어났다" → A에 "일어남" 반영.
    - _Requirements: 12.1, 13.2_
  - [ ] 5.2 경계: 5분 만료(시각 조작), 새로고침 후 재개, 클립이 있을 때 재생, 호출 여러 번에도 소리 하나.
    - _Requirements: 12.3, 12.5, 12.6, 12.7_

## 2단계: 웹 푸시 (시간이 있을 때)

- [ ] 6. 푸시 기반
  - [ ] 6.1 `web-push` 추가, VAPID 키 생성 스크립트, `.env.example`에 이름만 추가.
    - _Requirements: N11_
  - [ ] 6.2 PushSubscription 모델과 `POST /api/push/subscribe`. 410 응답 시 구독 삭제.
    - _Requirements: 14.1, N12_
  - [ ] 6.3 Service Worker: 푸시 수신, 알림 표시, 클릭 시 `/g/[id]` 열기.
    - _Requirements: 14.2, 14.3_
  - [ ] 6.4 호출 시 SSE 연결이 없는 멤버에게만 푸시 발송.
    - _Requirements: 14.2, 14.6_
  - [ ] 6.5 "알림 받기" 버튼과 안내(소리 한 번뿐, 아이폰은 홈 화면 추가).
    - _Requirements: 14.1, 14.4, 14.5_

- [ ] 7. 푸시 검증 (6 이후)
  - [ ] 7.1 탭을 닫고 호출 → 알림 → 클릭 → 반복 알람 → "일어났다".
    - _Requirements: 14.2, 14.3_

- [ ] 8. 문서
  - README 한계에 추가: 1단계는 탭 필요, 푸시는 소리 한 번, 호출 횟수 제한 없음.
