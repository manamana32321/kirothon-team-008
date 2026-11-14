import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import * as webpush from "web-push";
import { db } from "@/db";
import { VAPID_FILE } from "@/lib/config";

type Vapid = { publicKey: string; privateKey: string };

let cached: Vapid | null = null;

function loadVapid(): Vapid {
  if (cached) return cached;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    cached = { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY };
  } else if (existsSync(VAPID_FILE)) {
    cached = JSON.parse(readFileSync(VAPID_FILE, "utf8")) as Vapid;
  } else {
    cached = webpush.generateVAPIDKeys();
    mkdirSync(dirname(VAPID_FILE), { recursive: true });
    writeFileSync(VAPID_FILE, JSON.stringify(cached), { mode: 0o600 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@gymcall.json-server.win",
    cached.publicKey,
    cached.privateKey,
  );
  return cached;
}

export function vapidPublicKey(): string {
  return loadVapid().publicKey;
}

export type PushPayload = { title: string; body: string; url: string };

export async function sendPush(memberIds: string[], payload: PushPayload): Promise<void> {
  if (memberIds.length === 0) return;
  loadVapid();
  const subs = await db.pushSubscription.findMany({ where: { memberId: { in: memberIds } } });
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { endpoint: s.endpoint } });
        }
      }
    }),
  );
}
