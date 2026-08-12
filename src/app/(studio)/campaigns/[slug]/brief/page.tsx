import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db";
import { campaignBriefs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import { BriefForm } from "./brief-form";

export const dynamic = "force-dynamic";

/** Turns a stored tagged URL back into the path the operator typed. */
function pathFromCtaUrl(ctaUrl: string | undefined): string | undefined {
  if (!ctaUrl) return undefined;
  try {
    const url = new URL(ctaUrl);
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
    ]) {
      url.searchParams.delete(key);
    }
    return url.pathname + (url.search ? url.search : "");
  } catch {
    return undefined;
  }
}

export default async function BriefPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireUser();
  const { slug } = await params;
  const row = await loadCampaignBySlug(slug);
  if (!row) notFound();

  const [brief] = await getDb()
    .select()
    .from(campaignBriefs)
    .where(eq(campaignBriefs.campaignId, row.campaign.id))
    .limit(1);

  return (
    <>
      <Link
        href={`/campaigns/${slug}`}
        className="text-sm text-ink-muted hover:underline"
      >
        Back to {row.campaign.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">Brief</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Everything written later is derived from this. A campaign cannot leave the
        brief while any of these is empty, because a draft written without them is
        a draft nobody can review.
      </p>

      <BriefForm
        slug={slug}
        values={{
          problem: brief?.problem,
          desiredOutcome: brief?.desiredOutcome,
          promise: brief?.promise,
          proof: brief?.proof,
          offer: brief?.offer,
          primaryCta: brief?.primaryCta,
          ctaPath: pathFromCtaUrl(brief?.ctaUrl),
          productContext: brief?.productContext ?? undefined,
        }}
      />
    </>
  );
}
