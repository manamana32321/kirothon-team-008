import { db } from "@/db";
import { requireMember } from "@/lib/auth";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { sendPush } from "@/lib/push";
import { pokeSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, pokeSchema);
  if ("response" in input) return input.response;
  const { fromMemberId } = input.data;
  const owner = await requireMember(request, id, fromMemberId);
  if ("response" in owner) return owner.response;
  const toMemberIds = [...new Set(input.data.toMemberIds)];

  if (toMemberIds.includes(fromMemberId)) return error(400, "자기 자신은 찌를 수 없습니다");
  const members = await db.member.count({
    where: { groupId: id, id: { in: [fromMemberId, ...toMemberIds] } },
  });
  if (members !== toMemberIds.length + 1) return error(404, "그룹에 없는 멤버입니다");

  await db.wakeCall.createMany({
    data: toMemberIds.map((toMemberId) => ({ groupId: id, fromMemberId, toMemberId })),
  });
  publish(id, "poke.sent");
  const from = await db.member.findUnique({ where: { id: fromMemberId }, select: { nickname: true } });
  void sendPush(toMemberIds, {
    title: "운동기",
    body: `${from?.nickname ?? "친구"}님이 찔렀어요`,
    url: `/g/${id}`,
  }).catch(() => {});
  return Response.json({ poked: toMemberIds.length }, { status: 201 });
}
