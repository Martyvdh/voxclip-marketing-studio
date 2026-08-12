import { describe, expect, it } from "vitest";

import {
  MAX_CLIP_SECONDS,
  MIN_CLIP_SECONDS,
  addClip,
  clipAt,
  duplicateClip,
  emptyProject,
  moveClip,
  newClip,
  removeClip,
  setClipSeconds,
  splitClip,
  timelineOf,
  totalSeconds,
  updateClip,
  type Project,
} from "./project";

/** A project with exactly three known clips. emptyProject starts with one. */
function project(): Project {
  let p: Project = { ...emptyProject("9:16"), clips: [] };
  p = addClip(p, newClip({ id: "a", text: "First", seconds: 3 }));
  p = addClip(p, newClip({ id: "b", text: "Second", seconds: 4 }));
  p = addClip(p, newClip({ id: "c", text: "Third", seconds: 2 }));
  return p;
}

describe("a new project", () => {
  it("starts with one clip, so there is something to look at", () => {
    const p = emptyProject("9:16");
    expect(p.clips.length).toBe(1);
    expect(totalSeconds(p)).toBeGreaterThan(0);
  });

  it("remembers its shape", () => {
    expect(emptyProject("16:9").ratio).toBe("16:9");
  });
});

describe("clips", () => {
  it("adds to the end", () => {
    const p = addClip(project(), newClip({ id: "d", text: "Fourth" }));
    expect(p.clips.map((c) => c.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("duplicates right after the original, so the copy is where you expect", () => {
    const p = duplicateClip(project(), "a");
    expect(p.clips.length).toBe(4);
    expect(p.clips[1].text).toBe("First");
    expect(p.clips[1].id).not.toBe("a");
  });

  it("removes a clip", () => {
    expect(removeClip(project(), "b").clips.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("refuses to remove the last clip, because an empty video is not a video", () => {
    let p = emptyProject("1:1");
    p = removeClip(p, p.clips[0].id);
    expect(p.clips.length).toBe(1);
  });

  it("moves a clip and keeps the others in order", () => {
    expect(moveClip(project(), 2, 0).clips.map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(moveClip(project(), 0, 2).clips.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("ignores a move that goes nowhere or off the end", () => {
    expect(moveClip(project(), 1, 1).clips.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(moveClip(project(), 0, 9).clips.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("updates one clip and leaves the rest alone", () => {
    const p = updateClip(project(), "b", { text: "Changed", animation: "typeline" });
    expect(p.clips[1].text).toBe("Changed");
    expect(p.clips[1].animation).toBe("typeline");
    expect(p.clips[0].text).toBe("First");
  });
});

describe("duration", () => {
  it("adds up the clips", () => {
    expect(totalSeconds(project())).toBe(9);
  });

  it("keeps a clip inside what a platform will accept", () => {
    const short = setClipSeconds(project(), "a", 0.1);
    expect(short.clips[0].seconds).toBe(MIN_CLIP_SECONDS);

    const long = setClipSeconds(project(), "a", 999);
    expect(long.clips[0].seconds).toBe(MAX_CLIP_SECONDS);
  });

  it("rounds to a tenth, because a frame is not worth arguing about", () => {
    expect(setClipSeconds(project(), "a", 2.44).clips[0].seconds).toBe(2.4);
  });
});

describe("the timeline", () => {
  it("lays clips end to end with no gap", () => {
    const t = timelineOf(project());
    expect(t.map((c) => c.startMs)).toEqual([0, 3000, 7000]);
    expect(t[2].startMs + t[2].durationMs).toBe(9000);
  });

  it("finds the clip playing at a moment, with progress inside that clip", () => {
    const p = project();
    expect(clipAt(p, 0)?.id).toBe("a");
    expect(clipAt(p, 2999)?.id).toBe("a");
    expect(clipAt(p, 3000)?.id).toBe("b");
    expect(clipAt(p, 5000)?.progress).toBeCloseTo(0.5);
  });

  it("holds the last frame at the end instead of going blank", () => {
    const end = clipAt(project(), 9000);
    expect(end?.id).toBe("c");
    expect(end?.progress).toBe(1);
  });
});

describe("splitting", () => {
  it("cuts a clip in two at the playhead, keeping the total length", () => {
    const p = splitClip(project(), 1500);
    expect(p.clips.length).toBe(4);
    expect(p.clips[0].seconds).toBe(1.5);
    expect(p.clips[1].seconds).toBe(1.5);
    expect(totalSeconds(p)).toBe(9);
  });

  it("copies the styling into both halves", () => {
    const styled = updateClip(project(), "a", {
      animation: "wipe-up",
      align: "center",
    });
    const p = splitClip(styled, 1500);
    expect(p.clips[0].animation).toBe("wipe-up");
    expect(p.clips[1].animation).toBe("wipe-up");
    expect(p.clips[1].align).toBe("center");
  });

  it("refuses a cut too close to an edge to leave two usable clips", () => {
    expect(splitClip(project(), 50).clips.length).toBe(3);
    expect(splitClip(project(), 8990).clips.length).toBe(3);
  });
});
