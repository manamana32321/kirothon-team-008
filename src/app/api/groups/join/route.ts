import { db } from "@/db";
import { publish } from "@/lib/events";
import { error, isUniqueViolation, parseJson } from "@/lib/http";
import { joinGroupSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const input = await parseJson(request, joinGroupSchema);
  if ("response" in input) return input.response;
  const { inviteCode, nickname } = input.data;

  const group = await db.group.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
  if (!group) return error(404, "없는 초대 코드입니다");

  try {
    const member = await db.member.create({
      data: { groupId: group.id, nickname, points: group.startPoints },
    });
    publish(group.id, "group.updated");
    return Response.json({ groupId: group.id, memberId: member.id }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) return error(409, "이미 쓰는 닉네임입니다");
    throw e;
  }
}
