/**
 * The results file.
 *
 * The prototype could export and import a CSV of logged results, and that is
 * the part of it that carried real information. This reads and writes the same
 * shape, and says which line it could not read rather than failing the whole
 * file.
 *
 * Pure. No database, no clock.
 */

import { channelEnum, type Channel } from "@/db/schema";

export interface ResultRow {
  /** ISO date, the day the numbers describe. */
  date: string;
  channel: Channel;
  /** What the post was, in your own words. */
  label: string;
  views: number;
  likes: number;
  comments: number;
  downloads: number;
}

export const CSV_HEADER = "date,channel,label,views,likes,comments,downloads";

function escape(value: string): string {
  if (/[",;\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function formatCsv(rows: ResultRow[]): string {
  const lines = rows.map((r) =>
    [
      r.date,
      r.channel,
      escape(r.label),
      r.views,
      r.likes,
      r.comments,
      r.downloads,
    ].join(","),
  );
  return [CSV_HEADER, ...lines].join("\n") + "\n";
}

/** Splits one line, honouring quotes. Handles comma and semicolon files. */
function splitLine(line: string, separator: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        current += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === separator) {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current);
  return out.map((v) => v.trim());
}

function toCount(raw: string): number | "negative" | "not-a-number" {
  const text = raw.trim();
  if (text === "") return 0;
  const n = Number(text.replace(/[.\s]/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return "not-a-number";
  if (n < 0) return "negative";
  return Math.round(n);
}

export interface ParseResult {
  rows: ResultRow[];
  /** One readable line per row that could not be read. */
  errors: string[];
}

export function parseCsv(text: string): ParseResult {
  const rows: ResultRow[] = [];
  const errors: string[] = [];
  const channels = channelEnum.enumValues as readonly string[];

  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (line === "") return;
    if (line.toLowerCase().startsWith("date,") || line.toLowerCase().startsWith("date;")) {
      return;
    }

    const separator = line.includes(";") && !line.includes(",") ? ";" : ",";
    const cells = splitLine(line, separator);

    if (cells.length < 3) {
      errors.push(`Line ${lineNo}: expected at least a date, a channel, and a label.`);
      return;
    }

    const [date, channelRaw, label, ...counts] = cells;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Line ${lineNo}: "${date}" is not a date. Use 2026-08-12.`);
      return;
    }

    const channel = channelRaw.toUpperCase().replace(/[\s-]/g, "_");
    if (!channels.includes(channel)) {
      errors.push(
        `Line ${lineNo}: ${channelRaw} is not a channel this system knows.`,
      );
      return;
    }

    const [views, likes, comments, downloads] = [0, 1, 2, 3].map((i) =>
      toCount(counts[i] ?? ""),
    );

    for (const [name, value] of [
      ["views", views],
      ["likes", likes],
      ["comments", comments],
      ["downloads", downloads],
    ] as const) {
      if (value === "negative") {
        errors.push(`Line ${lineNo}: ${name} is negative, which is a typo and not a measurement.`);
        return;
      }
      if (value === "not-a-number") {
        errors.push(`Line ${lineNo}: ${name} is not a number.`);
        return;
      }
    }

    rows.push({
      date,
      channel: channel as Channel,
      label,
      views: views as number,
      likes: likes as number,
      comments: comments as number,
      downloads: downloads as number,
    });
  });

  return { rows, errors };
}
