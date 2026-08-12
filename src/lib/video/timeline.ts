/**
 * Timing for the video renderer.
 *
 * The preview, the scrubber, and the export all read the timeline from here, so
 * what you scrub to is what gets recorded. Pure functions, no canvas, no clock.
 */

export type RatioKey = "9:16" | "1:1" | "16:9";

export const RATIOS: Record<RatioKey, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/**
 * Where text may go. Vertical platforms cover the bottom with captions and the
 * right edge with buttons, so the safe area is not a symmetric margin.
 */
export function safeArea(ratio: RatioKey) {
  const { width, height } = RATIOS[ratio];
  if (ratio === "9:16") {
    return {
      left: Math.round(width * 0.08),
      right: Math.round(width * 0.86),
      top: Math.round(height * 0.12),
      bottom: Math.round(height * 0.78),
    };
  }
  return {
    left: Math.round(width * 0.08),
    right: Math.round(width * 0.92),
    top: Math.round(height * 0.12),
    bottom: Math.round(height * 0.88),
  };
}

export interface Scene {
  id: string;
  /** Relative share of the duration. A scene with weight 2 lasts twice as long. */
  weight: number;
  lines: string[];
  /** Optional note shown in the editor, not drawn. */
  note?: string;
}

export interface TimedScene extends Scene {
  startMs: number;
  durationMs: number;
}

const MIN_SECONDS = 2;
const MAX_SECONDS = 180;

export function buildTimeline(scenes: Scene[], seconds: number): TimedScene[] {
  if (scenes.length === 0) {
    throw new Error("A video needs at least one scene.");
  }
  if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    throw new Error(
      `Duration has to be between ${MIN_SECONDS} and ${MAX_SECONDS} seconds.`,
    );
  }

  const totalMs = Math.round(seconds * 1000);
  const totalWeight = scenes.reduce((sum, s) => sum + Math.max(s.weight, 0.001), 0);

  const timed: TimedScene[] = [];
  let cursor = 0;

  scenes.forEach((scene, i) => {
    const isLast = i === scenes.length - 1;
    // The last scene absorbs the rounding, so the video ends exactly on time.
    const durationMs = isLast
      ? totalMs - cursor
      : Math.round((Math.max(scene.weight, 0.001) / totalWeight) * totalMs);

    timed.push({ ...scene, startMs: cursor, durationMs });
    cursor += durationMs;
  });

  return timed;
}

export interface SceneAt extends TimedScene {
  /** 0 to 1 inside this scene, not inside the whole video. */
  progress: number;
}

export function sceneAt(timeline: TimedScene[], ms: number): SceneAt | null {
  if (timeline.length === 0) return null;

  const clamped = Math.max(0, ms);
  const last = timeline[timeline.length - 1];
  const end = last.startMs + last.durationMs;

  // Hold on the final frame instead of going blank at the end.
  if (clamped >= end) return { ...last, progress: 1 };

  const scene =
    timeline.find((s) => clamped >= s.startMs && clamped < s.startMs + s.durationMs) ??
    timeline[0];

  return {
    ...scene,
    progress: scene.durationMs === 0 ? 1 : (clamped - scene.startMs) / scene.durationMs,
  };
}

/** Slow in, slow out. Nothing in this brand snaps. */
export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function frameCount(seconds: number, fps: number): number {
  return Math.ceil(seconds * fps);
}
