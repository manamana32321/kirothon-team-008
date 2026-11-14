import { z } from "zod";

export const MAX_CLIP_BYTES = 8 * 1024 * 1024;

const nickname = z.string().trim().min(1).max(20);
const alarmTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:MM 형식이어야 합니다");

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(30),
  nickname,
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1).max(32),
  nickname,
});

export const setAlarmSchema = z.object({
  alarmTime,
  penaltyPoints: z.number().int().min(0).max(1_000_000),
});

export const respondSchema = z.object({
  memberId: z.string().min(1),
  choice: z.enum(["going", "skipping"]),
});

export const clipMetaSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  mimeType: z.string().regex(/^(video|audio)\/[\w.+-]+(;.*)?$/),
  size: z.number().int().positive().max(MAX_CLIP_BYTES),
});