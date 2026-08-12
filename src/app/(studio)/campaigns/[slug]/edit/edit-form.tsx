"use client";

import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { Field, Select, SubmitButton, TextArea } from "@/components/form";
import {
  archiveCampaign,
  updateCampaign,
  type FormState,
} from "@/lib/campaign/actions";

const PILLARS = [
  { value: "P1_ONE_PLACE", label: "P1 — One place" },
  { value: "P2_INSTANT_RECALL", label: "P2 — Recall, instantly" },
  { value: "P3_YOUR_STUFF_STAYS_YOURS", label: "P3 — Your stuff stays yours" },
  { value: "P4_FREE_WHERE_LOCAL", label: "P4 — Free where it is local" },
];

export function EditCampaignForm({
  slug,
  audiences,
  values,
}: {
  slug: string;
  audiences: { value: string; label: string }[];
  values: {
    title: string;
    pillar: string;
    objective: string;
    audienceId: string | null;
  };
}) {
  const [state, action] = useActionState<FormState, FormData>(updateCampaign, {});

  return (
    <form action={action} className="mt-6 space-y-5">
      <input type="hidden" name="slug" value={slug} />

      {state.ok ? <FormMessage tone="ok" message="Saved." /> : null}
      <FormMessage message={state.message} />

      <Field
        id="title"
        label="Title"
        error={state.errors?.title}
        defaultValue={values.title}
      />

      <Select
        id="pillar"
        label="Pillar"
        options={PILLARS}
        error={state.errors?.pillar}
        defaultValue={values.pillar}
      />

      <TextArea
        id="objective"
        label="What should be different afterwards"
        rows={3}
        hint="One sentence about a person, not a number."
        error={state.errors?.objective}
        defaultValue={values.objective}
      />

      <Select
        id="audienceId"
        label="Audience"
        options={audiences}
        error={state.errors?.audienceId}
        defaultValue={values.audienceId ?? ""}
        placeholder="Choose later"
      />

      <SubmitButton pendingLabel="Saving">Save changes</SubmitButton>
    </form>
  );
}

export function ArchiveCampaign({
  slug,
  title,
  archived,
}: {
  slug: string;
  title: string;
  archived: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(archiveCampaign, {});
  const [confirm, setConfirm] = useState("");

  if (archived) {
    return (
      <Card className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          This campaign is archived
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          It is off the board but everything it did is still recorded.
        </p>
        <form action={action} className="mt-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="restore" value="true" />
          <SubmitButton variant="quiet" pendingLabel="Restoring">
            Bring it back
          </SubmitButton>
        </form>
      </Card>
    );
  }

  return (
    <Card className="mt-10 border-alert/40">
      <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
        Archive this campaign
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        It leaves the board and stops appearing in your next actions. Nothing is
        deleted: who approved what, what went out, and what it brought in stay
        recorded, and you can bring it back. There is no permanent delete, because
        that would take the record of anything already published with it.
      </p>

      <FormMessage message={state.message} />

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="slug" value={slug} />

        <div>
          <label htmlFor="confirm" className="block text-sm">
            Type the campaign title to confirm
          </label>
          <input
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={title}
            className="mt-1 w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={confirm.trim() !== title.trim()}
          className="rounded-lg border border-alert px-4 py-2.5 text-sm font-medium text-alert disabled:cursor-not-allowed disabled:opacity-40"
        >
          Archive it
        </button>
      </form>
    </Card>
  );
}
