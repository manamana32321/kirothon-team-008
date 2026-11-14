import { db } from "@/db";
import { dateKey } from "@/lib/alarm";
import { WAKE_CALL_MAX_MINUTES } from "@/lib/config";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { memberRefSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, memberRefSchema);
  if ("response" in input) return input.response;
  const { memberId } = input.data;

  const member = await db.member.findFirst({ where: { id: memberId, groupId: id }, select: { id: true } });
  if (!member) return error(404, "그룹에 없는 멤버입니다");

  const now = new Date();
  const since = new Date(now.getTime() - WAKE_CALL_MAX_MINUTES * 60_000);
  const { count } = await db.wakeCall.updateMany({
    where: { groupId: id, toMemberId: memberId, ackedAt: null, createdAt: { gt: since } },
    data: { ackedAt: now },
  });
  if (count === 0) return error(409, "울리는 호출이 없습니다");

  const clip = await db.clip.findFirst({
    where: { toMemberId: memberId, usedDate: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (clip) await db.clip.update({ where: { id: clip.id }, data: { usedDate: dateKey(now) } });

  publish(id, "wake.acked");
  return Response.json({ acked: count });
}
