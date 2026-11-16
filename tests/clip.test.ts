import { describe, expect, it } from "vitest";
import { clipDay, clipDayRange, hasVideo, pickMimeType } from "@/lib/clip";

const only = (...types: string[]) => (t: string) => types.includes(t);

describe("pickMimeType", () => {
  it("모두 지원하면 video/webm을 먼저 고른다", () => {
    expect(
      pickMimeType(
        only("video/webm", "video/mp4", "audio/webm", "audio/mp4"),
        true,
      ),
    ).toBe("video/webm");
  });
  it("video/webm이 없으면 video/mp4", () => {
    expect(pickMimeType(only("video/mp4", "audio/webm"), true)).toBe(
      "video/mp4",
    );
  });
  it("영상 형식이 없으면 audio 형식으로 내려간다", () => {
    expect(pickMimeType(only("audio/mp4", "audio/webm"), true)).toBe(
      "audio/webm",
    );
  });
  it("카메라가 꺼져 있으면 audio만 고른다", () => {
    expect(
      pickMimeType(only("video/webm", "audio/webm", "audio/mp4"), false),
    ).toBe("audio/webm");
    expect(pickMimeType(only("video/webm", "audio/mp4"), false)).toBe(
      "audio/mp4",
    );
  });
  it("지원 형식이 없으면 null", () => {
    expect(pickMimeType(() => false, true)).toBeNull();
  });
});

describe("hasVideo", () => {
  it("video/*만 true", () => {
    expect(hasVideo("video/webm")).toBe(true);
    expect(hasVideo("video/webm;codecs=vp9")).toBe(true);
    expect(hasVideo("audio/webm")).toBe(false);
  });
});

describe("clipDay", () => {
  const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);
  it("새벽 4시부터 그날 클립이다", () => {
    expect(clipDay(at(16, 4))).toBe("2026-11-16");
    expect(clipDay(at(16, 23, 59))).toBe("2026-11-16");
  });
  it("새벽 4시 전은 전날 클립이다", () => {
    expect(clipDay(at(16, 3, 59))).toBe("2026-11-15");
    expect(clipDay(at(16, 0))).toBe("2026-11-15");
  });
  it("월 경계를 넘긴다", () => {
    expect(clipDay(new Date(2026, 11, 1, 1))).toBe("2026-11-30");
  });
});

describe("clipDayRange", () => {
  it("그날 04:00 이상, 다음 날 04:00 미만", () => {
    const { start, end } = clipDayRange("2026-11-30");
    expect(start).toEqual(new Date(2026, 10, 30, 4));
    expect(end).toEqual(new Date(2026, 11, 1, 4));
  });
  it("범위 안 시각은 같은 clipDay를 돌려준다", () => {
    const { start, end } = clipDayRange("2026-11-16");
    expect(clipDay(start)).toBe("2026-11-16");
    expect(clipDay(new Date(end.getTime() - 1))).toBe("2026-11-16");
    expect(clipDay(end)).toBe("2026-11-17");
  });
});
