import Link from "next/link";

import { Card } from "@/components/brand";
import { can, requireUser } from "@/lib/auth";
import {
  formatDayKey,
  shiftWeek,
  startOfWeek,
} from "@/lib/schedule/plan";
import { loadSchedulable, loadWeek } from "@/lib/schedule/queries";
import { PlanForm, PlannedCard } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const mondayKey = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "")
    ? startOfWeek(new Date(`${params.week}T12:00:00Z`))
    : startOfWeek(new Date());

  const [week, schedulable] = await Promise.all([
    loadWeek(mondayKey),
    loadSchedulable(),
  ]);

  const canSchedule = can(user.role, "campaign:schedule");
  const planned = Object.values(week.byDay).flat();

  return (
    <>
      <h1 className="text-3xl font-bold">Calendar</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        What goes out, and when. Nothing posts by itself: a slot is a reminder
        with the finished words attached, and you post it from the handoff.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?week=${shiftWeek(mondayKey, -1)}`}
            aria-label="Previous week"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-ink"
          >
            <span aria-hidden="true">←</span>
            <span className="ml-1.5 hidden sm:inline">Previous</span>
          </Link>
          <Link
            href={`/calendar?week=${shiftWeek(mondayKey, 1)}`}
            aria-label="Next week"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm hover:border-ink"
          >
            <span className="mr-1.5 hidden sm:inline">Next</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/calendar"
            className="px-2 py-2 text-sm text-ink-muted underline hover:text-ink"
          >
            This week
          </Link>
        </div>
        <p className="font-[family-name:var(--font-mono)] text-sm text-ink-muted">
          {formatDayKey(week.days[0])} — {formatDayKey(week.days[6])}
        </p>
      </div>

      {/*
        Seven columns on a wide screen, a plain list on a phone. Squeezing a
        week into seven 45-pixel columns makes it unreadable, and a sideways
        scroll hides half the week behind an edge, so below the breakpoint the
        empty days step aside and the days with something in them stack.
      */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {week.days.map((day) => (
          <section
            key={day}
            aria-label={formatDayKey(day)}
            className={`rounded-xl border bg-surface p-3 ${
              day === week.todayKey ? "border-teal-deep" : "border-line"
            } ${week.byDay[day].length === 0 ? "max-lg:hidden" : ""}`}
          >
            <h2 className="flex items-baseline justify-between gap-2 text-xs font-medium text-ink-muted">
              <span>{formatDayKey(day)}</span>
              {day === week.todayKey ? (
                <span className="text-teal-deep">today</span>
              ) : null}
            </h2>

            <div className="mt-2 space-y-2">
              {week.byDay[day].length === 0 ? (
                <p className="text-xs text-ink-faint" aria-label="nothing planned">
                  —
                </p>
              ) : (
                week.byDay[day].map((post) => (
                  <PlannedCard
                    key={post.id}
                    post={post}
                    canSchedule={canSchedule}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {planned.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Nothing planned this week.</p>
      ) : null}

      <div className="mt-8">
        {canSchedule ? (
          <PlanForm variants={schedulable} defaultDate={week.days[0]} />
        ) : (
          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Your role
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              You can read the calendar. Planning a post is a publisher or admin
              job, kept separate from approving so that a yes is not also a
              green light to post.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
