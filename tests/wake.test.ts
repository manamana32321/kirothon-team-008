import { describe, expect, it } from "vitest";
import { activeCall, wakeExpiresAt, wakeStatus } from "@/lib/wake";

const created = new Date(2026, 10, 14, 7, 0, 0);
const at = (sec: number) => new Date(created.getTime() + sec * 1000);
const call = (ackedAt: Date | null = null, createdAt = created) => ({ createdAt, ackedAt });

describe("wakeStatus", () => {
  it("만료 1초 전에는 울리는 중이다", () => {
    expect(wakeStatus(call(), at(299))).toBe("calling");
  });
  it("5분 정각에 만료된다", () => {
    expect(wakeStatus(call(), at(300))).toBe("expired");
  });
  it("확인한 호출은 시간과 무관하게 acked다", () => {
    expect(wakeStatus(call(at(10)), at(1000))).toBe("acked");
  });
  it("만료 시각은 생성 5분 뒤다", () => {
    expect(wakeExpiresAt(call()).getTime()).toBe(at(300).getTime());
  });
});

describe("activeCall", () => {
  it("활성 호출이 없으면 null이다", () => {
    expect(activeCall([call(at(5)), call()], at(400))).toBeNull();
  });
  it("확인된 호출은 건너뛴다", () => {
    const active = call(null, at(60));
    expect(activeCall([call(at(70)), active], at(100))).toBe(active);
  });
  it("활성 호출이 여럿이면 가장 최근 것을 고른다", () => {
    const older = call(null, at(0));
    const newer = call(null, at(60));
    expect(activeCall([older, newer], at(100))).toBe(newer);
  });
});
