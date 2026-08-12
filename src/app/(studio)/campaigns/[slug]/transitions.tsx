"use client";

import { useActionState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import { transitionCampaign, type FormState } from "@/lib/campaign/actions";

export interface TransitionOption {
  target: string;
  label: string;
  allowed: boolean;
  reasons: string[];
}

export function Transitions({
  slug,
  options,
}: {
  slug: string;
  options: TransitionOption[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    transitionCampaign,
    {},
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        This status is final. The campaign is read only from here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <FormMessage message={state.message} />

      {options.map((option) => (
        <Card key={option.target} className="py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{option.label}</p>
              {option.allowed ? (
                <p className="mt-1 text-sm text-ink-muted">
                  Everything this needs is in place.
                </p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-ink-muted">
                  {option.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>

            {option.allowed ? (
              <form action={action} className="shrink-0">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="to" value={option.target} />
                <SubmitButton variant="quiet" pendingLabel="Moving">
                  Move to {option.label}
                </SubmitButton>
              </form>
            ) : (
              <span className="shrink-0 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-muted">
                Blocked
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
