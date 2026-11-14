-- CreateTable
CREATE TABLE "WakeCall" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ackedAt" DATETIME,
    CONSTRAINT "WakeCall_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WakeCall_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WakeCall_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
