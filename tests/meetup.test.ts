import { describe, expect, it } from "vitest";
import { SHARE_WINDOW_MINUTES } from "@/lib/config";
import { inShareWindow, shouldAutoAttend } from "@/lib/meetup";

const at = (h: number, m: number, s = 0) => new Date(2026, 10, 14, h, m, s);
const place = { lat: 37.5, lng: 127.0, radiusM: 100 };
const near = { lat: 37.5003, lng: 127.0, accuracyM: 20 };
const base = {
  now: at(8, 30),
  alarmTime: "08:00",
  place,
  pos: near,
  respondedToday: false,
  penalizedToday: false,
};

describe("inShareWindow", () => {
  it("공유 시간대는 120분", () => {
    expect(SHARE_WINDOW_MINUTES).toBe(120);
  });
  it("알람 없으면 거짓", () => {
    expect(inShareWindow(at(8, 0), null)).toBe(false);
  });
  it("알람 직전은 거짓, 알람 시각은 참", () => {
    expect(inShareWindow(at(7, 59, 59), "08:00")).toBe(false);
    expect(inShareWindow(at(8, 0), "08:00")).toBe(true);
  });
  it("끝 직전은 참, 끝 시각은 거짓", () => {
    expect(inShareWindow(at(9, 59, 59), "08:00")).toBe(true);
    expect(inShareWindow(at(10, 0), "08:00")).toBe(false);
  });
});

describe("shouldAutoAttend", () => {
  it("모든 조건이 맞으면 참", () => {
    expect(shouldAutoAttend(base)).toBe(true);
  });
  it("모임 장소가 없으면 거짓", () => {
    expect(shouldAutoAttend({ ...base, place: null })).toBe(false);
  });
  it("알람이 없으면 거짓", () => {
    expect(shouldAutoAttend({ ...base, alarmTime: null })).toBe(false);
  });
  it("시간대 밖이면 거짓", () => {
    expect(shouldAutoAttend({ ...base, now: at(10, 1) })).toBe(false);
  });
  it("이미 응답(간다 또는 못 간다)했으면 거짓", () => {
    expect(shouldAutoAttend({ ...base, respondedToday: true })).toBe(false);
  });
  it("무응답 차감이 확정됐으면 거짓", () => {
    expect(shouldAutoAttend({ ...base, penalizedToday: true })).toBe(false);
  });
  it("정확도가 반경보다 나쁘면 거짓", () => {
    expect(shouldAutoAttend({ ...base, pos: { ...near, accuracyM: 150 } })).toBe(false);
  });
  it("반경 밖이면 거짓", () => {
    expect(shouldAutoAttend({ ...base, pos: { ...near, lat: 37.502 } })).toBe(false);
  });
});
