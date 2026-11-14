import { db } from "@/db";
import { dateKey } from "@/lib/alarm";
import { sendPush } from "@/lib/push";

const TICK_MS = 20_000;

const globalForAlarm = globalThis as unknown as { alarmPushTimer?: NodeJS.Timeout };

let sentDate = "";
const sent = new Set<string>();

async function tick() {
  const now = new Date();
  const date = dateKey(now);
  if (date !== sentDate) {
    sentDate = date;
    sent.clear();
  }
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const groups = await db.group.findMany({
    where: { alarmTime: hhmm },
    include: {
      members: { include: { responses: { where: { date }, select: { id: true } } } },
    },
  });
  for (const group of groups) {
    const targets = group.members
      .filter((m) => m.responses.length === 0 && !sent.has(m.id))
      .map((m) => m.id);
    targets.forEach((id) => sent.add(id));
    await sendPush(targets, {
      title: "운동기 알람",
      body: `${group.name} 운동 시간이에요. Go / No Go를 눌러 주세요.`,
      url: `/g/${group.id}`,
    });
  }
}

export function startAlarmPush() {
  if (globalForAlarm.alarmPushTimer) return;
  globalForAlarm.alarmPushTimer = setInterval(() => {
    tick().catch((e) => console.error("alarm push failed", e));
  }, TICK_MS);
}
