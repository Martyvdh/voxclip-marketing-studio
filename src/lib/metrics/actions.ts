"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { metricObservations, type Channel } from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import { parseCsv, type ResultRow } from "./csv";

const METRIC_KEYS = ["views", "likes", "comments", "downloads"] as const;

/**
 * One logged post becomes four observations, one per number, each stamped with
 * its source and the day it describes. That is what lets every figure on a
 * dashboard say where it came from instead of floating there unexplained.
 */
async function writeRows(rows: ResultRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getDb();

  const values = rows.flatMap((row) => {
    const day = new Date(`${row.date}T00:00:00.000Z`);
    const end = new Date(`${row.date}T23:59:59.999Z`);

    return METRIC_KEYS.map((key) => ({
      channel: row.channel,
      stage: "PUBLICATION" as const,
      metricKey: key,
      value: row[key],
      source: "MANUAL_ENTRY" as const,
      windowStart: day,
      windowEnd: end,
      note: row.label,
    }));
  });

  await db.insert(metricObservations).values(values);
  return rows.length;
}

export async function addResult(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const date = String(formData.get("date") ?? "").trim();
  const channel = String(formData.get("channel") ?? "") as Channel;
  const label = String(formData.get("label") ?? "").trim();

  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Pick the day these numbers describe.";
  if (!channel) errors.channel = "Which channel was this on?";
  if (label.length < 2) errors.label = "Name the post so you recognise it in the list.";
  if (Object.keys(errors).length > 0) return { errors };

  const counts = METRIC_KEYS.map((key) => {
    const raw = String(formData.get(key) ?? "").trim();
    const n = raw === "" ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  });

  if (counts.some((c) => c === null)) {
    return { message: "One of the numbers is not a whole number of zero or more." };
  }

  await writeRows([
    {
      date,
      channel,
      label,
      views: counts[0]!,
      likes: counts[1]!,
      comments: counts[2]!,
      downloads: counts[3]!,
    },
  ]);

  revalidatePath("/results");
  return { ok: true };
}

export async function importResults(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const text = String(formData.get("csv") ?? "");
  if (text.trim() === "") return { message: "Paste the file's contents first." };

  const { rows, errors } = parseCsv(text);
  const written = await writeRows(rows);

  revalidatePath("/results");

  if (errors.length > 0) {
    return {
      message:
        `Imported ${written} ${written === 1 ? "row" : "rows"}. ` +
        `${errors.length} could not be read: ${errors.slice(0, 5).join(" ")}` +
        (errors.length > 5 ? ` And ${errors.length - 5} more.` : ""),
    };
  }
  return { ok: true, message: `Imported ${written} ${written === 1 ? "row" : "rows"}.` };
}

export interface LoggedResult extends ResultRow {
  key: string;
}

export async function listResults(): Promise<LoggedResult[]> {
  const rows = await getDb()
    .select()
    .from(metricObservations)
    .where(
      and(
        eq(metricObservations.source, "MANUAL_ENTRY"),
        eq(metricObservations.stage, "PUBLICATION"),
      ),
    )
    .orderBy(desc(metricObservations.windowStart));

  // Four observations describe one post. Group them back together by the day,
  // the channel, and the label they were logged under.
  const grouped = new Map<string, LoggedResult>();

  for (const row of rows) {
    const date = row.windowStart.toISOString().slice(0, 10);
    const key = `${date}|${row.channel}|${row.note ?? ""}`;

    const entry =
      grouped.get(key) ??
      ({
        key,
        date,
        channel: (row.channel ?? "BLOG") as Channel,
        label: row.note ?? "",
        views: 0,
        likes: 0,
        comments: 0,
        downloads: 0,
      } satisfies LoggedResult);

    if (METRIC_KEYS.includes(row.metricKey as (typeof METRIC_KEYS)[number])) {
      entry[row.metricKey as (typeof METRIC_KEYS)[number]] = row.value ?? 0;
    }
    grouped.set(key, entry);
  }

  return [...grouped.values()];
}
