import { describe, expect, it } from "vitest";

import {
  RATIOS,
  buildTimeline,
  easeInOut,
  frameCount,
  safeArea,
  sceneAt,
  type Scene,
} from "./timeline";

const scenes: Scene[] = [
  { id: "hook", weight: 2, lines: ["Where is it now?"] },
  { id: "promise", weight: 3, lines: ["One place.", "One search."] },
  { id: "cta", weight: 1, lines: ["Download VoxClip"] },
];

describe("buildTimeline", () => {
  it("divides the duration by weight, not equally", () => {
    const t = buildTimeline(scenes, 12);
    expect(t.map((s) => s.durationMs)).toEqual([4000, 6000, 2000]);
  });

  it("lays the scenes end to end with no gap and no overlap", () => {
    const t = buildTimeline(scenes, 12);
    expect(t[0].startMs).toBe(0);
    expect(t[1].startMs).toBe(t[0].startMs + t[0].durationMs);
    expect(t[2].startMs).toBe(t[1].startMs + t[1].durationMs);
    expect(t[2].startMs + t[2].durationMs).toBe(12000);
  });

  it("keeps the last scene ending exactly on the duration despite rounding", () => {
    const t = buildTimeline(scenes, 7);
    expect(t[t.length - 1].startMs + t[t.length - 1].durationMs).toBe(7000);
  });

  it("refuses a timeline with no scenes rather than rendering nothing", () => {
    expect(() => buildTimeline([], 10)).toThrow(/scene/i);
  });

  it("refuses a duration a platform would reject", () => {
    expect(() => buildTimeline(scenes, 0)).toThrow(/duration/i);
    expect(() => buildTimeline(scenes, 400)).toThrow(/duration/i);
  });
});

describe("sceneAt", () => {
  const t = buildTimeline(scenes, 12);

  it("finds the scene playing at a moment", () => {
    expect(sceneAt(t, 0)?.id).toBe("hook");
    expect(sceneAt(t, 3999)?.id).toBe("hook");
    expect(sceneAt(t, 4000)?.id).toBe("promise");
    expect(sceneAt(t, 10500)?.id).toBe("cta");
  });

  it("reports progress inside the scene, not inside the whole video", () => {
    expect(sceneAt(t, 0)?.progress).toBeCloseTo(0);
    expect(sceneAt(t, 2000)?.progress).toBeCloseTo(0.5);
    expect(sceneAt(t, 7000)?.progress).toBeCloseTo(0.5);
  });

  it("holds on the last frame rather than going blank at the end", () => {
    const end = sceneAt(t, 12000);
    expect(end?.id).toBe("cta");
    expect(end?.progress).toBe(1);
  });

  it("clamps a negative time to the start", () => {
    expect(sceneAt(t, -500)?.id).toBe("hook");
  });
});

describe("easeInOut", () => {
  it("starts at nothing and ends at everything", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it("is symmetric around the middle", () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(0.25) + easeInOut(0.75)).toBeCloseTo(1);
  });

  it("never leaves the range, even when given nonsense", () => {
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe("ratios and safe areas", () => {
  it("knows the three shapes the house formats ask for", () => {
    expect(Object.keys(RATIOS).sort()).toEqual(["16:9", "1:1", "9:16"]);
  });

  it("uses a vertical canvas for 9:16", () => {
    expect(RATIOS["9:16"].height).toBeGreaterThan(RATIOS["9:16"].width);
  });

  it("keeps the safe area clear of the platform's own overlays", () => {
    const safe = safeArea("9:16");
    const { width, height } = RATIOS["9:16"];
    expect(safe.left).toBeGreaterThan(0);
    expect(safe.bottom).toBeGreaterThan(safe.top);
    expect(safe.right).toBeLessThan(width);
    expect(safe.bottom).toBeLessThan(height);
    // Vertical platforms put buttons down the right and captions at the bottom.
    expect(height - safe.bottom).toBeGreaterThan(safe.top);
  });
});

describe("frameCount", () => {
  it("matches the duration at the given rate", () => {
    expect(frameCount(10, 30)).toBe(300);
  });

  it("rounds up so the last moment is not cut off", () => {
    expect(frameCount(1.05, 30)).toBe(32);
  });
});
