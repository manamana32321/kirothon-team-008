import { describe, expect, it } from "vitest";
import { NO_RESPONSE_MINUTES, attendanceStatuses } from "@/lib/attendance";

const date = "2026-11-14";
const at = (h: number, m: number, s = 0) => new Date(2026, 10, 14, h, m, s);
const members = ["a", "b", "c"];

describe("attendanceStatuses", () => {
  it("대기 시간은 10분이다", () => {
    expect(NO_RESPONSE_MINUTES).toBe(10);
  });
  it("알람 전에는 모두 pending", () => {
    expect(attendanceStatuses(members, [], date, "07:00", at(6, 59))).toEqual({
      a: "pending",
      b: "pending",
      c: "pending",
    });
  });
  it("응답한 멤버는 선택값, 나머지는 pending", () => {
    const res = attendanceStatuses(
      members,
      [
        { memberId: "a", choice: "going" },
        { memberId: "b", choice: "skipping" },
      ],
      date,
      "07:00",
      at(7, 5),
    );
    expect(res).toEqual({ a: "going", b: "skipping", c: "pending" });
  });
  it("10분 경과 직전까지는 pending", () => {
    expect(
      attendanceStatuses(["a"], [], date, "07:00", at(7, 9, 59)).a,
    ).toBe("pending");
  });
  it("10분 경과 시 미응답은 no_response", () => {
    expect(attendanceStatuses(["a"], [], date, "07:00", at(7, 10)).a).toBe(
      "no_response",
    );
  });
  it("10분 경과 후에도 응답한 멤버는 유지", () => {
    expect(
      attendanceStatuses(
        ["a"],
        [{ memberId: "a", choice: "going" }],
        date,
        "07:00",
        at(8, 0),
      ).a,
    ).toBe("going");
  });
  it("지난 날짜의 미응답은 no_response", () => {
    expect(
      attendanceStatuses(["a"], [], "2026-11-13", "07:00", at(0, 1)).a,
    ).toBe("no_response");
  });
  it("알람이 없으면 pending", () => {
    expect(attendanceStatuses(["a"], [], date, null, at(9, 0)).a).toBe(
      "pending",
    );
  });
});