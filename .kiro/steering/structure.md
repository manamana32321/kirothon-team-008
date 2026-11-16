# Structure

## 디렉터리
```
.
├── .kiro/
│   ├── steering/        제품·기술·구조·배포·작업 규칙
│   ├── specs/           기능별 requirements.md, design.md, tasks.md
│   ├── hooks/
│   └── skills/
├── prisma/              schema.prisma, migrations/, seed.ts (가상 인물만)
├── data/                SQLite, 업로드 클립, VAPID 키 (gitignore)
├── src/
│   ├── app/             페이지와 Route Handlers (api/auth, api/groups/[id]/*, api/clips, api/push)
│   ├── components/      UI 컴포넌트 (shadcn/ui 포함)
│   ├── lib/
│   │   ├── alarm.ts     알람 발동 판정
│   │   ├── attendance.ts 참가 상태 집계
│   │   ├── penalty.ts   포인트 차감
│   │   ├── events.ts    SSE 구독과 발행
│   │   ├── auth.ts      계정, 세션, API 권한 확인
│   │   └── alarm-push.ts 알람 시각 웹 푸시
│   └── db.ts            Prisma 클라이언트
├── tests/               결정론 코드 테스트
├── android-app/         Capacitor 안드로이드 앱
├── docs/                인계 노트
├── infra/k8s/           Kustomize base/ + overlays/prod/ (ArgoCD가 바라봄)
├── Dockerfile
├── BUILD_REPORT.md
├── PRESENTATION.pdf
└── README.md
```

## 네이밍
- 파일은 kebab-case, 컴포넌트는 PascalCase
- 도메인 용어는 코드와 문서에서 동일하게 쓴다: group, member, alarm, response, clip, penalty

## 커밋
- 커밋 메시지에 변경 이유를 적는다.
