import { randomInt } from "node:crypto";
import { db } from "@/db";
import { isUniqueViolation, parseJson } from "@/lib/http";
import { createGroupSchema } from "@/lib/schemas";

const DEFAULT_START_POINTS = 100;
const DEFAULT_PENALTY_POINTS = 10;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function inviteCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export async function POST(request: Request) {
  const input = await parseJson(request, createGroupSchema);
  if ("response" in input) return input.response;
  const { name, nickname } = input.data;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const group = await db.group.create({
        data: {
          name,
          inviteCode: inviteCode(),
          startPoints: DEFAULT_START_POINTS,
          penaltyPoints: DEFAULT_PENALTY_POINTS,
          members: { create: { nickname, points: DEFAULT_START_POINTS } },
        },
        include: { members: true },
      });
      return Response.json(
        { groupId: group.id, inviteCode: group.inviteCode, memberId: group.members[0].id },
        { status: 201 },
      );
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  return Response.json({ error: "초대 코드 생성 실패" }, { status: 500 });
}
