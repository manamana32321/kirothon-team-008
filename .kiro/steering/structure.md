# Structure

## 디렉터리
```
.
├── .kiro/
│   ├── steering/        product.md, tech.md, structure.md
│   ├── specs/           기능별 requirements.md, design.md, tasks.md
│   └── hooks/
├── prisma/              schema.prisma, seed.ts (가상 인물만)
├── data/                업로드 클립 (gitignore)
├── src/
│   ├── app/             페이지와 Route Handlers (api/groups, api/alarm, api/clips, api/events)
│   ├── components/      UI 컴포넌트 (shadcn/ui 포함)
│   ├── lib/
│   │   ├── alarm.ts     알람 발동 판정
│   │   ├── attendance.ts 참가 상태 집계
│   │   ├── penalty.ts   포인트 차감
│   │   └── events.ts    SSE 구독과 발행
│   └── db.ts            Prisma 클라이언트
├── tests/               결정론 코드 테스트
├── BUILD_REPORT.md
├── PRESENTATION.pdf
└── README.md
```

## 네이밍
- 파일은 kebab-case, 컴포넌트는 PascalCase
- 도메인 용어는 코드와 문서에서 동일하게 쓴다: group, member, alarm, response, clip, penalty

## 커밋
- 커밋 메시지에 변경 이유를 적는다.
- 18:00 전 마지막 push를 지킨다.
