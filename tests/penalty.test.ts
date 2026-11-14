import { describe, expect, it } from "vitest";
import { applyPenalty, newPenalties } from "@/lib/penalty";

const d = "2026-11-14";

describe("newPenalties", () => {
  it("확정 불참마다 차감을 만든다", () => {
    expect(
      newPenalties(
        [
          { memberId: "a", date: d, reason: "skipping" },
          { memberId: "b", date: d, reason: "no_response" },
        ],
        [],
        100,
      ),
    ).toEqual([
      { memberId: "a", date: d, reason: "skipping", points: 100 },
      { memberId: "b", date: d, reason: "no_response", points: 100 },
    ]);
  });
  it("이미 기록된 (member, date)는 건너뛴다", () => {
    expect(
      newPenalties(
        [{ memberId: "a", date: d, reason: "skipping" }],
        [{ memberId: "a", date: d }],
        100,
      ),
    ).toEqual([]);
  });
  it("같은 멤버의 다른 날짜는 만든다", () => {
    const res = newPenalties(
      [{ memberId: "a", date: "2026-11-15", reason: "skipping" }],
      [{ memberId: "a", date: d }],
      100,
    );
    expect(res).toHaveLength(1);
  });
  it("입력 안의 중복도 한 번만 만든다", () => {
    const res = newPenalties(
      [
        { memberId: "a", date: d, reason: "skipping" },
        { memberId: "a", date: d, reason: "no_response" },
      ],
      [],
      100,
    );
    expect(res).toHaveLength(1);
  });
});

describe("applyPenalty", () => {
  it("0 미만으로 내려가도 허용한다", () => {
    expect(applyPenalty(30, { points: 100 })).toBe(-70);
  });
});