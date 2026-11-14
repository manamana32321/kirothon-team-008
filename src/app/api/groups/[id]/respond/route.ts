import { db } from "@/db";
import { requireMember } from "@/lib/auth";
import { dateKey } from "@/lib/alarm";
import { publish } from "@/lib/events";
import { error, isUniqueViolation, parseJson } from "@/lib/http";
import { recordAbsences, refundSkipping } from "@/lib/penalty-store";
import { resetSchema, respondSchema } from "@/lib/schemas";

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
  const existing = await db.response.findUnique({ where: { memberId_date: { memberId, date } } });
  if (existing?.choice === choice) return Response.json({ date, choice });

  if (existing) {
    await db.response.update({
      where: { id: existing.id },
      data: { choice, source: "manual" },
    });
  } else {
    try {
      await db.response.create({ data: { memberId, date, choice } });
    } catch (e) {
      if (isUniqueViolation(e)) return error(409, "응답을 저장하는 중 충돌이 났어요. 다시 눌러 주세요");
      throw e;
    }
  }

  publish(id, "response.created");
  if (choice === "skipping") {
    await recordAbsences(id, member.group.penaltyPoints, [
      { memberId, date, reason: "skipping" },
    ]);
  } else {
    await refundSkipping(id, memberId, date);
  }
  return Response.json({ date, choice }, { status: existing ? 200 : 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, resetSchema);
  if ("response" in input) return input.response;
  const { memberId } = input.data;
  const owner = await requireMember(request, id, memberId);
  if ("response" in owner) return owner.response;

  const date = dateKey(new Date());
  await db.response.deleteMany({ where: { memberId, date } });
  await refundSkipping(id, memberId, date);
  publish(id, "response.created");
  return Response.json({ date });
}
