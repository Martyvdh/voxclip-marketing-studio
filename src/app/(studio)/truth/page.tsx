import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { productClaims, productTruth } from "@/db/schema";
import { Card, EmptyState } from "@/components/brand";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Verified", className: "bg-teal-wash text-teal-deep" },
  UNVERIFIED: { label: "Not verified", className: "bg-amber-wash text-amber" },
  STALE: { label: "Stale", className: "bg-amber-wash text-amber" },
  RETIRED: { label: "Retired", className: "bg-paper text-ink-faint" },
};

const KIND_LABEL: Record<string, string> = {
  PLATFORM: "Platforms",
  PRICING: "Pricing",
  CAPABILITY_FREE: "Free tier",
  CAPABILITY_PLUS: "VoxClip Plus",
  PRIVACY: "Privacy",
  HOTKEY: "Hotkeys",
  RELEASE: "Release",
  IDENTITY: "Identity",
  CUT_LIST: "Cut list",
  PROHIBITED: "Never say",
};

export default async function TruthPage() {
  await requireUser();
  const db = getDb();

  const [current] = await db
    .select()
    .from(productTruth)
    .where(eq(productTruth.isCurrent, true))
    .orderBy(desc(productTruth.verifiedAt))
    .limit(1);

  if (!current) {
    return (
      <>
        <h1 className="text-3xl font-bold">Product Truth</h1>
        <div className="mt-8">
          <EmptyState
            title="No Product Truth record yet"
            detail="Run the seed to load the facts from docs/product-truth.md. Until a record exists, no asset can pass its quality gate, which is the intended behaviour."
          />
        </div>
      </>
    );
  }

  const claims = await db
    .select()
    .from(productClaims)
    .where(eq(productClaims.productTruthId, current.id));

  const now = new Date();
  const unreliable = claims.filter(
    (c) =>
      c.status !== "VERIFIED" ||
      (c.nextReviewAt !== null && c.nextReviewAt < now),
  );

  const byKind = new Map<string, typeof claims>();
  for (const claim of claims) {
    byKind.set(claim.kind, [...(byKind.get(claim.kind) ?? []), claim]);
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Product Truth</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Every public claim is checked against these facts. A fact that is not
        verified, or past its review date, blocks any asset that relies on it.
        The gate never rewrites a claim for you.
      </p>

      <Card className="mt-8 max-w-3xl">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Record version</dt>
            <dd className="font-[family-name:var(--font-mono)]">
              {current.version}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Shipping app version</dt>
            <dd className="font-[family-name:var(--font-mono)]">
              {current.productVersion ?? "not verified"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Last verified</dt>
            <dd className="font-[family-name:var(--font-mono)]">
              {current.verifiedAt.toISOString().slice(0, 10)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Next review</dt>
            <dd className="font-[family-name:var(--font-mono)]">
              {current.nextReviewAt.toISOString().slice(0, 10)}
            </dd>
          </div>
        </dl>
      </Card>

      {unreliable.length > 0 ? (
        <div
          role="status"
          className="mt-6 max-w-3xl rounded-xl border border-line bg-amber-wash p-5"
        >
          <p className="font-[family-name:var(--font-display)] font-semibold text-amber">
            {unreliable.length} fact
            {unreliable.length === 1 ? "" : "s"} cannot be used yet
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            Verify each one against the shipping build or the release repository,
            then mark it verified. Anything that relies on these facts is blocked
            in the meantime, which is deliberate.
          </p>
        </div>
      ) : null}

      {[...byKind.entries()].map(([kind, group]) => (
        <section key={kind} className="mt-8" aria-labelledby={`kind-${kind}`}>
          <h2 id={`kind-${kind}`} className="mb-3 text-lg font-semibold">
            {KIND_LABEL[kind] ?? kind}
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {group.map((claim) => {
              const style = STATUS_STYLE[claim.status] ?? STATUS_STYLE.RETIRED;
              return (
                <li key={claim.id}>
                  <Card className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm">{claim.statement}</p>
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-ink-faint">
                          {claim.key}
                          {claim.nextReviewAt
                            ? ` · review by ${claim.nextReviewAt.toISOString().slice(0, 10)}`
                            : " · no review date"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
