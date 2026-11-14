import type { AttendanceStatus } from "@/lib/attendance";

export type GroupState = {
  id: string;
  name: string;
  inviteCode: string;
  alarmTime: string | null;
  startPoints: number;
  penaltyPoints: number;
  meetup: { lat: number; lng: number; radiusM: number } | null;
  date: string;
  members: {
    id: string;
    nickname: string;
    points: number;
    status: AttendanceStatus;
    source: "manual" | "auto" | null;
    clips: { id: string; mimeType: string; hasVideo: boolean }[];
    lastPoke: { at: string; fromNickname: string } | null;
  }[];
  penalties: {
    memberId: string;
    nickname: string;
    date: string;
    points: number;
    reason: string;
  }[];
};
