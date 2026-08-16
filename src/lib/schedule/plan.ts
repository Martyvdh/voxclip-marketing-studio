/**
 * The calendar, as pure functions.
 *
 * One honest thing to hold on to while reading this: nothing here posts
 * anything. No account is connected, so a schedule is a plan for a person, not
 * a job for a worker. It says what to post and when, and the handoff is still
 * where the posting happens. The `schedules` table is built for a worker to
 * take over later, which is why the idempotency key is here already.
 */

import type { VariantStatus } from "@/db/schema";

/** Everything is planned and shown in the time zone the work happens in. */
export const PLANNING_ZONE = "Europe/Amsterdam";

export interface Verdict {
  allowed: boolean;
  reason?: string;
}

/** Minutes the zone is ahead of UTC at that instant. Handles summer time. */
export function offsetMinutes(at: Date, timeZone = PLANNING_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );

  return Math.round((asIfUtc - at.getTime()) / 60_000);
}

/**
 * Turns "2026-08-20" and "09:00" in the planning zone into a real instant.
 *
 * Two passes: the first guess uses the offset at the wrong moment, which is
 * only wrong within a few hours of a clock change. The second pass uses the
 * offset at the guess, which lands.
 */
export function zonedToUtc(
  dateText: string,
  timeText: string,
  timeZone = PLANNING_ZONE,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!dateMatch || !timeMatch) return null;

  const [, y, m, d] = dateMatch.map(Number) as unknown as number[];
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const naive = Date.UTC(y, m - 1, d, hour, minute);
  const first = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  const settled = new Date(naive - offsetMinutes(first, timeZone) * 60_000);

  // A date like 31 February rolls over; refuse it rather than plan a post for
  // a day the operator did not pick.
  if (new Date(naive).getUTCMonth() !== m - 1) return null;

  return settled;
}

/** "Thu 20 Aug, 09:00" in the planning zone. */
export function formatInZone(at: Date, timeZone = PLANNING_ZONE): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

/** The calendar day in the planning zone, as "2026-08-20". */
export function dayKey(at: Date, timeZone = PLANNING_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Monday of the week containing that day. Weeks start on Monday here. */
export function startOfWeek(at: Date, timeZone = PLANNING_ZONE): string {
  const key = dayKey(at, timeZone);
  const [y, m, d] = key.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = (noon.getUTCDay() + 6) % 7; // Monday is 0
  noon.setUTCDate(noon.getUTCDate() - weekday);
  return noon.toISOString().slice(0, 10);
}

/** The seven day keys of the week that starts on `mondayKey`. */
export function weekDays(mondayKey: string): string[] {
  const [y, m, d] = mondayKey.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const noon = new Date(Date.UTC(y, m - 1, d + i, 12));
    return noon.toISOString().slice(0, 10);
  });
}

/** Moves a week key forward or back. `shiftWeek(key, -1)` is last week. */
export function shiftWeek(mondayKey: string, weeks: number): string {
  const [y, m, d] = mondayKey.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d + weeks * 7, 12));
  return noon.toISOString().slice(0, 10);
}

/** "Thu 20 Aug" for a column heading. */
export function formatDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * What a schedule looks like relative to now, in plain words.
 *
 * "Late" is deliberate. Nothing posts by itself, so a time that has passed
 * means somebody still has to do it, not that anything went wrong.
 */
export function describeDue(runAt: Date, now = new Date()): string {
  const minutes = Math.round((runAt.getTime() - now.getTime()) / 60_000);

  if (minutes < -60 * 24) return `${Math.floor(-minutes / (60 * 24))} days late`;
  if (minutes < -60) return `${Math.floor(-minutes / 60)} hours late`;
  if (minutes < 0) return "due now";
  if (minutes < 60) return "within the hour";
  if (minutes < 60 * 24) return `in ${Math.floor(minutes / 60)} hours`;
  return `in ${Math.floor(minutes / (60 * 24))} days`;
}

/**
 * Only an approved variant gets a slot, and only for the version that was
 * approved. Planning a post for words nobody signed off is how the approval
 * step turns into paperwork.
 */
export function canSchedule(input: {
  status: VariantStatus;
  approvedVersionId: string | null;
  currentVersionId: string | null;
  runAt: Date | null;
  now?: Date;
}): Verdict {
  if (input.status !== "APPROVED" && input.status !== "SCHEDULED") {
    return {
      allowed: false,
      reason:
        "Only an approved variant can be planned. Send it for review first.",
    };
  }

  if (!input.approvedVersionId) {
    return { allowed: false, reason: "Nothing has been approved here yet." };
  }

  if (input.approvedVersionId !== input.currentVersionId) {
    return {
      allowed: false,
      reason:
        "This was rewritten after it was approved. It needs reading again before it can be planned.",
    };
  }

  if (!input.runAt) {
    return { allowed: false, reason: "Pick a date and a time." };
  }

  const now = input.now ?? new Date();
  if (input.runAt.getTime() < now.getTime() - 60_000) {
    return { allowed: false, reason: "That time has already passed." };
  }

  return { allowed: true };
}

/**
 * The key that stops the same post going out twice.
 *
 * It covers the variant, the exact version, and the minute. Re-planning the
 * same version for the same minute is the same plan, not a second one.
 */
export function idempotencyKeyFor(input: {
  variantId: string;
  versionId: string;
  runAt: Date;
}): string {
  const minute = Math.floor(input.runAt.getTime() / 60_000);
  return `${input.variantId}:${input.versionId}:${minute}`;
}

/** Suggested times, so the week does not become one long Monday morning. */
export const SLOT_HINTS: { time: string; note: string }[] = [
  { time: "08:30", note: "before the day starts" },
  { time: "12:30", note: "lunch" },
  { time: "17:00", note: "end of the working day" },
  { time: "20:00", note: "evening scroll" },
];

export interface PlannedItem {
  runAt: Date;
  status: string;
}

/** Groups schedules into the seven columns of a week. */
export function groupByDay<T extends PlannedItem>(
  items: T[],
  days: string[],
  timeZone = PLANNING_ZONE,
): Record<string, T[]> {
  const grouped: Record<string, T[]> = Object.fromEntries(
    days.map((day) => [day, [] as T[]]),
  );

  for (const item of items) {
    const key = dayKey(item.runAt, timeZone);
    if (key in grouped) grouped[key].push(item);
  }

  for (const day of days) {
    grouped[day].sort((a, b) => a.runAt.getTime() - b.runAt.getTime());
  }

  return grouped;
}
