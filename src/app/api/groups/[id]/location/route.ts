import { db } from "@/db";
import { requireMember } from "@/lib/auth";
import { dateKey } from "@/lib/alarm";
import { attendanceStatuses } from "@/lib/attendance";
import { MIN_SEND_INTERVAL_SECONDS, SHARE_WINDOW_MINUTES } from "@/lib/config";
import { publish } from "@/lib/events";
import { error, isUniqueViolation, parseJson } from "@/lib/http";
import { clearGroup, getPosition, removePosition, savePosition } from "@/lib/locations";
import { inShareWindow, shouldAutoAttend } from "@/lib/meetup";
import { locationSchema, memberRefSchema } from "@/lib/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, locationSchema);
  if ("response" in input) return input.response;
  const { memberId, lat, lng, accuracyM } = input.data;
  const owner = await requireMember(request, id, memberId);
  if ("response" in owner) return owner.response;

  const now = new Date();
  const date = dateKey(now);
  const member = await db.member.findFirst({
    where: { id: memberId, groupId: id },
    include: {
      group: true,
      responses: { where: { date }, select: { id: true } },
      penaltyLogs: { where: { date }, select: { id: true } },
    },
  });
  if (!member) return error(404, "그룹에 없는 멤버입니다");
  const { group } = member;

  if (!inShareWindow(now, group.alarmTime)) {
    clearGroup(id);
    return error(409, `알람 후 ${SHARE_WINDOW_MINUTES}분 동안만 공유돼요`);
  }

  const last = getPosition(id, memberId);
  if (last && now.getTime() - last.updatedAt < MIN_SEND_INTERVAL_SECONDS * 1000) {
    return error(429, `${MIN_SEND_INTERVAL_SECONDS}초에 한 번만 보낼 수 있어요`);
  }

  savePosition(id, { memberId, lat, lng, accuracyM, updatedAt: now.getTime() });
  publish(id, "location.updated");

  const place =
    group.meetupLat === null || group.meetupLng === null
      ? null
      : { lat: group.meetupLat, lng: group.meetupLng, radiusM: group.meetupRadiusM };
  const arrive = shouldAutoAttend({
    now,
    alarmTime: group.alarmTime,
    place,
    pos: { lat, lng, accuracyM },
    respondedToday: member.responses.length > 0,
    penalizedToday:
      member.penaltyLogs.length > 0 ||
      attendanceStatuses([memberId], [], date, group.alarmTime, now)[memberId] === "no_response",
  });

  let autoAttended = false;
  if (arrive) {
    try {
      await db.response.create({ data: { memberId, date, choice: "going", source: "auto" } });
      autoAttended = true;
      publish(id, "response.created");
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  return Response.json({ saved: true, autoAttended });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const input = await parseJson(request, memberRefSchema);
  if ("response" in input) return input.response;
  const owner = await requireMember(request, id, input.data.memberId);
  if ("response" in owner) return owner.response;
  if (removePosition(id, input.data.memberId)) publish(id, "location.updated");
  return new Response(null, { status: 204 });
}
