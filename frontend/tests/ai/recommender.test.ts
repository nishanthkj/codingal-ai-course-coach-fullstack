import { describe, it, expect } from "vitest";
import { recommendNext } from "../../src/ai/recommender";

const now = Date.now();

describe("recommendNext - behavior and determinism", () => {
  it("deterministic for same input", () => {
    const stub = {
      student: { id: "s1" },
      courses: [
        { id: "c1", name: "A", progress: 10, lastActivity: now - 86400_000 * 3 },
        { id: "c2", name: "B", progress: 20, lastActivity: now - 86400_000 * 2 },
      ],
      attempts: [],
    };
    const a = recommendNext(stub);
    const b = recommendNext(stub);
    expect(a).toEqual(b);
  });

  it("prefers lowest progress", () => {
    const stub = {
      student: { id: "s1" },
      courses: [
        { id: "c1", name: "Alpha", progress: 35, lastActivity: now - 86400_000 * 5 },
        { id: "c2", name: "Beta", progress: 55, lastActivity: now - 86400_000 * 2 },
        { id: "c3", name: "Gamma", progress: 10, lastActivity: now - 86400_000 * 10 },
      ],
      attempts: [],
    };
    const r = recommendNext(stub);
    expect(r.id).toBe("c3");
  });

  it("deterministic tie-breaker: same progress uses lastActivity then id", () => {
    const courses = [
      { id: "a", name: "A", progress: 0, lastActivity: now - 86400_000 * 30 },
      { id: "b", name: "B", progress: 0, lastActivity: now - 86400_000 * 5 },
      { id: "c", name: "C", progress: 0, lastActivity: now - 86400_000 * 30 + 1 },
    ];
    const input = { student: { id: "sX" }, courses, attempts: [] };
    const r1 = recommendNext(input);
    const r2 = recommendNext(input);
    expect(r1.id).toBe(r2.id);
    // oldest lastActivity among tied progress is "a"
    expect(r1.id).toBe("a");
  });

  it("graceful fallback for empty courses", () => {
    const r = recommendNext({ student: {}, courses: [], attempts: [] });
    expect(r).toBeDefined();
    expect(typeof r.confidence).toBe("number");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.alternatives)).toBe(true);
  });

  it("handles missing progress values", () => {
    const courses = [{ id: "x", name: "X" }, { id: "y", name: "Y", progress: 10 }];
    const r = recommendNext({ student: {}, courses, attempts: [] });
    expect(r).toBeDefined();
    expect(typeof r.confidence).toBe("number");
    expect(r.id).toBeDefined();
  });

  it("returns alternatives and method field", () => {
    const stub = {
      student: { id: "s1" },
      courses: [
        { id: "c1", name: "A", progress: 10 },
        { id: "c2", name: "B", progress: 20 },
        { id: "c3", name: "C", progress: 30 },
        { id: "c4", name: "D", progress: 40 },
      ],
      attempts: [],
    };
    const r = recommendNext(stub);
    expect(r.method).toBe("heuristic");
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.alternatives.length).toBeGreaterThanOrEqual(1);
    r.alternatives.forEach((a) => {
      expect(a.id).toBeDefined();
      expect(a.title).toBeDefined();
    });
  });
});
