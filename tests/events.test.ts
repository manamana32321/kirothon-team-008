import { describe, expect, it } from "vitest";
import { publish, subscribe, type GroupEvent } from "@/lib/events";

describe("events", () => {
  it("delivers only to subscribers of the same group", () => {
    const a: GroupEvent[] = [];
    const b: GroupEvent[] = [];
    const offA = subscribe("g1", (e) => a.push(e));
    const offB = subscribe("g2", (e) => b.push(e));
    publish("g1", "group.updated");
    expect(a).toEqual(["group.updated"]);
    expect(b).toEqual([]);
    offA();
    offB();
  });

  it("stops delivering after unsubscribe", () => {
    const got: GroupEvent[] = [];
    const off = subscribe("g1", (e) => got.push(e));
    off();
    publish("g1", "clip.created");
    expect(got).toEqual([]);
  });
});
