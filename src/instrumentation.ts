export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAlarmPush } = await import("@/lib/alarm-push");
  startAlarmPush();
}
