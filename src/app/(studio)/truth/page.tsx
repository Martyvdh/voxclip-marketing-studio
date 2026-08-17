import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { productClaims, productTruth, sources, users } from "@/db/schema";
import { Card, EmptyState } from "@/components/brand";
import { can, requireUser } from "@/lib/auth";
import { isDue } from "@/lib/truth/verify";
import { ClaimCard, type ClaimView } from "./claim-card";

export const dynamic = "force-dynamic";

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
  const user = await requireUser();
  const db = getDb();
  const canVerify = can(user.role, "truth:verify");

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

  const rows = await db
    .select({
      claim: productClaims,
      verifiedBy: users.name,
      checkedAgainst: sources.title,
    })
    .from(productClaims)
    .leftJoin(users, eq(users.id, productClaims.verifiedById))
    .leftJoin(sources, eq(sources.id, productClaims.sourceId))
    .where(eq(productClaims.productTruthId, current.id));

  const now = new Date();
  const claims: ClaimView[] = rows.map((row) => ({
    id: row.claim.id,
    key: row.claim.key,
    kind: row.claim.kind,
    statement: row.claim.statement,
    value: row.claim.value,
    status: row.claim.status,
    nextReviewAt: row.claim.nextReviewAt?.toISOString().slice(0, 10) ?? null,
    verifiedBy: row.verifiedBy,
    checkedAgainst: row.checkedAgainst,
  }));

  const unreliable = rows.filter((row) =>
    isDue(
      { status: row.claim.status, nextReviewAt: row.claim.nextReviewAt },
      now,
    ),
  );

  const byKind = new Map<string, ClaimView[]>();
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
            {canVerify
              ? "Open the app or the release, check what it actually says, and fill it in below. Every verification records where you looked, so a later reader can see it too."
              : "Verifying a fact is a reviewer or admin job. Ask one of them to look at these."}
          </p>
        </div>
      ) : null}

      {[...byKind.entries()].map(([kind, group]) => (
        <section key={kind} className="mt-8" aria-labelledby={`kind-${kind}`}>
          <h2 id={`kind-${kind}`} className="mb-3 text-lg font-semibold">
            {KIND_LABEL[kind] ?? kind}
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {group.map((claim) => (
              <li key={claim.id}>
                <ClaimCard claim={claim} canVerify={canVerify} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
