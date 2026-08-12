"use client";

import { useActionState } from "react";

import { Field, FormMessage, Select, SubmitButton, TextArea } from "@/components/form";
import { createCampaign, type FormState } from "@/lib/campaign/actions";

const PILLARS = [
  { value: "P1_ONE_PLACE", label: "P1 — One place" },
  { value: "P2_INSTANT_RECALL", label: "P2 — Recall, instantly" },
  { value: "P3_YOUR_STUFF_STAYS_YOURS", label: "P3 — Your stuff stays yours" },
  { value: "P4_FREE_WHERE_LOCAL", label: "P4 — Free where it is local" },
];

export function NewCampaignForm({
  audiences,
}: {
  audiences: { value: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(createCampaign, {});

  return (
    <form action={action} className="mt-8 space-y-5">
      <FormMessage message={state.message} />

      <Field
        id="title"
        label="Title"
        hint="How you will recognise this campaign in a list next month."
        error={state.errors?.title}
        required
        placeholder="One place for everything"
      />

      <Select
        id="pillar"
        label="Pillar"
        hint="Which of the four messaging pillars this campaign carries."
        error={state.errors?.pillar}
        options={PILLARS}
        placeholder="Pick a pillar"
      />

      <TextArea
        id="objective"
        label="Objective"
        rows={3}
        hint="What changes if this works. Not more views, but what a person does differently afterwards."
        error={state.errors?.objective}
      />

      <Select
        id="audienceId"
        label="Audience"
        hint="Who this speaks to. You can pick it later, but the campaign cannot reach a brief without one."
        error={state.errors?.audienceId}
        options={audiences}
        placeholder="Choose later"
      />

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Creating">Create campaign</SubmitButton>
        <span className="text-xs text-ink-muted">
          A campaign code is generated for you, so every link can be measured.
        </span>
      </div>
    </form>
  );
}
