export function dateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function alarmAt(date: string, alarmTime: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = alarmTime.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

export function shouldRing(
  now: Date,
  alarmTime: string | null,
  respondedToday: boolean,
): boolean {
  if (alarmTime === null || respondedToday) return false;
  return now.getTime() >= alarmAt(dateKey(now), alarmTime).getTime();
}