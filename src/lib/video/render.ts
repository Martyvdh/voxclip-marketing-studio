/**
 * The canvas renderer.
 *
 * Brand rules live here, not in whoever fills the fields:
 *  - Ink or Paper carries the frame. Teal is one small element, never a wash.
 *  - Space Grotesk for display. Hierarchy from weight and size, never colour.
 *  - Text stays inside the safe area, which is asymmetric on vertical.
 *  - Nothing snaps. Entrances come from animations.ts.
 *  - No product interface is ever drawn. Real captures only, supplied as media.
 */

import { transformAt } from "./animations";
import { elementByKind, toneColours } from "./elements";
import {
  CANVAS_DARK,
  INK,
  MUTED_ON_DARK,
  MUTED_ON_LIGHT,
  PAPER,
  SIGNAL_TEAL,
} from "./render-colours";
import type { ClipAt } from "./project";
import { elementFloor, placeElementY } from "./layout";
import { breathe, crossfadeAlpha, kenBurns, progressWidth } from "./polish";
import { RATIOS, easeInOut, safeArea, type RatioKey } from "./timeline";

export * from "./render-colours";

/** Anything that can be painted as a clip background. */
export type MediaSource = CanvasImageSource & {
  readonly width?: number;
  readonly height?: number;
  readonly videoWidth?: number;
  readonly videoHeight?: number;
};

export interface RenderInput {
  clip: ClipAt | null;
  ratio: RatioKey;
  showMark: boolean;
  /** Resolved element for this clip's media, when there is one and it is ready. */
  media?: MediaSource | null;
  /**
   * Waar we in de hele video zitten. Alleen voor het streepje onderin.
   *
   * Optioneel, zodat een losse preview van een clip niets stuk maakt.
   */
  elapsedMs?: number;
  totalMs?: number;
}

const SIZE_SCALE: Record<string, number> = { s: 0.052, m: 0.068, l: 0.086 };

function mediaSize(media: MediaSource) {
  const w = (media.videoWidth || media.width || 0) as number;
  const h = (media.videoHeight || media.height || 0) as number;
  return { w, h };
}

function drawMedia(
  ctx: CanvasRenderingContext2D,
  media: MediaSource,
  fit: "cover" | "contain",
  width: number,
  height: number,
) {
  const { w, h } = mediaSize(media);
  if (!w || !h) return;

  const scale =
    fit === "cover"
      ? Math.max(width / w, height / h)
      : Math.min(width / w, height / h);

  const dw = w * scale;
  const dh = h * scale;
  ctx.drawImage(media, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  startSize: number,
): { lines: string[]; size: number } {
  let size = startSize;

  for (; size > 20; size -= 3) {
    ctx.font = `${weight} ${size}px "Space Grotesk", system-ui, sans-serif`;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) current = candidate;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    if (!lines.some((l) => ctx.measureText(l).width > maxWidth) && lines.length <= 6) {
      return { lines, size };
    }
  }

  ctx.font = `${weight} ${size}px "Space Grotesk", system-ui, sans-serif`;
  return { lines: [text], size };
}

/**
 * The chip. Same geometry as public/voxclip-mark.svg, drawn on a 256 grid.
 * On a dark or media frame the tile flips to Paper. The teal bar never changes.
 */
function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  onDark: boolean,
) {
  const s = size / 256;
  const tile = onDark ? PAPER : INK;
  const bar = onDark ? INK : PAPER;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = tile;
  ctx.beginPath();
  ctx.moveTo(56, 0);
  ctx.lineTo(184, 0);
  ctx.lineTo(256, 72);
  ctx.lineTo(256, 200);
  ctx.arcTo(256, 256, 200, 256, 56);
  ctx.lineTo(56, 256);
  ctx.arcTo(0, 256, 0, 200, 56);
  ctx.lineTo(0, 56);
  ctx.arcTo(0, 0, 56, 0, 56);
  ctx.closePath();
  ctx.fill();

  const bars: [number, number, number, string][] = [
    [71, 108, 66, bar],
    [115, 88, 106, SIGNAL_TEAL],
    [159, 108, 66, bar],
  ];
  for (const [bx, by, h, colour] of bars) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(bx, by, 26, h, 13);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws one line with its reveal applied as a left-to-right clip. */
function drawRevealed(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  reveal: number,
  align: CanvasTextAlign,
  maxWidth: number,
) {
  if (reveal >= 0.999) {
    ctx.fillText(line, x, y);
    return;
  }

  const width = ctx.measureText(line).width;
  const left = align === "center" ? x - width / 2 : x;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, y - maxWidth, width * reveal, maxWidth * 3);
  ctx.clip();
  ctx.fillText(line, x, y);
  ctx.restore();
}

export function renderFrame(ctx: CanvasRenderingContext2D, input: RenderInput): void {
  const { width, height } = RATIOS[input.ratio];
  const safe = safeArea(input.ratio);
  const clip = input.clip;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  const hasMedia = Boolean(input.media && clip?.media);
  const theme = clip?.theme ?? "paper";
  const onDark = theme === "ink" || hasMedia;

  ctx.fillStyle = theme === "ink" ? CANVAS_DARK : PAPER;
  ctx.fillRect(0, 0, width, height);

  if (hasMedia && input.media && clip?.media) {
    // Langzame inzoom op het beeld. Een stilstaande opname onder bewegende
    // tekst leest als een screenshot met tekst erop.
    const burns = kenBurns(clip.progress);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(burns.scale, burns.scale);
    ctx.translate(
      -width / 2 + burns.offsetX * width,
      -height / 2 + burns.offsetY * height,
    );
    drawMedia(ctx, input.media, clip.media.fit, width, height);
    ctx.restore();

    if (clip.media.dim > 0) {
      ctx.fillStyle = `rgba(20, 24, 31, ${Math.min(0.85, clip.media.dim)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Zachte wissel. Onder de tweehonderd milliseconden ziet een harde snede er
  // goedkoop uit; erboven kijk je naar de overgang in plaats van erdoorheen.
  const sinceStart = clip ? clip.progress * clip.durationMs : Infinity;
  const entering = crossfadeAlpha(sinceStart);
  if (entering < 1) {
    ctx.globalAlpha = entering;
  }

  if (!clip) {
    ctx.restore();
    return;
  }

  const blocks = [
    { text: clip.text, weight: 700, scale: 1 },
    { text: clip.secondary, weight: 500, scale: 0.66 },
  ].filter((b) => b.text.trim().length > 0);

  if (blocks.length === 0) {
    if (input.showMark) {
      drawMark(ctx, safe.left, safe.top - height * 0.06, height * 0.035, onDark);
    }
    drawProgress(ctx, input, width, height, onDark);
    ctx.restore();
    return;
  }

  // Nauwelijks zichtbare beweging op een verder stilstaand tekstbeeld. Een
  // volkomen stil frame leest op een telefoon als een screenshot, en daar
  // scrollen mensen langs.
  if (!hasMedia) {
    const grow = breathe(clip.progress);
    ctx.translate(width / 2, height / 2);
    ctx.scale(grow, grow);
    ctx.translate(-width / 2, -height / 2);
  }

  const maxWidth = safe.right - safe.left;
  const base = height * (SIZE_SCALE[clip.size] ?? SIZE_SCALE.m);

  const measured = blocks.map((b) => {
    ctx.save();
    const fitted = fitLines(ctx, b.text, maxWidth, b.weight, Math.round(base * b.scale));
    ctx.restore();
    return { ...b, ...fitted };
  });

  const lineGap = 1.16;
  const blockGap = height * 0.028;
  const totalLines = measured.reduce((n, m) => n + m.lines.length, 0);
  const totalHeight =
    measured.reduce((sum, m) => sum + m.lines.length * m.size * lineGap, 0) +
    blockGap * Math.max(0, measured.length - 1);

  const centred = clip.align === "center";
  const x = centred ? (safe.left + safe.right) / 2 : safe.left;
  let y = safe.top + (safe.bottom - safe.top - totalHeight) / 2;

  ctx.textAlign = centred ? "center" : "left";
  ctx.textBaseline = "top";

  let lineIndex = 0;
  measured.forEach((block, blockIndex) => {
    const primary = blockIndex === 0;
    ctx.font = `${block.weight} ${block.size}px "Space Grotesk", system-ui, sans-serif`;

    for (const line of block.lines) {
      const t = transformAt(clip.animation, clip.progress, lineIndex, totalLines);

      ctx.save();
      ctx.globalAlpha = t.opacity;
      ctx.fillStyle = primary
        ? onDark
          ? PAPER
          : INK
        : onDark
          ? MUTED_ON_DARK
          : MUTED_ON_LIGHT;

      ctx.translate(x + t.dx, y + t.dy);
      if (t.scale !== 1) {
        ctx.scale(t.scale, t.scale);
      }
      drawRevealed(ctx, line, 0, 0, t.reveal, ctx.textAlign, block.size * 1.4);
      ctx.restore();

      y += block.size * lineGap;
      lineIndex += 1;
    }
    y += blockGap;
  });

  ctx.globalAlpha = 1;

  // The one teal element: a short rule that draws itself in under the text.
  const ruleWidth = maxWidth * 0.2 * easeInOut(Math.min(1, clip.progress / 0.5));
  ctx.fillStyle = SIGNAL_TEAL;
  ctx.fillRect(
    centred ? x - ruleWidth / 2 : x,
    y + height * 0.004,
    ruleWidth,
    Math.max(4, height * 0.005),
  );

  drawElements(ctx, clip, width, height, onDark, y);

  if (input.showMark) {
    drawMark(ctx, safe.left, safe.top - height * 0.06, height * 0.035, onDark);
  }

  ctx.restore();

  // Buiten de restore, want het streepje mag niet meeademen of meefaden.
  ctx.save();
  drawProgress(ctx, input, width, height, onDark);
  ctx.restore();
}

/**
 * Elements sit on top of the text and take their own entrance from their delay.
 * Each draws inside a 100 by 100 box, so one element looks the same on a
 * vertical video as on a wide one.
 */
function drawElements(
  ctx: CanvasRenderingContext2D,
  clip: ClipAt,
  width: number,
  height: number,
  onDark: boolean,
  /** Onderkant van de tekst in pixels. Elementen blijven daaronder. */
  textBottom = 0,
) {
  const floor = elementFloor(textBottom, height);

  for (const element of clip.elements ?? []) {
    const def = elementByKind(element.kind);
    if (!def) continue;

    const span = Math.max(0.05, 1 - element.delay);
    const t = Math.min(1, Math.max(0, (clip.progress - element.delay) / span));
    if (t <= 0) continue;

    const box = height * 0.18 * element.scale;
    const { colour, contrast } = toneColours(element.tone, onDark);

    ctx.save();
    const y = placeElementY(element.y, floor);
    ctx.translate(element.x * width - box / 2, y * height - box / 2);
    ctx.scale(box / 100, box / 100);
    def.draw({
      ctx,
      t,
      colour,
      contrast,
      text: element.text || def.defaultText || "",
    });
    ctx.restore();
  }
}

/**
 * Het streepje onderin dat zegt hoe ver de video is.
 *
 * Waarom het er hoort: op een verticaal kanaal beslist iemand in de eerste
 * seconde of hij blijft kijken. Zien dat het bijna klaar is, is een reden om
 * te blijven, en het kost twee pixels.
 */
function drawProgress(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  width: number,
  height: number,
  onDark: boolean,
): void {
  if (input.totalMs === undefined || input.elapsedMs === undefined) return;
  if (input.totalMs <= 0) return;

  const thickness = Math.max(2, Math.round(height * 0.004));
  const y = height - thickness;

  ctx.save();
  ctx.globalAlpha = onDark ? 0.22 : 0.14;
  ctx.fillStyle = onDark ? "#F7F7F5" : "#1C2230";
  ctx.fillRect(0, y, width, thickness);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#12B3A6";
  ctx.fillRect(0, y, progressWidth(input.elapsedMs, input.totalMs, width), thickness);
  ctx.restore();
}
