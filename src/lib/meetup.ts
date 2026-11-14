import { alarmAt, dateKey } from "@/lib/alarm";
import { SHARE_WINDOW_MINUTES } from "@/lib/config";
import { type Place, isInside } from "@/lib/geo";

export function inShareWindow(now: Date, alarmTime: string | null): boolean {
  if (alarmTime === null) return false;
  const start = alarmAt(dateKey(now), alarmTime).getTime();
  const t = now.getTime();
  return t >= start && t < start + SHARE_WINDOW_MINUTES * 60_000;
}

export function shouldAutoAttend(input: {
  now: Date;
  alarmTime: string | null;
  place: Place | null;
  pos: { lat: number; lng: number; accuracyM: number };
  respondedToday: boolean;
  penalizedToday: boolean;
}): boolean {
  const { now, alarmTime, place, pos, respondedToday, penalizedToday } = input;
  if (place === null || respondedToday || penalizedToday) return false;
  if (!inShareWindow(now, alarmTime)) return false;
  if (pos.accuracyM > place.radiusM) return false;
  return isInside(pos, place);
}
