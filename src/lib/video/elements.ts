/**
 * Elements you can drop into a clip.
 *
 * Fifty pieces, each drawn on a 100 by 100 grid and scaled, so a badge looks the
 * same on a vertical video as on a wide one. Every one is a pure draw call: same
 * inputs, same pixels, in the preview and in the export.
 *
 * Two rules hold across the whole set:
 *  - Teal is available as a tone, but it is one element per frame. The editor
 *    warns when a second teal element is added, and the renderer does not stop
 *    you, because sometimes you mean it.
 *  - Nothing here reproduces the VoxClip interface. A chip that says "Copied" is
 *    a label. A drawn Timeline window would be a picture of an app that does not
 *    exist, and that is what real footage is for.
 */

import { INK, PAPER, SIGNAL_TEAL } from "./render-colours";

export type ElementTone = "ink" | "paper" | "teal";

export interface ElementDrawContext {
  ctx: CanvasRenderingContext2D;
  /** 0 to 1, this element's own entrance progress. */
  t: number;
  /** The drawing colour for the chosen tone. */
  colour: string;
  /** The contrasting colour, for text on a filled shape. */
  contrast: string;
  text: string;
}

export interface ElementDef {
  kind: string;
  name: string;
  group:
    | "Badges"
    | "Keys"
    | "Callouts"
    | "Shapes"
    | "Progress"
    | "Frames"
    | "Brand"
    | "Marks";
  hasText: boolean;
  defaultText?: string;
  /** Draws inside a 100 by 100 box with the origin at its top left. */
  draw: (d: ElementDrawContext) => void;
}

const rr = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** Sets a display font sized to fit `text` inside `width`. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  start: number,
  weight = 700,
) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px "Space Grotesk", system-ui, sans-serif`;
    if (ctx.measureText(text).width <= width) break;
    size -= 2;
  } while (size > 8);
  return size;
}

function pill(d: ElementDrawContext, filled: boolean) {
  const { ctx, colour, contrast, text, t } = d;
  ctx.globalAlpha *= t;
  const size = fitFont(ctx, text, 76, 26);
  const w = Math.min(96, ctx.measureText(text).width + 28);

  if (filled) {
    ctx.fillStyle = colour;
    rr(ctx, 50 - w / 2, 34, w, 32, 16);
    ctx.fill();
    ctx.fillStyle = contrast;
  } else {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    rr(ctx, 50 - w / 2, 34, w, 32, 16);
    ctx.stroke();
    ctx.fillStyle = colour;
  }

  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 50, 51);
}

function keycap(d: ElementDrawContext, w: number) {
  const { ctx, colour, contrast, text, t } = d;
  ctx.globalAlpha *= t;
  const x = 50 - w / 2;

  ctx.fillStyle = colour;
  rr(ctx, x, 32, w, 36, 8);
  ctx.fill();

  ctx.fillStyle = contrast;
  const size = fitFont(ctx, text, w - 12, 22);
  ctx.font = `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 50, 51);
}

function bars(d: ElementDrawContext, heights: number[], tealIndex: number) {
  const { ctx, colour, t } = d;
  const w = 10;
  const gap = 8;
  const total = heights.length * w + (heights.length - 1) * gap;
  let x = 50 - total / 2;

  heights.forEach((h, i) => {
    const grown = h * (0.35 + 0.65 * t);
    ctx.fillStyle = i === tealIndex ? SIGNAL_TEAL : colour;
    rr(ctx, x, 50 - grown / 2, w, grown, 5);
    ctx.fill();
    x += w + gap;
  });
}

function arrow(d: ElementDrawContext, angle: number) {
  const { ctx, colour, t } = d;
  ctx.save();
  ctx.translate(50, 50);
  ctx.rotate(angle);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const len = 70 * t;
  ctx.beginPath();
  ctx.moveTo(-35, 0);
  ctx.lineTo(-35 + len, 0);
  ctx.stroke();
  if (t > 0.6) {
    ctx.beginPath();
    ctx.moveTo(-35 + len - 14, -11);
    ctx.lineTo(-35 + len, 0);
    ctx.lineTo(-35 + len - 14, 11);
    ctx.stroke();
  }
  ctx.restore();
}

function tick(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(26, 52);
  const p = Math.min(1, t * 1.4);
  ctx.lineTo(26 + 18 * Math.min(1, p * 2), 52 + 16 * Math.min(1, p * 2));
  if (p > 0.5) ctx.lineTo(44 + 30 * (p - 0.5) * 2, 68 - 36 * (p - 0.5) * 2);
  ctx.stroke();
}

function counter(d: ElementDrawContext, to: number, suffix: string) {
  const { ctx, colour, t } = d;
  const value = Math.round(to * t);
  ctx.fillStyle = colour;
  const label = `${value}${suffix}`;
  const size = fitFont(ctx, label, 92, 46);
  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 50, 50);
}

function stepNumber(d: ElementDrawContext, n: number) {
  const { ctx, colour, contrast, t } = d;
  ctx.globalAlpha *= t;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(50, 50, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = contrast;
  ctx.font = `700 28px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), 50, 51);
}

function rule(d: ElementDrawContext, thickness: number, width: number) {
  const { ctx, colour, t } = d;
  ctx.fillStyle = colour;
  const w = width * t;
  ctx.fillRect(50 - w / 2, 50 - thickness / 2, w, thickness);
}

function bracket(d: ElementDrawContext, flip: boolean) {
  const { ctx, colour, t } = d;
  ctx.save();
  if (flip) {
    ctx.translate(100, 0);
    ctx.scale(-1, 1);
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const h = 60 * t;
  ctx.beginPath();
  ctx.moveTo(40, 50 - h / 2);
  ctx.lineTo(24, 50 - h / 2);
  ctx.lineTo(24, 50 + h / 2);
  ctx.lineTo(40, 50 + h / 2);
  ctx.stroke();
  ctx.restore();
}

function ring(d: ElementDrawContext, fraction: number) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.globalAlpha *= 0.25;
  ctx.beginPath();
  ctx.arc(50, 50, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha /= 0.25;
  ctx.beginPath();
  ctx.arc(50, 50, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction * t);
  ctx.stroke();
}

function dots(d: ElementDrawContext, count: number, active: number) {
  const { ctx, colour, t } = d;
  const gap = 20;
  let x = 50 - ((count - 1) * gap) / 2;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = i === active ? t : t * 0.35;
    ctx.fillStyle = i === active ? SIGNAL_TEAL : colour;
    ctx.beginPath();
    ctx.arc(x, 50, i === active ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    x += gap;
  }
  ctx.globalAlpha = 1;
}

function frame(d: ElementDrawContext, w: number, h: number, r: number, notch: boolean) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.globalAlpha *= t;
  if (notch) {
    ctx.beginPath();
    ctx.moveTo(50 - w / 2 + r, 50 - h / 2);
    ctx.lineTo(50 + w / 2 - 14, 50 - h / 2);
    ctx.lineTo(50 + w / 2, 50 - h / 2 + 14);
    ctx.lineTo(50 + w / 2, 50 + h / 2 - r);
    ctx.arcTo(50 + w / 2, 50 + h / 2, 50 + w / 2 - r, 50 + h / 2, r);
    ctx.lineTo(50 - w / 2 + r, 50 + h / 2);
    ctx.arcTo(50 - w / 2, 50 + h / 2, 50 - w / 2, 50 + h / 2 - r, r);
    ctx.lineTo(50 - w / 2, 50 - h / 2 + r);
    ctx.arcTo(50 - w / 2, 50 - h / 2, 50 - w / 2 + r, 50 - h / 2, r);
    ctx.closePath();
  } else {
    rr(ctx, 50 - w / 2, 50 - h / 2, w, h, r);
  }
  ctx.stroke();
}

function label(d: ElementDrawContext, align: "left" | "center") {
  const { ctx, colour, text, t } = d;
  ctx.globalAlpha *= t;
  ctx.fillStyle = colour;
  const size = fitFont(ctx, text, 96, 22, 500);
  ctx.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, align === "center" ? 50 : 4, 50);
}

function marker(d: ElementDrawContext) {
  const { ctx, colour, text, t } = d;
  const size = fitFont(ctx, text, 88, 24);
  const w = ctx.measureText(text).width + 12;
  ctx.globalAlpha *= 0.9;
  ctx.fillStyle = colour;
  ctx.fillRect(50 - w / 2, 40, w * t, 24);
  ctx.globalAlpha /= 0.9;
  ctx.fillStyle = d.contrast;
  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (t > 0.6) ctx.fillText(text, 50, 52);
}

function quoteMark(d: ElementDrawContext, closing: boolean) {
  const { ctx, colour, t } = d;
  ctx.globalAlpha *= t;
  ctx.fillStyle = colour;
  ctx.font = `700 84px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(closing ? "”" : "“", 50, 50);
}

function cursor(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(38, 28);
  ctx.lineTo(38, 68);
  ctx.lineTo(48, 58);
  ctx.lineTo(56, 74);
  ctx.lineTo(62, 71);
  ctx.lineTo(54, 56);
  ctx.lineTo(66, 54);
  ctx.closePath();
  ctx.globalAlpha *= t;
  ctx.fill();
}

function caret(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  // Blinks twice a second, which reads as a text cursor rather than a glitch.
  ctx.globalAlpha *= Math.sin(t * Math.PI * 6) > 0 ? 1 : 0.15;
  ctx.fillStyle = colour;
  ctx.fillRect(48, 28, 5, 44);
}

function stripe(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.save();
  ctx.globalAlpha *= 0.25 * t;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  for (let i = -20; i < 120; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 100);
    ctx.lineTo(i + 40, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function grid(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.globalAlpha *= 0.3 * t;
  ctx.fillStyle = colour;
  for (let x = 10; x <= 90; x += 16) {
    for (let y = 10; y <= 90; y += 16) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function corners(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const len = 22 * t;
  const pts: [number, number, number, number][] = [
    [14, 14, 1, 1],
    [86, 14, -1, 1],
    [14, 86, 1, -1],
    [86, 86, -1, -1],
  ];
  for (const [x, y, dx, dy] of pts) {
    ctx.beginPath();
    ctx.moveTo(x + dx * len, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * len);
    ctx.stroke();
  }
}

function chipRow(d: ElementDrawContext, labels: string[], active: number) {
  const { ctx, colour, contrast, t } = d;
  ctx.globalAlpha *= t;
  ctx.font = `600 15px "Space Grotesk", system-ui, sans-serif`;
  const widths = labels.map((l) => ctx.measureText(l).width + 18);
  const total = widths.reduce((a, b) => a + b, 0) + (labels.length - 1) * 6;
  let x = 50 - total / 2;

  labels.forEach((l, i) => {
    const on = i === active;
    ctx.fillStyle = on ? SIGNAL_TEAL : colour;
    ctx.globalAlpha *= on ? 1 : 0.25;
    rr(ctx, x, 40, widths[i], 22, 11);
    ctx.fill();
    ctx.globalAlpha /= on ? 1 : 0.25;
    ctx.fillStyle = on ? contrast : colour;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l, x + widths[i] / 2, 51);
    x += widths[i] + 6;
  });
}

function chipMark(d: ElementDrawContext) {
  const { ctx, t } = d;
  ctx.save();
  ctx.globalAlpha *= t;
  ctx.translate(18, 18);
  ctx.scale(64 / 256, 64 / 256);
  ctx.fillStyle = INK;
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
  const set: [number, number, number, string][] = [
    [71, 108, 66, PAPER],
    [115, 88, 106, SIGNAL_TEAL],
    [159, 108, 66, PAPER],
  ];
  for (const [bx, by, h, c] of set) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(bx, by, 26, h, 13);
    ctx.fill();
  }
  ctx.restore();
}

function wordmark(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.globalAlpha *= t;
  ctx.fillStyle = colour;
  ctx.font = `600 26px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VoxClip", 50, 50);
}

function lowerThird(d: ElementDrawContext) {
  const { ctx, colour, contrast, text, t } = d;
  ctx.fillStyle = colour;
  rr(ctx, 4, 38, 92 * t, 26, 6);
  ctx.fill();
  if (t > 0.5) {
    ctx.fillStyle = contrast;
    const size = fitFont(ctx, text, 82, 16, 600);
    ctx.font = `600 ${size}px "Space Grotesk", system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 12, 51);
  }
}

function captionBox(d: ElementDrawContext) {
  const { ctx, colour, contrast, text, t } = d;
  ctx.globalAlpha *= t;
  const size = fitFont(ctx, text, 84, 17, 600);
  const w = Math.min(96, ctx.measureText(text).width + 16);
  ctx.fillStyle = colour;
  rr(ctx, 50 - w / 2, 40, w, 22, 4);
  ctx.fill();
  ctx.fillStyle = contrast;
  ctx.font = `600 ${size}px "Space Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 50, 51);
}

function circleHighlight(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(50, 50, 40, 26, -0.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
  ctx.stroke();
}

function boxHighlight(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 6]);
  rr(ctx, 12, 28, 76 * t, 44, 6);
  ctx.stroke();
  ctx.setLineDash([]);
}

function crossMark(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  const p = t;
  ctx.beginPath();
  ctx.moveTo(32, 32);
  ctx.lineTo(32 + 36 * p, 32 + 36 * p);
  ctx.moveTo(68, 32);
  ctx.lineTo(68 - 36 * p, 32 + 36 * p);
  ctx.stroke();
}

function plusMark(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.fillStyle = colour;
  const len = 40 * t;
  ctx.fillRect(50 - len / 2, 46, len, 8);
  ctx.fillRect(46, 50 - len / 2, 8, len);
}

function underline(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(12, 58);
  ctx.bezierCurveTo(34, 66, 62, 48, 12 + 76 * t, 60);
  ctx.stroke();
}

function progressBar(d: ElementDrawContext) {
  const { ctx, colour, t } = d;
  ctx.globalAlpha *= 0.25;
  ctx.fillStyle = colour;
  rr(ctx, 8, 46, 84, 8, 4);
  ctx.fill();
  ctx.globalAlpha /= 0.25;
  ctx.fillStyle = SIGNAL_TEAL;
  rr(ctx, 8, 46, 84 * t, 8, 4);
  ctx.fill();
}

function ticker(d: ElementDrawContext) {
  const { ctx, colour, text, t } = d;
  ctx.save();
  ctx.beginPath();
  ctx.rect(4, 38, 92, 26);
  ctx.clip();
  ctx.fillStyle = colour;
  ctx.font = `600 16px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const shift = (t * 120) % 120;
  ctx.fillText(text, 100 - shift, 51);
  ctx.fillText(text, 220 - shift, 51);
  ctx.restore();
}

/** Every element, in the order they appear in the palette. */
export const ELEMENTS: ElementDef[] = [
  // Badges
  { kind: "pill-filled", name: "Filled pill", group: "Badges", hasText: true, defaultText: "Free", draw: (d) => pill(d, true) },
  { kind: "pill-outline", name: "Outline pill", group: "Badges", hasText: true, defaultText: "New", draw: (d) => pill(d, false) },
  { kind: "badge-plus", name: "Plus badge", group: "Badges", hasText: false, draw: (d) => pill({ ...d, text: "Plus" }, true) },
  { kind: "badge-free", name: "Free badge", group: "Badges", hasText: false, draw: (d) => pill({ ...d, text: "Free" }, false) },
  { kind: "badge-mac", name: "Mac badge", group: "Badges", hasText: false, draw: (d) => pill({ ...d, text: "macOS 12+" }, false) },
  { kind: "badge-win", name: "Windows badge", group: "Badges", hasText: false, draw: (d) => pill({ ...d, text: "Windows 10+" }, false) },
  { kind: "marker", name: "Highlight marker", group: "Badges", hasText: true, defaultText: "one place", draw: marker },
  { kind: "caption", name: "Caption box", group: "Badges", hasText: true, defaultText: "Copied", draw: captionBox },

  // Keys
  { kind: "key-1", name: "Key cap", group: "Keys", hasText: true, defaultText: "V", draw: (d) => keycap(d, 40) },
  { kind: "key-wide", name: "Wide key", group: "Keys", hasText: true, defaultText: "Space", draw: (d) => keycap(d, 84) },
  { kind: "key-shift", name: "Shift key", group: "Keys", hasText: false, draw: (d) => keycap({ ...d, text: "⇧" }, 40) },
  { kind: "key-cmd", name: "Command key", group: "Keys", hasText: false, draw: (d) => keycap({ ...d, text: "⌘" }, 40) },
  { kind: "key-ctrl", name: "Control key", group: "Keys", hasText: false, draw: (d) => keycap({ ...d, text: "Ctrl" }, 52) },

  // Callouts
  { kind: "arrow-right", name: "Arrow right", group: "Callouts", hasText: false, draw: (d) => arrow(d, 0) },
  { kind: "arrow-left", name: "Arrow left", group: "Callouts", hasText: false, draw: (d) => arrow(d, Math.PI) },
  { kind: "arrow-down", name: "Arrow down", group: "Callouts", hasText: false, draw: (d) => arrow(d, Math.PI / 2) },
  { kind: "arrow-up", name: "Arrow up", group: "Callouts", hasText: false, draw: (d) => arrow(d, -Math.PI / 2) },
  { kind: "circle-highlight", name: "Circle it", group: "Callouts", hasText: false, draw: circleHighlight },
  { kind: "box-highlight", name: "Box it", group: "Callouts", hasText: false, draw: boxHighlight },
  { kind: "cursor", name: "Pointer", group: "Callouts", hasText: false, draw: cursor },
  { kind: "caret", name: "Text caret", group: "Callouts", hasText: false, draw: caret },

  // Shapes
  { kind: "rule-thin", name: "Thin rule", group: "Shapes", hasText: false, draw: (d) => rule(d, 4, 76) },
  { kind: "rule-thick", name: "Thick rule", group: "Shapes", hasText: false, draw: (d) => rule(d, 10, 60) },
  { kind: "underline", name: "Hand underline", group: "Shapes", hasText: false, draw: underline },
  { kind: "bracket-left", name: "Bracket left", group: "Shapes", hasText: false, draw: (d) => bracket(d, false) },
  { kind: "bracket-right", name: "Bracket right", group: "Shapes", hasText: false, draw: (d) => bracket(d, true) },
  { kind: "corners", name: "Corner marks", group: "Shapes", hasText: false, draw: corners },
  { kind: "stripe", name: "Diagonal stripes", group: "Shapes", hasText: false, draw: stripe },
  { kind: "dot-grid", name: "Dot grid", group: "Shapes", hasText: false, draw: grid },

  // Progress
  { kind: "progress", name: "Progress bar", group: "Progress", hasText: false, draw: progressBar },
  { kind: "ring-full", name: "Full ring", group: "Progress", hasText: false, draw: (d) => ring(d, 1) },
  { kind: "ring-half", name: "Half ring", group: "Progress", hasText: false, draw: (d) => ring(d, 0.5) },
  { kind: "dots-3", name: "Three dots", group: "Progress", hasText: false, draw: (d) => dots(d, 3, 1) },
  { kind: "dots-5", name: "Five dots", group: "Progress", hasText: false, draw: (d) => dots(d, 5, 2) },
  { kind: "ticker", name: "Ticker", group: "Progress", hasText: true, defaultText: "voxclip.it", draw: ticker },

  // Marks
  { kind: "tick", name: "Tick", group: "Marks", hasText: false, draw: tick },
  { kind: "cross", name: "Cross", group: "Marks", hasText: false, draw: crossMark },
  { kind: "plus", name: "Plus", group: "Marks", hasText: false, draw: plusMark },
  { kind: "step-1", name: "Step one", group: "Marks", hasText: false, draw: (d) => stepNumber(d, 1) },
  { kind: "step-2", name: "Step two", group: "Marks", hasText: false, draw: (d) => stepNumber(d, 2) },
  { kind: "step-3", name: "Step three", group: "Marks", hasText: false, draw: (d) => stepNumber(d, 3) },
  { kind: "quote-open", name: "Open quote", group: "Marks", hasText: false, draw: (d) => quoteMark(d, false) },
  { kind: "quote-close", name: "Close quote", group: "Marks", hasText: false, draw: (d) => quoteMark(d, true) },

  // Frames
  { kind: "frame-phone", name: "Phone outline", group: "Frames", hasText: false, draw: (d) => frame(d, 48, 88, 10, false) },
  { kind: "frame-window", name: "Window outline", group: "Frames", hasText: false, draw: (d) => frame(d, 92, 62, 8, false) },
  { kind: "frame-square", name: "Square outline", group: "Frames", hasText: false, draw: (d) => frame(d, 74, 74, 8, false) },
  { kind: "frame-chip", name: "Chip outline", group: "Frames", hasText: false, draw: (d) => frame(d, 74, 74, 14, true) },
  { kind: "lower-third", name: "Lower third", group: "Frames", hasText: true, defaultText: "Marty, VoxClip", draw: lowerThird },

  // Brand
  { kind: "waveform", name: "Waveform", group: "Brand", hasText: false, draw: (d) => bars(d, [26, 46, 68, 40, 22], 2) },
  { kind: "waveform-wide", name: "Wide waveform", group: "Brand", hasText: false, draw: (d) => bars(d, [20, 38, 58, 76, 54, 32, 18], 3) },
  { kind: "chips-copied", name: "Copied and Spoke chips", group: "Brand", hasText: false, draw: (d) => chipRow(d, ["All", "Copied", "Spoke"], 1) },
  { kind: "mark", name: "The chip", group: "Brand", hasText: false, draw: chipMark },
  { kind: "wordmark", name: "Wordmark", group: "Brand", hasText: false, draw: wordmark },
  { kind: "counter-2", name: "Counts to two", group: "Brand", hasText: false, draw: (d) => counter(d, 2, "") },
  { kind: "label-mono", name: "Mono label", group: "Brand", hasText: true, defaultText: "voxclip.it", draw: (d) => label(d, "center") },
];

export const ELEMENT_GROUPS = Array.from(new Set(ELEMENTS.map((e) => e.group)));

export function elementByKind(kind: string): ElementDef | undefined {
  return ELEMENTS.find((e) => e.kind === kind);
}

export function toneColours(tone: ElementTone, onDark: boolean) {
  if (tone === "teal") return { colour: SIGNAL_TEAL, contrast: onDark ? INK : PAPER };
  if (tone === "paper") return { colour: PAPER, contrast: INK };
  return { colour: INK, contrast: PAPER };
}
