import { db } from "@/db";
import { publish } from "@/lib/events";
import { error, parseJson } from "@/lib/http";
import { meetupSchema } from "@/lib/schemas";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, meetupSchema);
  if ("response" in input) return input.response;
  const { lat, lng, radiusM } = input.data;

  const updated = await db.group.updateMany({
    where: { id },
    data: { meetupLat: lat, meetupLng: lng, meetupRadiusM: radiusM },
  });
  if (updated.count === 0) return error(404, "없는 그룹입니다");
  publish(id, "group.updated");
  return Response.json(input.data);
}
