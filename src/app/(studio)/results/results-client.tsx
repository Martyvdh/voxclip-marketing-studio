"use client";

import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { Field, Select, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/campaign/actions";
import { addResult, importResults, type LoggedResult } from "@/lib/metrics/actions";
import { formatCsv } from "@/lib/metrics/csv";

const CHANNELS = [
  "TIKTOK",
  "INSTAGRAM_REELS",
  "YOUTUBE_SHORTS",
  "LINKEDIN",
  "X",
  "THREADS",
  "FACEBOOK",
  "BLOG",
  "EMAIL",
  "REDDIT",
  "PRODUCT_HUNT",
  "HACKER_NEWS",
].map((c) => ({ value: c, label: c.replace(/_/g, " ") }));

const NUMBER_FIELDS = ["views", "likes", "comments", "downloads"] as const;

export function LogResult() {
  const [state, action] = useActionState<FormState, FormData>(addResult, {});

  return (
    <Card>
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Log a post
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Numbers you read off the platform yourself. Every one is stored with the
        day it describes and marked as entered by hand, so nothing here pretends
        to come from a connected account.
      </p>

      <form action={action} className="mt-4 space-y-3">
        {state.ok ? <FormMessage tone="ok" message="Logged." /> : null}
        <FormMessage message={state.message} />

        <Field
          id="date"
          label="Date"
          error={state.errors?.date}
          defaultValue={new Date().toISOString().slice(0, 10)}
        />

        <Select
          id="channel"
          label="Channel"
          options={CHANNELS}
          error={state.errors?.channel}
          defaultValue="TIKTOK"
        />

        <Field
          id="label"
          label="Which post"
          error={state.errors?.label}
          placeholder="Copy three things demo"
        />

        <div className="grid grid-cols-2 gap-3">
          {NUMBER_FIELDS.map((f) => (
            <div key={f}>
              <label htmlFor={f} className="block text-sm font-medium capitalize">
                {f}
              </label>
              <input
                id={f}
                name={f}
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        <SubmitButton pendingLabel="Saving">Add</SubmitButton>
      </form>
    </Card>
  );
}

export function ImportExport({ results }: { results: LoggedResult[] }) {
  const [state, action] = useActionState<FormState, FormData>(importResults, {});
  const [open, setOpen] = useState(false);

  function download() {
    const blob = new Blob([formatCsv(results)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxclip-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Import and export
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={download}
            disabled={results.length === 0}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs"
          >
            {open ? "Close import" : "Import CSV"}
          </button>
        </div>
      </div>

      {open ? (
        <form action={action} className="mt-3 space-y-2">
          <label htmlFor="csv" className="block text-xs text-ink-muted">
            Paste the file. Comma or semicolon, with or without a header. Columns:
            date, channel, label, views, likes, comments, downloads.
          </label>
          <textarea
            id="csv"
            name="csv"
            rows={6}
            placeholder="2026-08-12,TIKTOK,Copy three things,1240,88,6,3"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-[family-name:var(--font-mono)] text-xs"
          />
          <FormMessage
            message={state.message}
            tone={state.ok ? "ok" : "error"}
          />
          <SubmitButton pendingLabel="Importing">Import</SubmitButton>
        </form>
      ) : null}
    </Card>
  );
}
