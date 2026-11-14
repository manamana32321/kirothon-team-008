# 설계: 모임 지도와 자동 출석

요구사항: `.kiro/specs/gymcall-meetup/requirements.md`. 본 앱 설계는 `.kiro/specs/gymcall/design.md`를 따르고, 아래는 추가분만 적는다.

## 임시값 (열린 질문)
- `SHARE_WINDOW_MINUTES = 120`, `LOCATION_STALE_SECONDS = 60`, `MIN_SEND_INTERVAL_SECONDS = 10`. 모두 `lib/config.ts`에 둔다.
- 반경 선택지 50, 100, 200m. 기본 100m.

## 구조

```
브라우저 ──POST 위치──> /api/groups/:id/location ──> locations.ts (메모리)
                                 │ 반경 안이면
                                 └──> Response 생성(going) ──> SSE
브라우저 <──SSE location.updated── events.ts
브라우저 ──GET──> /api/groups/:id/locations
```

- 위치는 DB에 넣지 않는다. 서버 프로세스 메모리 `Map<memberId, Position>`에만 둔다. replicas 1이라 본 앱 SSE와 같은 전제다.
- 자동 출석 판정은 서버가 한다. 클라이언트가 판정하면 화면마다 결과가 달라지고, 출석 규칙이 두 곳에 생긴다.

## 코드와 판단 위치
LLM은 쓰지 않는다. 모두 결정론 코드다.

| 모듈 | 하는 일 |
|---|---|
| `lib/geo.ts` | 두 좌표 거리(하버사인, m), `isInside(pos, place)` |
| `lib/meetup.ts` | `inShareWindow(now, alarmTime)`, `shouldAutoAttend(...)` |
| `lib/locations.ts` | 메모리 저장소. 저장, 조회, 시간대 밖과 오래된 값 제거 |

## 데이터 모델 변경 (Prisma)

| 모델 | 변경 | 메모 |
|---|---|---|
| Group | `meetupLat Float?`, `meetupLng Float?`, `meetupRadiusM Int @default(100)` | 세 값은 함께 있거나 함께 없다 |
| Response | `source String @default("manual")` | `manual` 또는 `auto`. 화면의 "도착" 표시용 |

- Position은 모델이 아니다: `{ memberId, lat, lng, accuracyM, updatedAt }`, 메모리 전용.
- 새 테이블은 만들지 않는다. 마이그레이션은 컬럼 추가 두 건이다.

## API

| 메서드 경로 | 요구사항 | 동작 |
|---|---|---|
| PUT `/api/groups/:id/meetup` | R9 | 모임 장소와 반경 저장. `group.updated` 발행 |
| POST `/api/groups/:id/location` | R7, R10 | 위치 수신. 아래 처리 순서 참고 |
| DELETE `/api/groups/:id/location` | R7.5 | 호출한 멤버의 위치 삭제. `location.updated` 발행 |
| GET `/api/groups/:id/locations` | R8 | 공유 중인 멤버 위치 목록. 시간대 밖이면 빈 배열 |

- 입력은 Zod로 검증하고 스키마는 `lib/schemas.ts`에 추가한다. 위도 -90~90, 경도 -180~180, 정확도 0 이상.
- `GET /api/groups/:id`는 `meetup`(좌표, 반경)과 멤버별 `source`를 함께 내려준다.

### POST location 처리 순서
1. 입력 검증 실패는 400.
2. 알람이 없거나 `inShareWindow`가 거짓이면 409, 저장하지 않는다 (R7.3).
3. 같은 멤버의 이전 전송이 10초 안이면 429 (N8).
4. 메모리에 저장하고 `location.updated`를 발행한다.
5. `shouldAutoAttend`가 참이면 Response(going, source auto)를 만들고 `response.created`를 발행한다. (memberId, date) unique 제약이 중복을 막는다 (R10.6).

`shouldAutoAttend` 조건: 모임 장소 있음, 공유 시간대, `accuracyM <= meetupRadiusM`, `isInside`, 오늘 Response 없음, 오늘 PenaltyLog 없음 (R10.1-3). PenaltyLog는 지연 평가라 아직 안 생겼을 수 있으므로, 무응답 대기(10분)가 지났으면 PenaltyLog가 없어도 차감 확정으로 본다.

## SSE 이벤트
`location.updated` 하나만 추가한다. 본 앱 규칙대로 "다시 불러오라"는 신호만 담는다. 화면은 `GET /locations`로 갱신하고, 신호가 몰리면 2초에 한 번만 불러온다.

## 만료
- 조회 시 `LOCATION_STALE_SECONDS`가 아니라 시간대가 끝났는지로 지운다. 흐림 표시는 화면이 `updatedAt`으로 계산한다 (R8.2).
- 별도 스케줄러는 없다. `GET /locations`와 `POST /location`이 호출될 때 시간대 밖 항목을 지운다 (본 앱 무응답 확정과 같은 지연 평가).

## 화면
- `/g/[id]`에 탭 두 개: "현황"(기존), "지도".
- 지도 탭: Leaflet + OpenStreetMap 타일. `react-leaflet`을 `next/dynamic`으로 `ssr: false` 로드한다.
  - 멤버 마커와 닉네임, 모임 장소 마커와 반경 원
  - "위치 공유" 스위치, 공유 안 하는 멤버 목록
  - 모임 장소 지정은 `/g/[id]/settings`에서 한다(지도 누르기, 반경 선택, 없애기). 지도 탭은 보기만 한다
- `DELETE /api/groups/:id/meetup`: 모임 장소를 없앤다. `group.updated` 발행
- 현황 탭 멤버 목록에서 `source`가 auto면 "간다" 대신 "도착"을 보인다.
- 위치 보내기: 스위치가 켜져 있는 동안 `navigator.geolocation.watchPosition`. 전송은 10초 간격으로 묶는다.

## 오류 처리
- 위치 권한 거부: 안내를 보이고 스위치를 끈다 (R7.2).
- 시간대 밖(409): 안내 문구를 보이고 전송을 멈춘다 (R7.3, R7.4).
- 위치 정확도가 낮음: 마커는 찍되 자동 출석은 하지 않는다 (R10.1).
- 지도 타일 로딩 실패: 마커 목록은 표로 그대로 보인다.
- SSE 끊김: 본 앱과 같이 재연결 후 `GET /locations`를 다시 부른다.

## 테스트 (결정론 코드만)
- `geo.ts`: 같은 점 0m, 알려진 두 점 거리 오차 1% 이내, 반경 경계
- `meetup.ts`: 시간대 시작과 끝 경계, 알람 없음, 이미 응답한 멤버, 못 간다 멤버, 차감 확정 멤버, 정확도 초과
- `locations.ts`: 저장 후 조회, 시간대 밖 제거, 삭제

## 개인정보와 한계
- 위치는 멤버가 켠 동안만, 공유 시간대에만 서버에 간다. DB와 로그에 쓰지 않는다 (N7).
- 로그인이 없어 멤버 ID가 사실상 열쇠다. README 한계에 적는다.
- 탭이 닫히면 갱신이 멈춘다. 알람과 같은 한계다.
- OSM 공개 타일은 대량 사용에 맞지 않는다. 데모 규모만 쓰고 출처를 표시한다.

## 배포
추가 컨테이너와 환경 변수는 없다. 위치 권한 때문에 HTTPS가 필요하다 (N10).
