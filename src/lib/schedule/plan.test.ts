import { describe, expect, it } from "vitest";

import type { VariantStatus } from "@/db/schema";
import {
  canSchedule,
  dayKey,
  describeDue,
  formatDayKey,
  groupByDay,
  idempotencyKeyFor,
  offsetMinutes,
  shiftWeek,
  startOfWeek,
  weekDays,
  zonedToUtc,
} from "./plan";

describe("offsetMinutes", () => {
  it("is one hour ahead of UTC in January", () => {
    expect(offsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(60);
  });

  it("is two hours ahead in July", () => {
    expect(offsetMinutes(new Date("2026-07-15T12:00:00Z"))).toBe(120);
  });
});

describe("zonedToUtc", () => {
  it("reads a winter morning as an hour earlier in UTC", () => {
    expect(zonedToUtc("2026-01-15", "09:00")?.toISOString()).toBe(
      "2026-01-15T08:00:00.000Z",
    );
  });

  it("reads a summer morning as two hours earlier in UTC", () => {
    expect(zonedToUtc("2026-07-15", "09:00")?.toISOString()).toBe(
      "2026-07-15T07:00:00.000Z",
    );
  });

  it("lands on the right side of the spring clock change", () => {
    // Clocks go forward on 29 March 2026. An afternoon slot that day is summer
    // time; the naive first guess would use the winter offset.
    expect(zonedToUtc("2026-03-29", "14:00")?.toISOString()).toBe(
      "2026-03-29T12:00:00.000Z",
    );
  });

  it("lands on the right side of the autumn clock change", () => {
    expect(zonedToUtc("2026-10-25", "14:00")?.toISOString()).toBe(
      "2026-10-25T13:00:00.000Z",
    );
  });

  it("refuses text that is not a date and a time", () => {
    expect(zonedToUtc("tomorrow", "09:00")).toBeNull();
    expect(zonedToUtc("2026-08-20", "half nine")).toBeNull();
    expect(zonedToUtc("", "")).toBeNull();
  });

  it("refuses an hour or minute that does not exist", () => {
    expect(zonedToUtc("2026-08-20", "25:00")).toBeNull();
    expect(zonedToUtc("2026-08-20", "09:75")).toBeNull();
  });

  it("refuses a day that does not exist rather than rolling into next month", () => {
    expect(zonedToUtc("2026-02-31", "09:00")).toBeNull();
  });
});

describe("dayKey and the week", () => {
  it("puts a late-evening UTC instant on the next local day", () => {
    // 22:30 UTC in July is 00:30 the following day in Amsterdam.
    expect(dayKey(new Date("2026-07-15T22:30:00Z"))).toBe("2026-07-16");
  });

  it("starts the week on Monday", () => {
    // 2026-08-16 is a Sunday, so its week began on the 10th.
    expect(startOfWeek(new Date("2026-08-16T10:00:00Z"))).toBe("2026-08-10");
  });

  it("leaves a Monday where it is", () => {
    expect(startOfWeek(new Date("2026-08-10T10:00:00Z"))).toBe("2026-08-10");
  });

  it("gives seven consecutive days", () => {
    const days = weekDays("2026-08-10");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-10");
    expect(days[6]).toBe("2026-08-16");
  });

  it("steps across a month boundary", () => {
    expect(shiftWeek("2026-08-31", 1)).toBe("2026-09-07");
    expect(shiftWeek("2026-09-07", -1)).toBe("2026-08-31");
  });

  it("names a day without shifting it", () => {
    expect(formatDayKey("2026-08-10")).toBe("Mon 10 Aug");
  });
});

describe("describeDue", () => {
  const now = new Date("2026-08-16T12:00:00Z");

  it("says how far off something is", () => {
    expect(describeDue(new Date("2026-08-18T12:00:00Z"), now)).toBe("in 2 days");
    expect(describeDue(new Date("2026-08-16T15:00:00Z"), now)).toBe("in 3 hours");
    expect(describeDue(new Date("2026-08-16T12:30:00Z"), now)).toBe(
      "within the hour",
    );
  });

  it("says late rather than failed, because a person still has to post it", () => {
    expect(describeDue(new Date("2026-08-14T12:00:00Z"), now)).toBe("2 days late");
    expect(describeDue(new Date("2026-08-16T09:00:00Z"), now)).toBe("3 hours late");
  });

  it("says due now for the minutes either side", () => {
    expect(describeDue(new Date("2026-08-16T11:30:00Z"), now)).toBe("due now");
  });
});

describe("canSchedule", () => {
  const now = new Date("2026-08-16T12:00:00Z");
  const base = {
    status: "APPROVED" as VariantStatus,
    approvedVersionId: "v2",
    currentVersionId: "v2",
    runAt: new Date("2026-08-18T09:00:00Z"),
    now,
  };

  it("allows an approved variant at a future time", () => {
    expect(canSchedule(base).allowed).toBe(true);
  });

  it("allows moving something already scheduled", () => {
    expect(canSchedule({ ...base, status: "SCHEDULED" }).allowed).toBe(true);
  });

  it("refuses a draft", () => {
    const verdict = canSchedule({ ...base, status: "DRAFT" });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/approved/i);
  });

  it("refuses when the approval covers an older version", () => {
    const verdict = canSchedule({ ...base, currentVersionId: "v3" });
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/rewritten/i);
  });

  it("refuses when nothing was approved", () => {
    expect(canSchedule({ ...base, approvedVersionId: null }).allowed).toBe(false);
  });

  it("refuses a time in the past", () => {
    expect(
      canSchedule({ ...base, runAt: new Date("2026-08-15T09:00:00Z") }).allowed,
    ).toBe(false);
  });

  it("refuses when no time was given", () => {
    expect(canSchedule({ ...base, runAt: null }).allowed).toBe(false);
  });

  it("tolerates a slot a few seconds old, because forms take a moment", () => {
    expect(
      canSchedule({ ...base, runAt: new Date("2026-08-16T11:59:30Z") }).allowed,
    ).toBe(true);
  });
});

describe("idempotencyKeyFor", () => {
  const at = new Date("2026-08-18T09:00:00Z");

  it("is stable for the same plan", () => {
    const key = { variantId: "a", versionId: "v2", runAt: at };
    expect(idempotencyKeyFor(key)).toBe(idempotencyKeyFor(key));
  });

  it("changes when the version changes, so revised words are a new plan", () => {
    expect(
      idempotencyKeyFor({ variantId: "a", versionId: "v2", runAt: at }),
    ).not.toBe(idempotencyKeyFor({ variantId: "a", versionId: "v3", runAt: at }));
  });

  it("ignores seconds, so two clicks in the same minute are one plan", () => {
    expect(
      idempotencyKeyFor({
        variantId: "a",
        versionId: "v2",
        runAt: new Date("2026-08-18T09:00:10Z"),
      }),
    ).toBe(
      idempotencyKeyFor({
        variantId: "a",
        versionId: "v2",
        runAt: new Date("2026-08-18T09:00:50Z"),
      }),
    );
  });
});

describe("groupByDay", () => {
  const days = weekDays("2026-08-10");

  it("puts each item in its local day column", () => {
    const grouped = groupByDay(
      [
        { runAt: new Date("2026-08-11T07:00:00Z"), status: "PENDING" },
        { runAt: new Date("2026-08-13T15:00:00Z"), status: "PENDING" },
      ],
      days,
    );

    expect(grouped["2026-08-11"]).toHaveLength(1);
    expect(grouped["2026-08-13"]).toHaveLength(1);
    expect(grouped["2026-08-10"]).toHaveLength(0);
  });

  it("orders a busy day by time", () => {
    const grouped = groupByDay(
      [
        { runAt: new Date("2026-08-11T15:00:00Z"), status: "PENDING" },
        { runAt: new Date("2026-08-11T07:00:00Z"), status: "PENDING" },
      ],
      days,
    );

    expect(grouped["2026-08-11"][0].runAt.toISOString()).toContain("07:00");
  });

  it("drops anything outside the week rather than crowding it into a column", () => {
    const grouped = groupByDay(
      [{ runAt: new Date("2026-09-01T07:00:00Z"), status: "PENDING" }],
      days,
    );

    expect(Object.values(grouped).flat()).toHaveLength(0);
  });

  it("gives a column for every day, including the empty ones", () => {
    const grouped = groupByDay([], days);
    expect(Object.keys(grouped)).toHaveLength(7);
  });
});
