/**
 * Text animations.
 *
 * Ten, each doing something a person can name. The prototype had 150 looks and
 * no reason to pick one; a set this size is one you can hold in your head.
 *
 * Every animation is a pure function from progress to a transform. The preview
 * and the export both call it, so what you scrub to is what gets recorded.
 * Nothing reads the clock, nothing uses randomness.
 */

import { easeInOut } from "./timeline";

export type AnimationId =
  | "fade-rise"
  | "word-pop"
  | "typeline"
  | "wipe-up"
  | "spotlight"
  | "stack"
  | "zoom-in"
  | "slide-left"
  | "letter-fade"
  | "hold"
  // De harde zes. Zie de opmerking bij TRAVEL.
  | "fly-in"
  | "drop-in"
  | "punch"
  | "whip"
  | "rise-fast"
  | "split-in";

export interface Transform {
  /** 0 to 1. */
  opacity: number;
  /** Offset in canvas units, relative to the settled position. */
  dx: number;
  dy: number;
  /** 1 is settled. */
  scale: number;
  /** 0 to 1. How much of the line is shown, left to right. */
  reveal: number;
}

export interface Animation {
  id: AnimationId;
  name: string;
  description: string;
  /** Calm enough to sit under a call to action. */
  goodForCta: boolean;
  at(progress: number, index: number, total: number): Transform;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const settled: Transform = { opacity: 1, dx: 0, dy: 0, scale: 1, reveal: 1 };

/**
 * Later lines start later. `spread` is how much of the scene the whole stagger
 * takes, so a long line list still finishes entering well before the scene does.
 */
function staggered(progress: number, index: number, total: number, spread = 0.35) {
  const step = total > 1 ? spread / total : 0;
  const local = (progress - step * index) / Math.max(0.0001, 1 - step * (total - 1));
  return clamp01(local);
}

/** Most animations settle in the first third and then hold. */
const entrance = (t: number) => easeInOut(clamp01(t / 0.34));

/**
 * Hoe ver iets van buiten beeld komt.
 *
 * De tien eerste animaties bewegen tussen de 12 en 90 eenheden. Op een doek van
 * 1080 bij 1920 is dat één tot vijf procent — je ziet het niet, en dat is waarom
 * honderdvijftig video's aanvoelden als stilstaande beelden met een fade.
 *
 * Dit is een derde van de breedte. Dat is wél invliegen.
 */
const TRAVEL = 420;

/**
 * Schiet er voorbij en komt terug. De klassieke back-out.
 *
 * Zonder overshoot voelt snel bewegen als abrupt stoppen. Met overshoot voelt
 * het als iets met gewicht, en dat is het verschil tussen een schuif en een klap.
 */
function overshoot(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = clamp01(t) - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

/** Landt en stuitert één keer na. */
function bounceOut(t: number): number {
  const x = clamp01(t);
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x - 1.5 / d1) ** 2 + 0.75;
  if (x < 2.5 / d1) return n1 * (x - 2.25 / d1) ** 2 + 0.9375;
  return n1 * (x - 2.625 / d1) ** 2 + 0.984375;
}

/** Snel erin. De harde animaties zijn binnen een vijfde van de clip klaar,
 *  anders zit de beweging nog te lopen als je al aan het lezen bent. */
const fast = (t: number) => clamp01(t / 0.22);

export const ANIMATIONS: Animation[] = [
  {
    id: "fade-rise",
    name: "Fade and rise",
    description: "Comes up a little and settles. The default, and the calmest.",
    goodForCta: true,
    at: (p, i, n) => {
      const t = entrance(staggered(p, i, n, 0.2));
      return { opacity: t, dx: 0, dy: (1 - t) * 40, scale: 1, reveal: 1 };
    },
  },
  {
    id: "word-pop",
    name: "Line pop",
    description: "Each line arrives on its own, slightly large, then settles.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = entrance(staggered(p, i, n, 0.45));
      return { opacity: t, dx: 0, dy: 0, scale: 0.92 + t * 0.08, reveal: 1 };
    },
  },
  {
    id: "typeline",
    name: "Typed",
    description: "Reveals character by character, as if being written.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = clamp01(staggered(p, i, n, 0.3) / 0.7);
      return { opacity: 1, dx: 0, dy: 0, scale: 1, reveal: t };
    },
  },
  {
    id: "wipe-up",
    name: "Wipe",
    description: "Uncovers the line from the left. Good over a recording.",
    goodForCta: true,
    at: (p, i, n) => {
      const t = easeInOut(clamp01(staggered(p, i, n, 0.3) / 0.5));
      return { opacity: 1, dx: 0, dy: 0, scale: 1, reveal: t };
    },
  },
  {
    id: "spotlight",
    name: "Spotlight",
    description: "Fades up slowly and holds. Nothing moves.",
    goodForCta: true,
    at: (p) => {
      const t = easeInOut(clamp01(p / 0.5));
      return { opacity: t, dx: 0, dy: 0, scale: 1, reveal: 1 };
    },
  },
  {
    id: "stack",
    name: "Stack",
    description: "Lines lift into place from below, each further than the last.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = entrance(staggered(p, i, n, 0.4));
      return { opacity: t, dx: 0, dy: (1 - t) * 30 * (i + 1), scale: 1, reveal: 1 };
    },
  },
  {
    id: "zoom-in",
    name: "Zoom",
    description: "Starts slightly small and grows into place. Use sparingly.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = entrance(staggered(p, i, n, 0.2));
      return { opacity: t, dx: 0, dy: 0, scale: 0.86 + t * 0.14, reveal: 1 };
    },
  },
  {
    id: "slide-left",
    name: "Slide",
    description: "Comes in from the right and stops. Reads as a change of subject.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = entrance(staggered(p, i, n, 0.3));
      return { opacity: t, dx: (1 - t) * 90, dy: 0, scale: 1, reveal: 1 };
    },
  },
  {
    id: "letter-fade",
    name: "Letter fade",
    description: "The line appears as a whole while fading up. Quiet and quick.",
    goodForCta: true,
    at: (p, i, n) => {
      const t = easeInOut(clamp01(staggered(p, i, n, 0.25) / 0.4));
      return { opacity: t, dx: 0, dy: (1 - t) * 12, scale: 1, reveal: 1 };
    },
  },
  {
    id: "hold",
    name: "Hold",
    description: "No animation at all. There when the scene starts, still there at the end.",
    goodForCta: true,
    at: () => settled,
  },

  // --- De harde zes ---------------------------------------------------------
  // Deze bewegen over een derde van het beeld in plaats van over twee procent.
  // Ze zijn niet voor elke clip: op een regel die iemand moet lezen is dit te
  // veel, en onder een call to action helemaal.

  {
    id: "fly-in",
    name: "Fly in",
    description: "Comes in from the right at speed, overshoots, and settles. The loud one.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = overshoot(fast(staggered(p, i, n, 0.5)));
      return { opacity: clamp01(t * 2), dx: (1 - t) * TRAVEL, dy: 0, scale: 1, reveal: 1 };
    },
  },
  {
    id: "drop-in",
    name: "Drop in",
    description: "Falls from above and bounces once. Each line lands after the one before it.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = bounceOut(fast(staggered(p, i, n, 0.55)));
      return { opacity: clamp01(t * 3), dx: 0, dy: (1 - t) * -TRAVEL, scale: 1, reveal: 1 };
    },
  },
  {
    id: "punch",
    name: "Punch",
    description: "Arrives too big and snaps down to size. Use it on three words, not on a sentence.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = overshoot(fast(staggered(p, i, n, 0.4)));
      return { opacity: clamp01(t * 3), dx: 0, dy: 0, scale: 1.45 - t * 0.45, reveal: 1 };
    },
  },
  {
    id: "whip",
    name: "Whip",
    description: "Snaps across from the left and stops dead. No overshoot, no softening.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = easeInOut(clamp01(staggered(p, i, n, 0.3) / 0.16));
      return { opacity: clamp01(t * 4), dx: (1 - t) * -TRAVEL * 1.4, dy: 0, scale: 1, reveal: 1 };
    },
  },
  {
    id: "rise-fast",
    name: "Rise, fast",
    description: "Up from below the frame, quick, with a small overshoot. Fade-rise with its eyes open.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = overshoot(fast(staggered(p, i, n, 0.45)));
      return { opacity: clamp01(t * 2), dx: 0, dy: (1 - t) * TRAVEL * 0.8, scale: 1, reveal: 1 };
    },
  },
  {
    id: "split-in",
    name: "Split",
    description: "Lines come in from opposite sides and meet. Needs at least two lines to read.",
    goodForCta: false,
    at: (p, i, n) => {
      const t = overshoot(fast(staggered(p, i, n, 0.4)));
      const side = i % 2 === 0 ? 1 : -1;
      return { opacity: clamp01(t * 2), dx: (1 - t) * TRAVEL * side, dy: 0, scale: 1, reveal: 1 };
    },
  },
];

export const ANIMATION_IDS: AnimationId[] = ANIMATIONS.map((a) => a.id);

export function animationById(id: string): Animation {
  return ANIMATIONS.find((a) => a.id === id) ?? ANIMATIONS[0];
}

/** Always returns a transform inside its ranges, whatever it is handed. */
export function transformAt(
  id: string,
  progress: number,
  index: number,
  total: number,
): Transform {
  const raw = animationById(id).at(
    clamp01(progress),
    Math.max(0, index),
    Math.max(1, total),
  );

  return {
    opacity: clamp01(raw.opacity),
    dx: Number.isFinite(raw.dx) ? raw.dx : 0,
    dy: Number.isFinite(raw.dy) ? raw.dy : 0,
    scale: raw.scale > 0 && Number.isFinite(raw.scale) ? raw.scale : 1,
    reveal: clamp01(raw.reveal),
  };
}
