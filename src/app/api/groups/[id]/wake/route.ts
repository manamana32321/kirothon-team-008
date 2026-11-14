import { db } from "@/db";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { wakeSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, wakeSchema);
  if ("response" in input) return input.response;
  const { fromMemberId, toMemberId } = input.data;

  if (fromMemberId === toMemberId) return error(400, "자기 자신은 깨울 수 없습니다");
  const members = await db.member.count({
    where: { groupId: id, id: { in: [fromMemberId, toMemberId] } },
  });
  if (members !== 2) return error(404, "그룹에 없는 멤버입니다");

  const call = await db.wakeCall.create({ data: { groupId: id, fromMemberId, toMemberId } });
  publish(id, "wake.called");
  return Response.json({ id: call.id }, { status: 201 });
}
