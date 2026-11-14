import { db } from "@/db";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { setAlarmSchema } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, setAlarmSchema);
  if ("response" in input) return input.response;

  const updated = await db.group.updateMany({ where: { id }, data: input.data });
  if (updated.count === 0) return error(404, "없는 그룹입니다");
  publish(id, "group.updated");
  return Response.json(input.data);
}
