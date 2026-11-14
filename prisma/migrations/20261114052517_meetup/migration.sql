-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "alarmTime" TEXT,
    "startPoints" INTEGER NOT NULL,
    "penaltyPoints" INTEGER NOT NULL,
    "meetupLat" REAL,
    "meetupLng" REAL,
    "meetupRadiusM" INTEGER NOT NULL DEFAULT 100
);
INSERT INTO "new_Group" ("alarmTime", "id", "inviteCode", "name", "penaltyPoints", "startPoints") SELECT "alarmTime", "id", "inviteCode", "name", "penaltyPoints", "startPoints" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
CREATE TABLE "new_Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Response_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Response" ("choice", "createdAt", "date", "id", "memberId") SELECT "choice", "createdAt", "date", "id", "memberId" FROM "Response";
DROP TABLE "Response";
ALTER TABLE "new_Response" RENAME TO "Response";
CREATE UNIQUE INDEX "Response_memberId_date_key" ON "Response"("memberId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
