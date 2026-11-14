import { db } from "@/db";
import { requireMember } from "@/lib/auth";
import { parseJson } from "@/lib/http";
import { pushSubscribeSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, pushSubscribeSchema);
  if ("response" in input) return input.response;
  const { memberId, subscription } = input.data;

  const owner = await requireMember(request, id, memberId);
  if ("response" in owner) return owner.response;

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
