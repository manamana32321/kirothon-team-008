import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { error } from "@/lib/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const group = await db.group.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!group) return error(404, "없는 그룹입니다");
  return Response.json(group);
}
