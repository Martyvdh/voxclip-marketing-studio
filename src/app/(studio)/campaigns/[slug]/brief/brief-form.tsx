"use client";

import { useActionState, useState } from "react";

import { Field, FormMessage, SubmitButton, TextArea } from "@/components/form";
import { saveBrief, type FormState } from "@/lib/campaign/actions";
import type { Suggestion } from "@/lib/brief/suggest";

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
  suggestion,
}: {
  slug: string;
  values: BriefValues;
  suggestion: Suggestion;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveBrief, {});

  // Het voorstel vervangt de standaardwaarden van de velden. Een key-wissel
  // laat React de invoervelden opnieuw opbouwen, zodat wat je al had getypt
  // niet half blijft staan.
  const [filled, setFilled] = useState(false);
  const shown = filled
    ? {
        problem: suggestion.problem,
        desiredOutcome: suggestion.desiredOutcome,
        promise: suggestion.promise,
        proof: suggestion.proof,
        offer: suggestion.offer,
        primaryCta: suggestion.primaryCta,
        ctaPath: suggestion.ctaPath,
        productContext: values.productContext,
      }
    : values;

  const empty = !values.problem && !values.promise;

  return (
    <>
      {empty ? (
        <div className="mt-6 max-w-2xl rounded-xl border border-line bg-surface p-5">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            Voorstel invullen
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Zet de goedgekeurde pijlertekst, een hook uit de bibliotheek, een
            bestaande call-to-action en een geverifieerd feit in de velden. Er
            wordt niets bedacht en niets opgeslagen: elk woord stond al ergens,
            en het is pas een brief als jij het herschrijft en opslaat.
          </p>

          {suggestion.sources.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-ink-faint">
              {suggestion.sources.map((source) => (
                <li key={source} className="font-[family-name:var(--font-mono)]">
                  {source}
                </li>
              ))}
            </ul>
          ) : null}

          {suggestion.gaps.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber">
              {suggestion.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setFilled(true)}
              disabled={filled}
              className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {filled ? "Ingevuld, schrijf het nu om" : "Vul een voorstel in"}
            </button>
            {filled ? (
              <button
                type="button"
                onClick={() => setFilled(false)}
                className="text-sm text-ink-muted underline hover:text-ink"
              >
                Leegmaken
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <form key={filled ? "suggested" : "blank"} action={action} className="mt-8 space-y-5">
        <input type="hidden" name="slug" value={slug} />

        <FormMessage message={state.message} />
        {state.ok ? <FormMessage message="Brief saved." tone="ok" /> : null}

        <TextArea
          id="problem"
          label="Problem"
          hint="The moment that goes wrong, in their words. Not ours."
          error={state.errors?.problem}
          defaultValue={shown.problem}
        />

        <TextArea
          id="desiredOutcome"
          label="Desired outcome"
          hint="What it looks like when that problem is gone."
          error={state.errors?.desiredOutcome}
          defaultValue={shown.desiredOutcome}
        />

        <TextArea
          id="promise"
          label="Promise"
          rows={2}
          hint="One sentence. What VoxClip promises this person."
          error={state.errors?.promise}
          defaultValue={shown.promise}
        />

        <TextArea
          id="proof"
          label="Proof"
          hint="What makes the promise believable. Name the real screenshot or recording you will show, or the verified fact you will point at. Not an adjective."
          error={state.errors?.proof}
          defaultValue={shown.proof}
        />

        <Field
          id="offer"
          label="Offer"
          hint="What you are asking them to take. The free download, the trial, an article."
          error={state.errors?.offer}
          defaultValue={shown.offer}
        />

        <Field
          id="primaryCta"
          label="Call to action"
          hint="One only, written as the words on the button."
          error={state.errors?.primaryCta}
          defaultValue={shown.primaryCta}
          placeholder="Download VoxClip"
        />

        <Field
          id="ctaPath"
          label="Where it sends people"
          hint="A path on our own site, such as /download. The tracking is added for you, tagged with this campaign."
          error={state.errors?.ctaPath}
          defaultValue={shown.ctaPath}
          placeholder="/download"
        />

        <TextArea
          id="productContext"
          label="Product context"
          rows={2}
          hint="Optional. Any release or version this depends on, so a later reader knows what was true when."
          error={state.errors?.productContext}
          defaultValue={shown.productContext}
        />

        <SubmitButton pendingLabel="Saving">Save brief</SubmitButton>
      </form>
    </>
  );
}
