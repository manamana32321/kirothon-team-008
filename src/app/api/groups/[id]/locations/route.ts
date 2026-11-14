import { db } from "@/db";
import { error } from "@/lib/http";
import { clearGroup, listPositions } from "@/lib/locations";
import { inShareWindow } from "@/lib/meetup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, select: { alarmTime: true } });
  if (!group) return error(404, "없는 그룹입니다");

  const sharing = inShareWindow(new Date(), group.alarmTime);
  if (!sharing) clearGroup(id);
  return Response.json({ sharing, positions: sharing ? listPositions(id) : [] });
}
