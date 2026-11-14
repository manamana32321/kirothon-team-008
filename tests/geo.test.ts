import { describe, expect, it } from "vitest";
import { distanceM, isInside } from "@/lib/geo";

const seoulStation = { lat: 37.5547, lng: 126.9707 };
const cityHall = { lat: 37.5663, lng: 126.9779 };

describe("distanceM", () => {
  it("같은 점은 0m", () => {
    expect(distanceM(seoulStation, seoulStation)).toBe(0);
  });
  it("서울역-시청은 약 1.45km (오차 1% 이내)", () => {
    const d = distanceM(seoulStation, cityHall);
    expect(Math.abs(d - 1450) / 1450).toBeLessThan(0.01);
  });
  it("위도 0.001도는 약 111m", () => {
    const d = distanceM({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 });
    expect(Math.abs(d - 111.19)).toBeLessThan(1);
  });
});

describe("isInside", () => {
  const place = { lat: 0, lng: 0, radiusM: 100 };
  it("반경 안", () => {
    expect(isInside({ lat: 0.0008, lng: 0 }, place)).toBe(true);
  });
  it("반경 경계 바로 밖", () => {
    expect(isInside({ lat: 0.0009, lng: 0 }, place)).toBe(false);
  });
  it("반경과 같은 거리는 안으로 본다", () => {
    const edge = { lat: 0.0009, lng: 0 };
    expect(isInside(edge, { ...place, radiusM: distanceM(edge, place) })).toBe(true);
  });
});
