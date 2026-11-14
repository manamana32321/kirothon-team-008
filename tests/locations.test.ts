import { beforeEach, describe, expect, it } from "vitest";
import {
  clearGroup,
  getPosition,
  listPositions,
  removePosition,
  savePosition,
} from "@/lib/locations";

const pos = (memberId: string, lat = 1) => ({
  memberId,
  lat,
  lng: 2,
  accuracyM: 10,
  updatedAt: 1000,
});

describe("locations", () => {
  beforeEach(() => {
    clearGroup("g1");
    clearGroup("g2");
  });
  it("저장 후 조회", () => {
    savePosition("g1", pos("a"));
    expect(getPosition("g1", "a")).toEqual(pos("a"));
    expect(listPositions("g1")).toHaveLength(1);
  });
  it("같은 멤버는 덮어쓴다", () => {
    savePosition("g1", pos("a", 1));
    savePosition("g1", pos("a", 5));
    expect(listPositions("g1")).toEqual([pos("a", 5)]);
  });
  it("그룹끼리 섞이지 않는다", () => {
    savePosition("g1", pos("a"));
    savePosition("g2", pos("b"));
    expect(listPositions("g1").map((p) => p.memberId)).toEqual(["a"]);
  });
  it("삭제", () => {
    savePosition("g1", pos("a"));
    expect(removePosition("g1", "a")).toBe(true);
    expect(removePosition("g1", "a")).toBe(false);
    expect(listPositions("g1")).toEqual([]);
  });
  it("시간대가 끝나면 그룹 전체를 지운다", () => {
    savePosition("g1", pos("a"));
    savePosition("g1", pos("b"));
    clearGroup("g1");
    expect(listPositions("g1")).toEqual([]);
  });
});
