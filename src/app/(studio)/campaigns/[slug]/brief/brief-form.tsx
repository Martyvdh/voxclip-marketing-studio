"use client";

import { useActionState } from "react";

import { Field, FormMessage, SubmitButton, TextArea } from "@/components/form";
import { saveBrief, type FormState } from "@/lib/campaign/actions";

export interface BriefValues {
  problem?: string;
  desiredOutcome?: string;
  promise?: string;
  proof?: string;
  offer?: string;
  primaryCta?: string;
  ctaPath?: string;
  productContext?: string;
}

export function BriefForm({
  slug,
  values,
}: {
  slug: string;
  values: BriefValues;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveBrief, {});

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="slug" value={slug} />

      <FormMessage message={state.message} />
      {state.ok ? <FormMessage message="Brief saved." tone="ok" /> : null}

      <TextArea
        id="problem"
        label="Problem"
        hint="The moment that goes wrong, in their words. Not ours."
        error={state.errors?.problem}
        defaultValue={values.problem}
      />

      <TextArea
        id="desiredOutcome"
        label="Desired outcome"
        hint="What it looks like when that problem is gone."
        error={state.errors?.desiredOutcome}
        defaultValue={values.desiredOutcome}
      />

      <TextArea
        id="promise"
        label="Promise"
        rows={2}
        hint="One sentence. What VoxClip promises this person."
        error={state.errors?.promise}
        defaultValue={values.promise}
      />

      <TextArea
        id="proof"
        label="Proof"
        hint="What makes the promise believable. Name the real screenshot or recording you will show, or the verified fact you will point at. Not an adjective."
        error={state.errors?.proof}
        defaultValue={values.proof}
      />

      <Field
        id="offer"
        label="Offer"
        hint="What you are asking them to take. The free download, the trial, an article."
        error={state.errors?.offer}
        defaultValue={values.offer}
      />

      <Field
        id="primaryCta"
        label="Call to action"
        hint="One only, written as the words on the button."
        error={state.errors?.primaryCta}
        defaultValue={values.primaryCta}
        placeholder="Download VoxClip"
      />

      <Field
        id="ctaPath"
        label="Where it sends people"
        hint="A path on our own site, such as /download. The tracking is added for you, tagged with this campaign."
        error={state.errors?.ctaPath}
        defaultValue={values.ctaPath}
        placeholder="/download"
      />

      <TextArea
        id="productContext"
        label="Product context"
        rows={2}
        hint="Optional. Any release or version this depends on, so a later reader knows what was true when."
        error={state.errors?.productContext}
        defaultValue={values.productContext}
      />

      <SubmitButton pendingLabel="Saving">Save brief</SubmitButton>
    </form>
  );
}
