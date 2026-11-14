# 작업 목록: 모임 지도와 자동 출석

> 계획에서 제외(2026-11-14). 작업량과 검증 부담이 커서 검증(5)과 문서(6)는 하지 않는다. 1-4는 구현돼 있으나 제출 범위가 아니다.

요구사항: `requirements.md`. 설계: `design.md`. 본 앱 `.kiro/specs/gymcall/tasks.md`의 작업 5(API)와 6.2(그룹 화면)가 끝난 뒤에 시작한다. 핵심 작업 7(데모 검증)이 먼저다. 각 작업은 끝나면 `BUILD_REPORT.md`에 한 줄 남긴다.

- [x] 1. 결정론 로직과 테스트
  - [x] 1.1 `lib/geo.ts`: `distanceM(a, b)`, `isInside(pos, place)`. 테스트: 같은 점, 알려진 거리, 반경 경계.
    - _Requirements: 10.1_
  - [x] 1.2 `lib/meetup.ts`: `inShareWindow(now, alarmTime)`, `shouldAutoAttend(...)`. 상수는 `lib/config.ts`. 테스트: 시간대 경계, 이미 응답, 못 간다, 차감 확정, 정확도 초과, 알람 없음.
    - _Requirements: 7.3, 10.1, 10.2, 10.3_
  - [x] 1.3 `lib/locations.ts`: 메모리 저장, 조회, 시간대 밖 제거, 삭제. 테스트 포함.
    - _Requirements: 7.4, 7.5, N7_
  - [x] 1.4 `lib/schemas.ts`에 위치와 모임 장소 Zod 스키마를 추가한다.
    - _Requirements: 9.1_

- [x] 2. 데이터 모델 (1과 병렬 가능)
  - `prisma/schema.prisma`: Group에 `meetupLat`, `meetupLng`, `meetupRadiusM`, Response에 `source`. 마이그레이션 생성.
  - _Requirements: 9.2, 10.4_

- [x] 3. API (1, 2 이후)
  - [x] 3.1 `PUT /api/groups/:id/meetup`. `group.updated` 발행.
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 3.2 `POST`와 `DELETE /api/groups/:id/location`. 처리 순서는 설계대로(400, 409, 429, 저장, 자동 출석). `location.updated` 발행.
    - _Requirements: 7.3, 7.5, 10.1, 10.5, 10.6, N8_
  - [x] 3.3 `GET /api/groups/:id/locations`. `GET /api/groups/:id`에 `meetup`과 멤버별 `source` 추가. `events.ts`에 `location.updated` 추가.
    - _Requirements: 8.4, 8.5, 10.4_

- [x] 4. 화면 (3 이후)
  - [x] 4.1 `/g/[id]`에 "현황" / "지도" 탭. `react-leaflet`을 `next/dynamic`, `ssr: false`로 로드. OSM 출처 표시.
    - _Requirements: 8.1, 8.3, 8.6, N6_
  - [x] 4.2 멤버 마커와 흐림 표시, 공유 안 함 목록, SSE 신호 후 2초 묶음 재조회.
    - _Requirements: 8.2, 8.4, 8.5_
  - [x] 4.3 모임 장소 지정(지도 누르기, 반경 선택).
    - _Requirements: 9.1, 9.2, 9.4_
  - [x] 4.4 "위치 공유" 스위치: 권한 거부 안내, 시간대 밖 안내, 10초 묶음 전송, 끄면 DELETE.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, N8_
  - [x] 4.5 현황 탭에서 `source`가 auto면 "도착"으로 표시.
    - _Requirements: 10.4_
