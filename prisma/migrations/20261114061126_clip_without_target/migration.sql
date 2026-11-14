-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "hasVideo" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedDate" TEXT,
    CONSTRAINT "Clip_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clip_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clip_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("createdAt", "filePath", "fromMemberId", "groupId", "hasVideo", "id", "mimeType", "toMemberId", "usedDate") SELECT "createdAt", "filePath", "fromMemberId", "groupId", "hasVideo", "id", "mimeType", "toMemberId", "usedDate" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
