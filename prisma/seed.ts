import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { DATABASE_URL } from "../src/lib/config";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: DATABASE_URL }),
});

async function main() {
  await db.group.upsert({
    where: { inviteCode: "SEED01" },
    update: {},
    create: {
      name: "새벽 러닝 모임",
      inviteCode: "SEED01",
      alarmTime: "06:30",
      startPoints: 100,
      penaltyPoints: 10,
      members: {
        create: [
          { nickname: "달리는곰", points: 100 },
          { nickname: "새벽여우", points: 100 },
          { nickname: "느린거북", points: 100 },
        ],
      },
    },
  });
}

main().finally(() => db.$disconnect());
