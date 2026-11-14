import { alarmAt } from "@/lib/alarm";

export const NO_RESPONSE_MINUTES = 10;

export type AttendanceStatus = "pending" | "going" | "skipping" | "no_response";

export type AttendanceResponse = {
  memberId: string;
  choice: "going" | "skipping";
};

export function attendanceStatuses(
  memberIds: string[],
  responses: AttendanceResponse[],
  date: string,
  alarmTime: string | null,
  now: Date,
): Record<string, AttendanceStatus> {
  const choices = new Map(responses.map((r) => [r.memberId, r.choice]));
  const deadline =
    alarmTime === null
      ? null
      : alarmAt(date, alarmTime).getTime() + NO_RESPONSE_MINUTES * 60_000;
  const result: Record<string, AttendanceStatus> = {};
  for (const id of memberIds) {
    const choice = choices.get(id);
    if (choice) result[id] = choice;
    else if (deadline !== null && now.getTime() >= deadline)
      result[id] = "no_response";
    else result[id] = "pending";
  }
  return result;
}