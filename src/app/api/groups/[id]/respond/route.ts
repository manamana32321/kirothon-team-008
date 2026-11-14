import { db } from "@/db";
import { requireMember } from "@/lib/auth";
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
  const owner = await requireMember(request, id, memberId);
  if ("response" in owner) return owner.response;

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

  publish(id, "response.created");
  if (choice === "skipping") {
    await recordAbsences(id, member.group.penaltyPoints, [
      { memberId, date, reason: "skipping" },
    ]);
  }
  return Response.json({ date, choice }, { status: 201 });
}
