import { z } from "zod";
import { MEETUP_RADII_M } from "@/lib/config";

export const MAX_CLIP_BYTES = 8 * 1024 * 1024;

const username = z.string().trim().min(1).max(20);
const password = z.string().min(8).max(128);
const alarmTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM 형식이어야 합니다");

export const signupSchema = z.object({ username, password });

export const loginSchema = z.object({ username, password: z.string().min(1).max(128) });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(30),
});

export const joinGroupSchema = z.union([
  z.object({ inviteCode: z.string().trim().min(1).max(32) }),
  z.object({ groupId: z.string().min(1) }),
]);

export const setAlarmSchema = z.object({
  alarmTime,
  penaltyPoints: z.number().int().min(0).max(1_000_000),
});

export const respondSchema = z.object({
  memberId: z.string().min(1),
  choice: z.enum(["going", "skipping"]),
});

export const resetSchema = z.object({ memberId: z.string().min(1) });

export const clipMetaSchema = z.object({
  fromMemberId: z.string().min(1),
  mimeType: z.string().regex(/^(video|audio)\/[\w.+-]+(;.*)?$/),
  size: z.number().int().positive().max(MAX_CLIP_BYTES),
});

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const meetupSchema = z.object({
  lat,
  lng,
  radiusM: z.union(MEETUP_RADII_M.map((r) => z.literal(r))),
});

export const locationSchema = z.object({
  memberId: z.string().min(1),
  lat,
  lng,
  accuracyM: z.number().min(0),
});

export const pokeSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberIds: z.array(z.string().min(1)).min(1).max(50),
});

export const memberRefSchema = z.object({
  memberId: z.string().min(1),
});

export const pushSubscribeSchema = z.object({
  memberId: z.string().min(1),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
});
