import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { publicationAttempts } from "@/db/schema";
import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import { buildHandoff } from "@/lib/channels/handoff";
import { loadVariants } from "@/lib/content/queries";
import { Checklist, CopyField, RecordPost } from "./handoff-client";

export const dynamic = "force-dynamic";

export default async function HandoffPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  await requireUser();
  const { slug, code } = await params;

  const row = await loadCampaignBySlug(slug);
  if (!row) notFound();

  const variants = await loadVariants(row.campaign.id);
  const variant = variants.find((v) => v.code === code);
  if (!variant) notFound();

  const handoff = buildHandoff({
    channel: variant.channel,
    code: variant.code,
    title: variant.title,
    body: variant.body,
    hashtags: variant.hashtags,
    ctaLabel: variant.ctaLabel,
    ctaUrl: variant.ctaUrl,
    altText: null,
    hasMedia: false,
  });

  const attempts = await getDb()
    .select()
    .from(publicationAttempts)
    .where(eq(publicationAttempts.variantId, variant.id));

  const posted = attempts[0] ?? null;

  return (
    <>
      <Link
        href={`/campaigns/${slug}`}
        className="text-sm text-ink-muted hover:underline"
      >
        Back to {row.campaign.title}
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-3xl font-bold">{handoff.guide.name}</h1>
        <span className="font-[family-name:var(--font-mono)] text-xs text-ink-faint">
          {variant.code}
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-ink-muted">
        Everything ready to paste, in the order {handoff.guide.name} asks for it.
        Nothing here posts for you. When an official integration exists, this page
        gets a button; until then it does not pretend to have one.
      </p>

      {handoff.warnings.length > 0 ? (
        <div
          role="status"
          className="mt-6 rounded-xl border border-line bg-amber-wash p-4"
        >
          <p className="text-sm font-medium text-amber">Before you post</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-muted">
            {handoff.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {handoff.fields.map((field) => (
            <CopyField key={field.id} field={field} />
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Where the link goes
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {handoff.guide.linkPlacement}
            </p>
          </Card>

          <Card>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Check before posting
            </h2>
            <div className="mt-3">
              <Checklist items={handoff.guide.checklist} />
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Ticks are for this sitting. They are not saved, because a checklist
              that remembers being ticked stops being read.
            </p>
          </Card>

          <RecordPost
            variantId={variant.id}
            slug={slug}
            alreadyPosted={Boolean(posted)}
            postedUrl={posted?.providerUrl ?? null}
          />
        </div>
      </div>
    </>
  );
}
