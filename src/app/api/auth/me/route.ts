import { db } from "@/db";
import { currentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ user: null });

  const members = await db.member.findMany({
    where: { userId: user.id },
    include: { group: {
        select: { id: true, name: true, alarmTime: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { group: { name: "asc" } },
  });
  return Response.json({
    user: { id: user.id, username: user.username },
    groups: members.map((m) => ({
      groupId: m.group.id,
      name: m.group.name,
      memberId: m.id,
      memberCount: m.group._count.members,
      alarmTime: m.group.alarmTime,
    })),
  });
}
