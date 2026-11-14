import { db } from "@/db";
import { publish } from "@/lib/events";
import { type Absence, newPenalties } from "@/lib/penalty";

export async function recordAbsences(
  groupId: string,
  penaltyPoints: number,
  absences: Absence[],
): Promise<number> {
  if (absences.length === 0 || penaltyPoints <= 0) return 0;
  const created = await db.$transaction(async (tx) => {
    const existing = await tx.penaltyLog.findMany({
      where: { OR: absences.map(({ memberId, date }) => ({ memberId, date })) },
      select: { memberId: true, date: true },
    });
    const toCreate = newPenalties(absences, existing, penaltyPoints);
    for (const p of toCreate) {
      await tx.penaltyLog.create({
        data: { memberId: p.memberId, date: p.date, points: p.points, reason: p.reason },
      });
      await tx.member.update({
        where: { id: p.memberId },
        data: { points: { decrement: p.points } },
      });
    }
    return toCreate.length;
  });
  if (created > 0) publish(groupId, "penalty.applied");
  return created;
}

export async function refundSkipping(groupId: string, memberId: string, date: string): Promise<boolean> {
  const refunded = await db.$transaction(async (tx) => {
    const log = await tx.penaltyLog.findUnique({ where: { memberId_date: { memberId, date } } });
    if (!log || log.reason !== "skipping") return false;
    await tx.penaltyLog.delete({ where: { id: log.id } });
    await tx.member.update({ where: { id: memberId }, data: { points: { increment: log.points } } });
    return true;
  });
  if (refunded) publish(groupId, "penalty.applied");
  return refunded;
}
