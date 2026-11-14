import type { AttendanceStatus } from "@/lib/attendance";

export type GroupState = {
  id: string;
  name: string;
  inviteCode: string;
  alarmTime: string | null;
  startPoints: number;
  penaltyPoints: number;
  date: string;
  members: {
    id: string;
    nickname: string;
    points: number;
    status: AttendanceStatus;
    nextClip: { id: string; mimeType: string; hasVideo: boolean; fromNickname: string } | null;
  }[];
  penalties: {
    memberId: string;
    nickname: string;
    date: string;
    points: number;
    reason: string;
  }[];
};

export function memberKey(groupId: string) {
  return `gymcall:member:${groupId}`;
}
