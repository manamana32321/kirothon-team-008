import { describe, expect, it } from "vitest";
import { dateKey, shouldRing } from "@/lib/alarm";

const at = (h: number, m: number, s = 0, day = 14) =>
  new Date(2026, 10, day, h, m, s);

describe("shouldRing", () => {
  it("알람 시각 1초 전에는 울리지 않는다", () => {
    expect(shouldRing(at(6, 59, 59), "07:00", false)).toBe(false);
  });
  it("알람 시각 정각에 울린다", () => {
    expect(shouldRing(at(7, 0), "07:00", false)).toBe(true);
  });
  it("알람 시각 이후에도 미응답이면 울린다", () => {
    expect(shouldRing(at(7, 5), "07:00", false)).toBe(true);
  });
  it("이미 응답한 날은 울리지 않는다", () => {
    expect(shouldRing(at(7, 5), "07:00", true)).toBe(false);
  });
  it("알람이 없으면 울리지 않는다", () => {
    expect(shouldRing(at(7, 5), null, false)).toBe(false);
  });
  it("자정을 넘기면 다음 날 알람 시각 전까지 울리지 않는다", () => {
    expect(shouldRing(at(0, 0, 0, 15), "07:00", false)).toBe(false);
    expect(shouldRing(at(7, 0, 0, 15), "07:00", false)).toBe(true);
  });
});

describe("dateKey", () => {
  it("로컬 날짜를 YYYY-MM-DD로 만든다", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
  it("자정을 넘기면 키가 바뀐다", () => {
    expect(dateKey(at(23, 59, 59))).toBe("2026-11-14");
    expect(dateKey(at(0, 0, 0, 15))).toBe("2026-11-15");
  });
});