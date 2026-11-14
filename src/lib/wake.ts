import { WAKE_CALL_MAX_MINUTES } from "@/lib/config";

export type WakeCallLike = { createdAt: Date; ackedAt: Date | null };
export type WakeStatus = "calling" | "acked" | "expired";

export function wakeExpiresAt(call: Pick<WakeCallLike, "createdAt">): Date {
  return new Date(call.createdAt.getTime() + WAKE_CALL_MAX_MINUTES * 60_000);
}

export function wakeStatus(call: WakeCallLike, now: Date): WakeStatus {
  if (call.ackedAt) return "acked";
  return now.getTime() < wakeExpiresAt(call).getTime() ? "calling" : "expired";
}

export function activeCall<T extends WakeCallLike>(calls: T[], now: Date): T | null {
  const active = calls.filter((c) => wakeStatus(c, now) === "calling");
  if (active.length === 0) return null;
  return active.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
}
