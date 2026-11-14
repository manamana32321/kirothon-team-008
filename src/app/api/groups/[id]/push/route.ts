import { db } from "@/db";
import { error, parseJson } from "@/lib/http";
import { pushSubscribeSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, pushSubscribeSchema);
  if ("response" in input) return input.response;
  const { memberId, subscription } = input.data;

  const member = await db.member.findFirst({ where: { id: memberId, groupId: id }, select: { id: true } });
  if (!member) return error(404, "그룹에 없는 멤버입니다");

  const data = {
    memberId,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  };
  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { endpoint: subscription.endpoint, ...data },
    update: data,
  });
  return Response.json({ ok: true }, { status: 201 });
}
