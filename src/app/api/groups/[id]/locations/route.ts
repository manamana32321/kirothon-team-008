import { db } from "@/db";
import { requireGroupMember } from "@/lib/auth";
import { error } from "@/lib/http";
import { clearGroup, listPositions } from "@/lib/locations";
import { inShareWindow } from "@/lib/meetup";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireGroupMember(request, id);
  if ("response" in guard) return guard.response;
  const group = await db.group.findUnique({ where: { id }, select: { alarmTime: true } });
  if (!group) return error(404, "없는 그룹입니다");

  const sharing = inShareWindow(new Date(), group.alarmTime);
  if (!sharing) clearGroup(id);
  return Response.json({ sharing, positions: sharing ? listPositions(id) : [] });
}
