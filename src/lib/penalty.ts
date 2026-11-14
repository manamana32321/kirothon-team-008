export type Absence = {
  memberId: string;
  date: string;
  reason: "skipping" | "no_response";
};

export type PenaltyKey = { memberId: string; date: string };

export type NewPenalty = Absence & { points: number };

export function newPenalties(
  absences: Absence[],
  existing: PenaltyKey[],
  penaltyPoints: number,
): NewPenalty[] {
  const seen = new Set(existing.map((p) => `${p.memberId}|${p.date}`));
  const result: NewPenalty[] = [];
  for (const a of absences) {
    const key = `${a.memberId}|${a.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...a, points: penaltyPoints });
  }
  return result;
}

export function applyPenalty(current: number, penalty: { points: number }): number {
  return current - penalty.points;
}