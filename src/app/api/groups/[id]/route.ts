import { db } from "@/db";
import { requireGroupMember } from "@/lib/auth";
import { dateKey } from "@/lib/alarm";
import { attendanceStatuses } from "@/lib/attendance";
import type { GroupState } from "@/lib/group-state";
import { error } from "@/lib/http";
import { recordAbsences } from "@/lib/penalty-store";

async function loadGroup(id: string, date: string) {
  return db.group.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { nickname: "asc" },
        include: {
          responses: { where: { date } },
          clipsSent: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          wakeReceived: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { fromMember: { select: { nickname: true } } },
          },
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireGroupMember(request, id);
  if ("response" in guard) return guard.response;
  const now = new Date();
  const date = dateKey(now);

  let group = await loadGroup(id, date);
  if (!group) return error(404, "없는 그룹입니다");

  const statuses = attendanceStatuses(
    group.members.map((m) => m.id),
    group.members.flatMap((m) =>
      m.responses.map((r) => ({ memberId: m.id, choice: r.choice as "going" | "skipping" })),
    ),
    date,
    group.alarmTime,
    now,
  );

  const absences = group.members
    .filter((m) => statuses[m.id] === "no_response")
    .map((m) => ({ memberId: m.id, date, reason: "no_response" as const }));
  if ((await recordAbsences(group.id, group.penaltyPoints, absences)) > 0) {
    group = (await loadGroup(id, date))!;
  }

  const penalties = await db.penaltyLog.findMany({
    where: { member: { groupId: id } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: 30,
    include: { member: { select: { nickname: true } } },
  });

  const body: GroupState = {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    alarmTime: group.alarmTime,
    startPoints: group.startPoints,
    penaltyPoints: group.penaltyPoints,
    meetup:
      group.meetupLat === null || group.meetupLng === null
        ? null
        : { lat: group.meetupLat, lng: group.meetupLng, radiusM: group.meetupRadiusM },
    date,
    members: group.members.map((m) => {
      const poke = m.wakeReceived[0];
      return {
        id: m.id,
        nickname: m.nickname,
        points: m.points,
        status: statuses[m.id],
        source: (m.responses[0]?.source ?? null) as "manual" | "auto" | null,
        clips: m.clipsSent.map((c) => ({ id: c.id, mimeType: c.mimeType, hasVideo: c.hasVideo })),
        lastPoke: poke
          ? { at: poke.createdAt.toISOString(), fromNickname: poke.fromMember.nickname }
          : null,
      };
    }),
    penalties: penalties.map((p) => ({
      memberId: p.memberId,
      nickname: p.member.nickname,
      date: p.date,
      points: p.points,
      reason: p.reason,
    })),
  };
  return Response.json(body);
}
