"use client";

import { useActionState, useState } from "react";

import { Card, FormMessage } from "@/components/brand-client";
import { SubmitButton } from "@/components/form";
import type { ClaimKind } from "@/db/schema";
import type { FormState } from "@/lib/campaign/actions";
import { retractClaim, verifyClaim } from "@/lib/truth/actions";
import { hotkeyWarning, NEEDS_VALUE, REVIEW_MONTHS } from "@/lib/truth/verify";

export interface ClaimView {
  id: string;
  key: string;
  kind: ClaimKind;
  statement: string;
  value: string | null;
  status: string;
  nextReviewAt: string | null;
  verifiedBy: string | null;
  checkedAgainst: string | null;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Geverifieerd", className: "bg-teal-wash text-teal-deep" },
  UNVERIFIED: { label: "Niet geverifieerd", className: "bg-amber-wash text-amber" },
  STALE: { label: "Verouderd", className: "bg-amber-wash text-amber" },
  RETIRED: { label: "Ingetrokken", className: "bg-paper text-ink-faint" },
};

const VALUE_HINT: Partial<Record<ClaimKind, string>> = {
  HOTKEY: "⌘⇧Space of Ctrl+Shift+V",
  RELEASE: "0.4.2",
  PRICING: "6.99",
};

export function ClaimCard({
  claim,
  canVerify,
}: {
  claim: ClaimView;
  canVerify: boolean;
}) {
  const [verifyState, verifyAction] = useActionState<FormState, FormData>(
    verifyClaim,
    {},
  );
  const [retractState, retractAction] = useActionState<FormState, FormData>(
    retractClaim,
    {},
  );

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(claim.value ?? "");

  const style = STATUS_STYLE[claim.status] ?? STATUS_STYLE.RETIRED;
  const needsValue = NEEDS_VALUE.includes(claim.kind);
  const warning = hotkeyWarning(claim.kind, value);

  return (
    <Card className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">{claim.statement}</p>
          <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
            {claim.key}
            {claim.value ? ` · ${claim.value}` : ""}
            {claim.nextReviewAt
              ? ` · opnieuw bekijken ${claim.nextReviewAt}`
              : " · geen reviewdatum"}
          </p>
          {claim.checkedAgainst ? (
            <p className="mt-1 text-xs text-ink-muted">
              Gecontroleerd tegen {claim.checkedAgainst}
              {claim.verifiedBy ? ` door ${claim.verifiedBy}` : ""}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium ${style.className}`}
        >
          {style.label}
        </span>
      </div>

      <FormMessage message={verifyState.message ?? retractState.message} />

      {canVerify ? (
        open ? (
          <form action={verifyAction} className="mt-3 space-y-3 border-t border-line pt-3">
            <input type="hidden" name="claimId" value={claim.id} />

            {needsValue ? (
              <div>
                <label
                  htmlFor={`value-${claim.id}`}
                  className="block text-sm font-medium"
                >
                  Wat staat er nu echt
                </label>
                <input
                  id={`value-${claim.id}`}
                  name="value"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={VALUE_HINT[claim.kind]}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                />
                {verifyState.errors?.value ? (
                  <p role="alert" className="mt-1 text-xs text-alert">
                    {verifyState.errors.value}
                  </p>
                ) : warning ? (
                  <p className="mt-1 text-xs text-amber">{warning}</p>
                ) : null}
              </div>
            ) : (
              <input type="hidden" name="value" value={claim.value ?? ""} />
            )}

            <div>
              <label
                htmlFor={`statement-${claim.id}`}
                className="block text-sm font-medium"
              >
                De zin zoals hij gebruikt mag worden
              </label>
              <input
                id={`statement-${claim.id}`}
                name="statement"
                defaultValue={claim.statement}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-ink-muted">
                Klopt de formulering niet meer, pas hem hier aan.
              </p>
            </div>

            <div>
              <label
                htmlFor={`checked-${claim.id}`}
                className="block text-sm font-medium"
              >
                Waar heb je het gecontroleerd
              </label>
              <input
                id={`checked-${claim.id}`}
                name="checkedAgainst"
                placeholder="Build 0.4.2 op mijn Mac, vanmiddag geopend"
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              />
              {verifyState.errors?.checkedAgainst ? (
                <p role="alert" className="mt-1 text-xs text-alert">
                  {verifyState.errors.checkedAgainst}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-muted">
                  Over drie maanden wil je weten waar je toen naar keek.
                </p>
              )}
            </div>

            <p className="text-xs text-ink-muted">
              Dit feit komt over {REVIEW_MONTHS[claim.kind]} maanden weer op de
              lijst.
            </p>

            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingLabel="Opslaan">
                Markeer als geverifieerd
              </SubmitButton>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              >
                Annuleren
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              {claim.status === "VERIFIED" ? "Opnieuw controleren" : "Verifiëren"}
            </button>
            {claim.status === "VERIFIED" ? (
              <form action={retractAction}>
                <input type="hidden" name="claimId" value={claim.id} />
                <button
                  type="submit"
                  className="text-xs text-ink-muted underline hover:text-ink"
                >
                  Klopt niet meer
                </button>
              </form>
            ) : null}
          </div>
        )
      ) : null}
    </Card>
  );
}
