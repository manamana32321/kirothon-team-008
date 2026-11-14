# 작업 목록: 운동 기상 버디

요구사항: `requirements.md`. 설계: `design.md`. 각 작업은 끝나면 `BUILD_REPORT.md`에 한 줄 남긴다.

- [x] 1. 프로젝트 골격
  - Next.js(App Router) + TypeScript + Tailwind + shadcn/ui를 pnpm으로 만든다.
  - Prisma + SQLite, Zod, Vitest를 추가한다.
  - `.gitignore`에 `data/`, `.env`, `*.db`를 넣는다.
  - `pnpm dev`로 빈 페이지가 뜨는지 확인한다.
  - _Requirements: N1, N3, N4_

- [ ] 2. 데이터 모델
  - [ ] 2.1 `prisma/schema.prisma`에 Group, Member, Response, Clip, PenaltyLog를 설계대로 정의한다. unique 제약 (groupId, nickname), (memberId, date)를 넣는다.
    - _Requirements: 1.4, 3.3, 4.5, 6.2_
  - [ ] 2.2 `src/db.ts` Prisma 클라이언트와 `prisma/seed.ts`를 만든다. 시드는 가상 닉네임만, 클립은 넣지 않는다.
    - _Requirements: N2_

- [ ] 3. 결정론 로직과 테스트 (1 이후, 2와 병렬 가능)
  - [ ] 3.1 `lib/alarm.ts`: `shouldRing(now, alarmTime, respondedToday)`, `dateKey(now)`. 테스트: 시각 경계, 이미 응답한 날, 자정 넘김.
    - _Requirements: 2.1, 3.1, 3.3_
  - [ ] 3.2 `lib/attendance.ts`: 멤버별 상태 pending, going, skipping, no_response. `NO_RESPONSE_MINUTES = 10`. 테스트: 응답 전, 응답, 10분 경과.
    - _Requirements: 5.1, 5.2_
  - [ ] 3.3 `lib/penalty.ts`: 확정 불참 목록으로 차감 계산, 같은 날 중복 차감 금지. 테스트: 중복 방지, 0 미만 허용.
    - _Requirements: 6.2, 6.3_
  - [ ] 3.4 `lib/clip.ts`: 후보 형식 중 지원 형식 선택, 영상/음성 판정. 테스트: 선택 순서, 음성만일 때 audio 형식.
    - _Requirements: 4.1, 4.2, 4.6_
  - [ ] 3.5 `lib/schemas.ts`: API 입력 Zod 스키마를 한 곳에 정의한다.
    - _Requirements: 1.1, 2.1, 3.3, 4.5_

- [ ] 4. 실시간 (1 이후)
  - [ ] 4.1 `lib/events.ts`: 그룹별 구독과 발행. 이벤트는 `group.updated`, `response.created`, `clip.created`, `penalty.applied`.
    - _Requirements: 2.2, 3.4_
  - [ ] 4.2 `GET /api/groups/:id/events` SSE Route Handler (Node 런타임, 연결 종료 시 구독 해제).
    - _Requirements: 2.2, 3.4_

- [ ] 5. API (2, 3, 4 이후)
  - [ ] 5.1 `POST /api/groups`, `POST /api/groups/join`. 없는 코드 404, 중복 닉네임 409.
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ] 5.2 `GET /api/groups/:id`: 오늘 상태와 포인트. 무응답 확정을 지연 평가하고 PenaltyLog 생성 후 `penalty.applied` 발행.
    - _Requirements: 5.1, 5.2, 6.2, 6.3_
  - [ ] 5.3 `PUT /api/groups/:id/alarm`: 알람 시각, 시작 포인트, 차감량. `group.updated` 발행.
    - _Requirements: 2.1, 2.2, 6.1_
  - [ ] 5.4 `POST /api/groups/:id/respond`: 오늘 응답 기록, skipping이면 즉시 차감. `response.created` 발행.
    - _Requirements: 3.3, 3.4, 6.2_
  - [ ] 5.5 `POST /api/groups/:id/clips`, `GET /api/clips/:id`: multipart 업로드, 8MB와 mimeType 검증, `data/clips/` 저장, 저장된 mimeType으로 스트림.
    - _Requirements: 4.4, 4.5, 4.6_

- [ ] 6. 화면 (5 이후)
  - [ ] 6.1 `/`: 그룹 만들기와 코드로 참여. 멤버 ID를 localStorage에 저장.
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 6.2 `/g/[id]`: 알람 설정, 멤버 상태 목록, 포인트와 차감 내역, "가상 포인트" 문구. SSE 신호를 받으면 다시 불러온다.
    - _Requirements: 2.1, 2.2, 2.3, 5.1, 6.3, 6.4_
  - [ ] 6.3 깨우기 클립 녹화: 카메라 토글, 카메라 거부 시 음성으로 전환, 10초 자동 정지, 받는 멤버 선택 후 업로드. 마이크 거부 안내.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8, 5.3_
  - [ ] 6.4 알람: "알람 켜기"로 재생 권한 얻기, 1초 판정, 전체 화면 오버레이에서 클립 반복 재생(없으면 기본음), "간다 / 못 간다"로 응답과 정지. 탭을 열어둬야 한다는 안내.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 4.6, 4.7_

- [ ] 7. 데모 검증 (6 이후)
  - [ ] 7.1 Chrome 두 창으로 시나리오를 돌린다: 그룹 생성 → 참여 → 영상 클립 전송 → 알람 1분 뒤 → 클립 재생 → "간다" → 다른 창에 1초 안에 반영.
    - _Requirements: 3.4, 4.6_
  - [ ] 7.2 카메라 끈 음성 클립, 무응답 10분 차감(시각 조작)을 확인한다.
    - _Requirements: 4.2, 5.2, 6.2_

- [ ] 8. 배포 (7 이후, 17시 이후)
  - Dockerfile, `infra/k8s/` 매니페스트(replicas 1, Recreate, PVC, TLS Ingress). `.kiro/steering/deploy.md`를 따른다.
  - 실패하면 녹화 영상 링크로 대신한다.
  - _Requirements: N1_

- [ ] 9. 제출물
  - README 모든 섹션, BUILD_REPORT 최종 정리, `PRESENTATION.pdf`, 데모 영상 링크.
  - 18:00 전 push.
