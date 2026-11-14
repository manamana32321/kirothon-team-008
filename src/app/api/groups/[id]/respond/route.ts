import { db } from "@/db";
import { dateKey } from "@/lib/alarm";
import { publish } from "@/lib/events";
import { error, isUniqueViolation, parseJson } from "@/lib/http";
import { recordAbsences } from "@/lib/penalty-store";
import { respondSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, respondSchema);
  if ("response" in input) return input.response;
  const { memberId, choice } = input.data;

  const member = await db.member.findFirst({
    where: { id: memberId, groupId: id },
    include: { group: { select: { penaltyPoints: true } } },
  });
  if (!member) return error(404, "그룹에 없는 멤버입니다");

  const date = dateKey(new Date());
  try {
    await db.response.create({ data: { memberId, date, choice } });
  } catch (e) {
    if (isUniqueViolation(e)) return error(409, "오늘은 이미 응답했습니다");
    throw e;
  }

  const clip = await db.clip.findFirst({
    where: { toMemberId: memberId, usedDate: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (clip) await db.clip.update({ where: { id: clip.id }, data: { usedDate: date } });

  publish(id, "response.created");
  if (choice === "skipping") {
    await recordAbsences(id, member.group.penaltyPoints, [
      { memberId, date, reason: "skipping" },
    ]);
  }
  return Response.json({ date, choice }, { status: 201 });
}
