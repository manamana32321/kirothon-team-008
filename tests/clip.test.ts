import { describe, expect, it } from "vitest";
import { hasVideo, pickMimeType } from "@/lib/clip";

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