/**
 * Het VoxClip-venster, getekend in de editor.
 *
 * Dit breekt de regel in `AGENTS.md` dat de interface nooit getekend wordt, en
 * dat is een bewuste beslissing met een grens eromheen.
 *
 * Waarom toch: honderddrieënzeventig startpunten waren tekst op een vlak, en de
 * terugkerende klacht was "ik zie het product niet". Dat klopte. Een schermopname
 * is het eerlijkste antwoord, maar die bestaat pas als iemand hem maakt, en tot
 * die tijd zijn alle video's kaartjes met zinnen erop.
 *
 * De grens: hier staat alleen wat op 18 augustus 2026 in build 0.2.14 echt op
 * het scherm stond — dit zoekveld met deze tekst, deze drie filters, rijen met
 * bron en tijd, en `⌥Space` als sneltoets. Geen knop die de app niet heeft, geen
 * functie die niet bestaat. Verandert de app, dan verandert dit mee of het gaat
 * eruit. `app-frame.test.ts` bewaakt dat de teksten hier gelijk blijven aan wat
 * er in Product Truth staat.
 *
 * Pure tekenfuncties: ze krijgen een context en getallen, en lezen niets.
 */

import { INK, PAPER, SIGNAL_TEAL } from "./render-colours";

/** De echte plaatshouder uit het zoekveld. Woordelijk. */
export const SEARCH_PLACEHOLDER = "Search everything you've copied or said";

/** De drie filters, in de volgorde waarin ze staan. */
export const FILTERS = ["All", "Copied", "Spoke"] as const;

/** De voettekst onderin het venster. Woordelijk. */
export const FOOTER = "Everything stays on this Mac";

/** De sneltoets van de Quick-picker. Niet ⌘⇧Space — dat start dictation. */
export const HOTKEY = "⌥Space";

export interface AppRow {
  text: string;
  source: string;
  /** RICH TEXT, SPOKE, IMAGE — of leeg voor gewone tekst. */
  kind?: string;
}

/**
 * Voorbeeldrijen.
 *
 * Nooit een volledig adres. Straat plus huisnummer plus postcode is iemands
 * voordeur, ook als je het verzint — die combinatie bestaat meestal echt. Wat
 * hier staat gaat in duizenden video's mee en is daarna niet terug te halen.
 */
export const SAMPLE_ROWS: AppRow[] = [
  { text: "invoice@voxclip.it", source: "Chrome · 12m", kind: "RICH TEXT" },
  { text: "Pick-up point: the bakery on the corner", source: "Notes · 41m" },
  { text: "Call the notary — 3:00", source: "Notes · 1h", kind: "SPOKE" },
  { text: "Order #48213 — delivery Thursday", source: "Mail · 2h" },
  { text: "Meeting moved to 14:30, room 2.", source: "Notes · 3h" },
];

export interface FrameOptions {
  /** Wat er in het zoekveld staat. Leeg toont de plaatshouder. */
  query: string;
  /** Welk filter aan staat: 0 All, 1 Copied, 2 Spoke. */
  filter: number;
  /** Welke rij oplicht, of -1. */
  highlight: number;
  /** 0 tot 1. Hoe ver het venster gedimd is, voor als de picker eroverheen komt. */
  dim: number;
}

export const DEFAULTS: FrameOptions = {
  query: "",
  filter: 0,
  highlight: -1,
  dim: 0,
};

/** Welke rijen zichtbaar zijn bij deze zoekterm en dit filter. */
export function visibleRows(rows: AppRow[], query: string, filter: number): AppRow[] {
  const needle = query.trim().toLowerCase();
  return rows
    .filter((row) => (needle ? row.text.toLowerCase().includes(needle) : true))
    .filter((row) => {
      if (filter === 1) return row.kind !== "SPOKE";
      if (filter === 2) return row.kind === "SPOKE";
      return true;
    });
}

function mix(from: string, to: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(r1 + (r2 - r1) * k)}, ${Math.round(g1 + (g2 - g1) * k)}, ${Math.round(b1 + (b2 - b1) * k)})`;
}

/**
 * Tekent het venster over het hele doek.
 *
 * Geeft de onderkant van de lijst terug, zodat een bijschrift eronder past.
 */
export function drawAppFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rows: AppRow[],
  options: Partial<FrameOptions> = {},
): number {
  const { query, filter, highlight, dim } = { ...DEFAULTS, ...options };
  const pad = Math.round(width * 0.052);
  const x0 = pad;
  const x1 = width - pad;
  const unit = width / 1080;

  const ink = mix(PAPER, INK, 1 - dim * 0.75);
  const grey = mix(PAPER, "#969EAA", 1 - dim * 0.6);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  // Het merkteken: de tegel met de ingesneden hoek, één teal balk.
  const m = 46 * unit;
  const top = 120 * unit;
  ctx.fillStyle = ink;
  ctx.beginPath();
  const notch = m * 0.28;
  ctx.moveTo(x0 + m * 0.22, top);
  ctx.lineTo(x0 + m - notch, top);
  ctx.lineTo(x0 + m, top + notch);
  ctx.lineTo(x0 + m, top + m - m * 0.22);
  ctx.quadraticCurveTo(x0 + m, top + m, x0 + m - m * 0.22, top + m);
  ctx.lineTo(x0 + m * 0.22, top + m);
  ctx.quadraticCurveTo(x0, top + m, x0, top + m - m * 0.22);
  ctx.lineTo(x0, top + m * 0.22);
  ctx.quadraticCurveTo(x0, top, x0 + m * 0.22, top);
  ctx.fill();

  [
    [0.28, 0.3, PAPER],
    [0.46, 0.46, SIGNAL_TEAL],
    [0.64, 0.3, PAPER],
  ].forEach(([bx, bh, colour]) => {
    const w = m * 0.1;
    const h = m * (bh as number);
    ctx.fillStyle = colour as string;
    ctx.beginPath();
    ctx.roundRect(x0 + m * (bx as number) - w / 2, top + m / 2 - h / 2, w, h, w / 2);
    ctx.fill();
  });

  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 ${Math.round(34 * unit)}px "Space Grotesk", system-ui, sans-serif`;
  ctx.fillText("VoxClip", x0 + 60 * unit, top + 6 * unit);

  // zoekveld
  let y = 200 * unit;
  ctx.fillStyle = mix(PAPER, "#EEEFF1", 1 - dim);
  ctx.beginPath();
  ctx.roundRect(x0, y, x1 - x0, 74 * unit, 18 * unit);
  ctx.fill();

  ctx.strokeStyle = grey;
  ctx.lineWidth = 4 * unit;
  ctx.beginPath();
  ctx.arc(x0 + 37 * unit, y + 37 * unit, 11 * unit, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0 + 45 * unit, y + 45 * unit);
  ctx.lineTo(x0 + 54 * unit, y + 54 * unit);
  ctx.stroke();

  ctx.font = `400 ${Math.round(30 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = query ? ink : grey;
  ctx.fillText(query || SEARCH_PLACEHOLDER, x0 + 72 * unit, y + 20 * unit);
  if (query) {
    const w = ctx.measureText(query).width;
    ctx.fillStyle = SIGNAL_TEAL;
    ctx.fillRect(x0 + 76 * unit + w, y + 20 * unit, 3 * unit, 34 * unit);
  }

  // filters
  y += 100 * unit;
  FILTERS.forEach((label, i) => {
    const on = i === filter;
    ctx.font = `${on ? 600 : 400} ${Math.round(26 * unit)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = on ? mix(PAPER, SIGNAL_TEAL, 1 - dim) : grey;
    ctx.fillText(label, x0 + i * 108 * unit, y);
  });

  y += 58 * unit;
  ctx.font = `600 ${Math.round(20 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = grey;
  ctx.fillText("TODAY", x0, y);

  y += 44 * unit;
  for (const [i, row] of rows.entries()) {
    if (i === highlight) {
      ctx.fillStyle = mix(PAPER, "#E8F6F4", 1 - dim);
      ctx.beginPath();
      ctx.roundRect(x0 - 12 * unit, y - 12 * unit, x1 - x0 + 24 * unit, 58 * unit, 12 * unit);
      ctx.fill();
    }

    ctx.strokeStyle = grey;
    ctx.lineWidth = 3 * unit;
    ctx.beginPath();
    ctx.roundRect(x0, y + 4 * unit, 20 * unit, 20 * unit, 5 * unit);
    ctx.stroke();

    let tx = x0 + 38 * unit;
    if (row.kind) {
      ctx.font = `600 ${Math.round(18 * unit)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = grey;
      ctx.fillText(row.kind, tx, y + 5 * unit);
      tx += (row.kind === "RICH TEXT" ? 112 : 76) * unit;
    }

    ctx.font = `400 ${Math.round(28 * unit)}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = ink;
    ctx.fillText(row.text, tx, y - 2 * unit);

    ctx.font = `400 ${Math.round(22 * unit)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = grey;
    ctx.textAlign = "right";
    ctx.fillText(row.source, x1, y + 4 * unit);
    ctx.textAlign = "left";

    y += 78 * unit;
  }

  return y;
}

/** De Quick-picker, die van onderen over het venster komt. */
export function drawPicker(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rise: number,
  query: string,
  rows: AppRow[],
  chosen: number,
): void {
  const unit = width / 1080;
  const pad = Math.round(width * 0.052);
  const panel = 620 * unit;
  const top = height - panel * Math.max(0, Math.min(1, rise));

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(pad - 20 * unit, top, width - pad * 2 + 40 * unit, panel + 40 * unit, 28 * unit);
  ctx.fill();

  let y = top + 46 * unit;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `600 ${Math.round(26 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = SIGNAL_TEAL;
  ctx.fillText(HOTKEY, pad + 8 * unit, y);

  ctx.font = `400 ${Math.round(34 * unit)}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = PAPER;
  ctx.fillText(`${query}▏`, pad + 8 * unit, y + 44 * unit);

  y += 112 * unit;
  ctx.strokeStyle = "#3A4252";
  ctx.lineWidth = 2 * unit;
  ctx.beginPath();
  ctx.moveTo(pad + 8 * unit, y);
  ctx.lineTo(width - pad - 8 * unit, y);
  ctx.stroke();

  y += 26 * unit;
  rows.slice(0, 4).forEach((row, i) => {
    if (i === chosen) {
      ctx.fillStyle = "#263042";
      ctx.beginPath();
      ctx.roundRect(pad - 4 * unit, y - 10 * unit, width - pad * 2 + 8 * unit, 54 * unit, 10 * unit);
      ctx.fill();
      ctx.fillStyle = SIGNAL_TEAL;
      ctx.fillRect(pad - 4 * unit, y - 10 * unit, 4 * unit, 54 * unit);
    }
    ctx.font = `400 ${Math.round(26 * unit)}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.fillStyle = i === chosen ? PAPER : "#B0B8C4";
    ctx.fillText(row.text, pad + 16 * unit, y);
    y += 62 * unit;
  });
}
