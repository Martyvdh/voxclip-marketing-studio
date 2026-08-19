/**
 * The edit.
 *
 * A project is an ordered list of clips, each with its own length. Every
 * operation returns a new project rather than mutating one, so undo is a
 * question of keeping the previous value and the editor never surprises anyone.
 *
 * Pure. The canvas, the timeline strip, and the export all read from here.
 */

import type { AnimationId } from "./animations";
import type { ElementTone } from "./elements";
import type { RatioKey } from "./timeline";

export const MIN_CLIP_SECONDS = 0.5;
export const MAX_CLIP_SECONDS = 30;

export type ClipAlign = "left" | "center";
export type ClipSize = "s" | "m" | "l";
/**
 * `app` tekent het VoxClip-venster als achtergrond en zet je tekst eronder als
 * bijschrift. Zie `app-frame.ts` voor waarom dat mag en waar de grens ligt.
 */
export type ClipTheme = "paper" | "ink" | "media" | "app";

export interface ClipMedia {
  kind: "video" | "image";
  /** An object URL for now. The asset library will replace this with a key. */
  url: string;
  name: string;
  fit: "cover" | "contain";
  /** 0 to 1. How far the media is dimmed so text stays readable. */
  dim: number;
}

/** A graphic dropped onto a clip. Position is relative, so it survives a
 *  change of shape: 0.5 is the middle whether the video is vertical or wide. */
export interface ClipElement {
  id: string;
  kind: string;
  /** 0 to 1 across the canvas. */
  x: number;
  y: number;
  /** 0.4 to 3. */
  scale: number;
  tone: ElementTone;
  text: string;
  /** 0 to 0.9. How far into the clip it appears. */
  delay: number;
}

export interface Clip {
  id: string;
  text: string;
  secondary: string;
  animation: AnimationId;
  seconds: number;
  align: ClipAlign;
  size: ClipSize;
  theme: ClipTheme;
  media?: ClipMedia;
  elements: ClipElement[];
  /** Shown in the editor, never drawn. Used for shot notes. */
  note?: string;

  /** Alleen bij theme "app": wat er in het venster gebeurt. */
  app?: {
    /** Wat er in het zoekveld staat. */
    query?: string;
    /** 0 All, 1 Copied, 2 Spoke. */
    filter?: number;
    /** Welke rij oplicht, of -1. */
    highlight?: number;
    /** Laat de Quick-picker eroverheen komen. */
    picker?: boolean;
    /** Welke rij in de picker gekozen is. */
    chosen?: number;
  };
}

export interface Project {
  ratio: RatioKey;
  showMark: boolean;
  clips: Clip[];
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `clip-${Date.now().toString(36)}-${counter}`;
}

export function newClip(over: Partial<Clip> = {}): Clip {
  return {
    id: over.id ?? nextId(),
    text: over.text ?? "",
    secondary: over.secondary ?? "",
    animation: over.animation ?? "fade-rise",
    seconds: clampSeconds(over.seconds ?? 3),
    align: over.align ?? "left",
    size: over.size ?? "m",
    theme: over.theme ?? "paper",
    media: over.media,
    elements: over.elements ?? [],
    note: over.note,
  };
}

export function emptyProject(ratio: RatioKey): Project {
  return {
    ratio,
    showMark: true,
    clips: [newClip({ text: "Your first line" })],
  };
}

function clampSeconds(n: number): number {
  const rounded = Math.round(n * 10) / 10;
  return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, rounded));
}

export function addClip(p: Project, clip: Clip): Project {
  return { ...p, clips: [...p.clips, clip] };
}

export function duplicateClip(p: Project, id: string): Project {
  const index = p.clips.findIndex((c) => c.id === id);
  if (index === -1) return p;
  const copy = { ...p.clips[index], id: nextId() };
  const clips = [...p.clips];
  clips.splice(index + 1, 0, copy);
  return { ...p, clips };
}

/** The last clip is never removed. An empty video is not a video. */
export function removeClip(p: Project, id: string): Project {
  if (p.clips.length <= 1) return p;
  return { ...p, clips: p.clips.filter((c) => c.id !== id) };
}

export function moveClip(p: Project, from: number, to: number): Project {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= p.clips.length ||
    to >= p.clips.length
  ) {
    return p;
  }
  const clips = [...p.clips];
  const [moved] = clips.splice(from, 1);
  clips.splice(to, 0, moved);
  return { ...p, clips };
}

export function updateClip(p: Project, id: string, patch: Partial<Clip>): Project {
  return {
    ...p,
    clips: p.clips.map((c) =>
      c.id === id
        ? { ...c, ...patch, seconds: clampSeconds(patch.seconds ?? c.seconds) }
        : c,
    ),
  };
}

export function setClipSeconds(p: Project, id: string, seconds: number): Project {
  return updateClip(p, id, { seconds: clampSeconds(seconds) });
}

export function addElement(
  p: Project,
  clipId: string,
  element: Omit<ClipElement, "id">,
): Project {
  return {
    ...p,
    clips: p.clips.map((c) =>
      c.id === clipId
        ? { ...c, elements: [...c.elements, { ...element, id: nextId() }] }
        : c,
    ),
  };
}

export function updateElement(
  p: Project,
  clipId: string,
  elementId: string,
  patch: Partial<ClipElement>,
): Project {
  return {
    ...p,
    clips: p.clips.map((c) =>
      c.id === clipId
        ? {
            ...c,
            elements: c.elements.map((e) =>
              e.id === elementId
                ? {
                    ...e,
                    ...patch,
                    x: clamp01(patch.x ?? e.x),
                    y: clamp01(patch.y ?? e.y),
                    delay: Math.min(0.9, clamp01(patch.delay ?? e.delay)),
                    scale: Math.min(3, Math.max(0.4, patch.scale ?? e.scale)),
                  }
                : e,
            ),
          }
        : c,
    ),
  };
}

export function removeElement(p: Project, clipId: string, elementId: string): Project {
  return {
    ...p,
    clips: p.clips.map((c) =>
      c.id === clipId
        ? { ...c, elements: c.elements.filter((e) => e.id !== elementId) }
        : c,
    ),
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function totalSeconds(p: Project): number {
  return Math.round(p.clips.reduce((sum, c) => sum + c.seconds, 0) * 10) / 10;
}

export interface TimedClip extends Clip {
  startMs: number;
  durationMs: number;
  index: number;
}

export function timelineOf(p: Project): TimedClip[] {
  let cursor = 0;
  return p.clips.map((clip, index) => {
    const durationMs = Math.round(clip.seconds * 1000);
    const timed: TimedClip = { ...clip, startMs: cursor, durationMs, index };
    cursor += durationMs;
    return timed;
  });
}

export interface ClipAt extends TimedClip {
  /** 0 to 1 inside this clip. */
  progress: number;
}

export function clipAt(p: Project, ms: number): ClipAt | null {
  const timeline = timelineOf(p);
  if (timeline.length === 0) return null;

  const clamped = Math.max(0, ms);
  const last = timeline[timeline.length - 1];
  const end = last.startMs + last.durationMs;
  if (clamped >= end) return { ...last, progress: 1 };

  const clip =
    timeline.find(
      (c) => clamped >= c.startMs && clamped < c.startMs + c.durationMs,
    ) ?? timeline[0];

  return {
    ...clip,
    progress: clip.durationMs === 0 ? 1 : (clamped - clip.startMs) / clip.durationMs,
  };
}

/**
 * Cuts the clip under the playhead in two. Both halves keep the styling, which
 * is what makes a split useful: change one half without rebuilding the other.
 */
export function splitClip(p: Project, ms: number): Project {
  const at = clipAt(p, ms);
  if (!at) return p;

  const offsetMs = ms - at.startMs;
  const firstSeconds = Math.round((offsetMs / 1000) * 10) / 10;
  const secondSeconds = Math.round((at.seconds - firstSeconds) * 10) / 10;

  if (firstSeconds < MIN_CLIP_SECONDS || secondSeconds < MIN_CLIP_SECONDS) {
    return p;
  }

  const clips = [...p.clips];
  clips.splice(
    at.index,
    1,
    { ...at, id: at.id, seconds: firstSeconds },
    { ...at, id: nextId(), seconds: secondSeconds },
  );

  // TimedClip carries fields the Clip type does not need. Strip them back off.
  return {
    ...p,
    clips: clips.map(({ ...clip }) => ({
      id: clip.id,
      text: clip.text,
      secondary: clip.secondary,
      animation: clip.animation,
      seconds: clip.seconds,
      align: clip.align,
      size: clip.size,
      theme: clip.theme,
      media: clip.media,
      elements: clip.elements,
      note: clip.note,
    })),
  };
}
