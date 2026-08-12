/**
 * The canvas renderer.
 *
 * Brand rules are enforced here, not left to whoever fills the fields:
 *  - Ink or Paper carries the frame. Teal is one small element, never a wash.
 *  - Space Grotesk for display, sizes from a scale, hierarchy from weight.
 *  - Text stays inside the safe area, which is asymmetric on vertical.
 *  - Nothing snaps. Every entrance eases.
 *  - No product interface is ever drawn. Real captures only.
 */

import { RATIOS, easeInOut, safeArea, sceneAt, type RatioKey, type TimedScene } from "./timeline";

export const INK = "#1C2230";
export const PAPER = "#F7F7F5";
export const CANVAS_DARK = "#14181F";
export const SIGNAL_TEAL = "#12B3A6";
export const TEAL_DEEP = "#0B7A6E";
export const MUTED_ON_DARK = "#8D94A3";
export const MUTED_ON_LIGHT = "#5A6274";

export interface RenderOptions {
  ratio: RatioKey;
  theme: "light" | "dark";
  /** Drawn once, small, in the corner. The only teal on most frames. */
  showMark: boolean;
}

export interface RenderInput {
  timeline: TimedScene[];
  ms: number;
  options: RenderOptions;
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontWeight: number,
  startSize: number,
): { lines: string[]; size: number } {
  let size = startSize;

  for (; size > 24; size -= 4) {
    ctx.font = `${fontWeight} ${size}px "Space Grotesk", system-ui, sans-serif`;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);

    const tooWide = lines.some((l) => ctx.measureText(l).width > maxWidth);
    if (!tooWide && lines.length <= 5) return { lines, size };
  }

  ctx.font = `${fontWeight} ${size}px "Space Grotesk", system-ui, sans-serif`;
  return { lines: [text], size };
}

/**
 * The chip, small, in the corner.
 *
 * The same geometry as public/voxclip-mark.svg, drawn at 256 and scaled: a
 * filled Ink tile with a notched corner, three bars, the middle one teal and
 * tallest. On a dark canvas the tile flips to Paper and the outer bars to Ink,
 * so the mark stays legible. The teal bar never changes; it is the signal.
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

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  { timeline, ms, options }: RenderInput,
): void {
  const { width, height } = RATIOS[options.ratio];
  const safe = safeArea(options.ratio);
  const onDark = options.theme === "dark";

  ctx.save();
  ctx.fillStyle = onDark ? CANVAS_DARK : PAPER;
  ctx.fillRect(0, 0, width, height);

  const scene = sceneAt(timeline, ms);
  if (!scene) {
    ctx.restore();
    return;
  }

  const isCta = scene.id === "cta";
  const eased = easeInOut(Math.min(1, scene.progress / 0.28));
  const exiting = scene.progress > 0.9 ? (scene.progress - 0.9) / 0.1 : 0;
  const opacity = eased * (1 - exiting * 0.6);
  const rise = (1 - eased) * height * 0.02;

  const maxWidth = safe.right - safe.left;
  const blocks = scene.lines.filter(Boolean).map((text, i) => {
    const weight = i === 0 ? 700 : 500;
    const startSize = i === 0 ? Math.round(height * 0.072) : Math.round(height * 0.048);
    ctx.save();
    const fitted = fitLines(ctx, text, maxWidth, weight, startSize);
    ctx.restore();
    return { ...fitted, weight };
  });

  const lineGap = 1.18;
  const blockGap = height * 0.03;
  const totalHeight =
    blocks.reduce((sum, b) => sum + b.lines.length * b.size * lineGap, 0) +
    blockGap * Math.max(0, blocks.length - 1);

  let y = safe.top + (safe.bottom - safe.top - totalHeight) / 2 + rise;

  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  blocks.forEach((block, blockIndex) => {
    const primary = blockIndex === 0;
    ctx.fillStyle = primary
      ? onDark
        ? PAPER
        : INK
      : onDark
        ? MUTED_ON_DARK
        : MUTED_ON_LIGHT;

    ctx.font = `${block.weight} ${block.size}px "Space Grotesk", system-ui, sans-serif`;

    for (const l of block.lines) {
      ctx.fillText(l, safe.left, y);
      y += block.size * lineGap;
    }
    y += blockGap;
  });

  ctx.globalAlpha = 1;

  // The one teal element. On the call to action it is a rule under the words;
  // everywhere else it is the single bar in the mark.
  if (isCta) {
    const ruleWidth = maxWidth * 0.22 * easeInOut(scene.progress);
    ctx.fillStyle = SIGNAL_TEAL;
    ctx.fillRect(safe.left, y + height * 0.005, ruleWidth, Math.max(4, height * 0.005));
  }

  if (options.showMark) {
    drawMark(ctx, safe.left, safe.top - height * 0.06, height * 0.035, onDark);
  }

  ctx.restore();
}
