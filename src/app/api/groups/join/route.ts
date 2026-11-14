import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { joinGroupSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const input = await parseJson(request, joinGroupSchema);
  if ("response" in input) return input.response;

  const group = await db.group.findUnique({
    where: { inviteCode: input.data.inviteCode.toUpperCase() },
  });
  if (!group) return error(404, "없는 초대 코드입니다");

  const { user } = auth;
  const mine = await db.member.findFirst({ where: { groupId: group.id, userId: user.id } });
  if (mine) return Response.json({ groupId: group.id, memberId: mine.id });

  const legacy = await db.member.findFirst({
    where: { groupId: group.id, nickname: user.username, userId: null },
  });
  if (legacy) {
    await db.member.update({ where: { id: legacy.id }, data: { userId: user.id } });
    return Response.json({ groupId: group.id, memberId: legacy.id });
  }

  const member = await db.member.create({
    data: { groupId: group.id, userId: user.id, nickname: user.username, points: group.startPoints },
  });
  publish(group.id, "group.updated");
  return Response.json({ groupId: group.id, memberId: member.id }, { status: 201 });
}
