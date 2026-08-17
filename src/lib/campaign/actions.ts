"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  auditEvents,
  campaignBriefs,
  campaignTransitions,
  campaigns,
  channelVariants,
  publicationAttempts,
  type CampaignStatus,
} from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { buildCampaignCode, buildTaggedUrl, nextAvailableCode, slugify } from "./codes";
import { loadCampaignBySlug } from "./queries";
import { canDeleteCampaign } from "./delete";
import { evaluateTransition } from "./state-machine";
import { briefSchema, firstErrors, newCampaignSchema } from "./validation";

export interface FormState {
  /** One message per field, so a form can put each one where it belongs. */
  errors?: Record<string, string>;
  /** Something that is not about one field: permission, a refused transition. */
  message?: string;
  ok?: boolean;
}

function readForm(formData: FormData, keys: string[]) {
  const out: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = formData.get(key);
    const text = typeof value === "string" ? value : "";
    out[key] = text.length > 0 ? text : undefined;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createCampaign(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:create");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const parsed = newCampaignSchema.safeParse(
    readForm(formData, ["title", "pillar", "objective", "audienceId", "signalId"]),
  );
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const db = getDb();
  const now = new Date();

  let slug: string;
  let code: string;
  try {
    slug = slugify(parsed.data.title);
    code = buildCampaignCode(parsed.data.title, now);
  } catch (error) {
    return { errors: { title: (error as Error).message } };
  }

  // Slugs and campaign codes are unique. Count up rather than fail on a clash.
  const existing = await db
    .select({ slug: campaigns.slug, code: campaigns.campaignCode })
    .from(campaigns);
  slug = nextAvailableCode(
    slug,
    existing.map((r) => r.slug),
  );
  code = nextAvailableCode(
    code,
    existing.map((r) => r.code),
  );

  const [created] = await db
    .insert(campaigns)
    .values({
      slug,
      title: parsed.data.title,
      status: "IDEA",
      pillar: parsed.data.pillar,
      objective: parsed.data.objective,
      ownerId: user.id,
      audienceId: parsed.data.audienceId ?? null,
      signalId: parsed.data.signalId ?? null,
      campaignCode: code,
    })
    .returning();

  await db.insert(auditEvents).values({
    action: "CAMPAIGN_CREATED",
    actorId: user.id,
    subjectType: "Campaign",
    subjectId: created.id,
    campaignId: created.id,
    summary: `${user.name} created the campaign "${created.title}".`,
    detail: { campaignCode: created.campaignCode },
  });

  revalidatePath("/campaigns");
  revalidatePath("/");
  redirect(`/campaigns/${created.slug}/brief`);
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

/**
 * Changes what a campaign is about.
 *
 * The slug and the campaign code are not editable, on purpose. The code is in
 * every link already posted; changing it would orphan the results of anything
 * published so far. A campaign that needs a different code is a different
 * campaign.
 */
export async function updateCampaign(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const slug = String(formData.get("slug") ?? "");
  const row = await loadCampaignBySlug(slug);
  if (!row) return { message: "That campaign no longer exists." };

  const parsed = newCampaignSchema.safeParse(
    readForm(formData, ["title", "pillar", "objective", "audienceId", "signalId"]),
  );
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const db = getDb();
  await db
    .update(campaigns)
    .set({
      title: parsed.data.title,
      pillar: parsed.data.pillar,
      objective: parsed.data.objective,
      audienceId: parsed.data.audienceId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, row.campaign.id));

  await db.insert(auditEvents).values({
    action: "CAMPAIGN_TRANSITIONED",
    actorId: user.id,
    subjectType: "Campaign",
    subjectId: row.campaign.id,
    campaignId: row.campaign.id,
    summary: `${user.name} edited "${row.campaign.title}".`,
    detail:
      row.campaign.title === parsed.data.title
        ? null
        : { titleWas: row.campaign.title, titleIs: parsed.data.title },
  });

  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/campaigns");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Archiving, not deleting.
 *
 * A campaign carries its own history: who approved what, what went out, and
 * what it brought in. Deleting the row would take that with it, including the
 * record of anything already published. Archived campaigns leave the board and
 * can be brought back.
 */
export async function archiveCampaign(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const slug = String(formData.get("slug") ?? "");
  const restore = String(formData.get("restore") ?? "") === "true";

  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .limit(1);

  if (!campaign) return { message: "That campaign no longer exists." };

  await db
    .update(campaigns)
    .set({
      archivedAt: restore ? null : new Date(),
      status: restore ? campaign.status : "ARCHIVED",
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaign.id));

  await db.insert(auditEvents).values({
    action: restore ? "CAMPAIGN_TRANSITIONED" : "CAMPAIGN_ARCHIVED",
    actorId: user.id,
    subjectType: "Campaign",
    subjectId: campaign.id,
    campaignId: campaign.id,
    summary: restore
      ? `${user.name} brought "${campaign.title}" back from the archive.`
      : `${user.name} archived "${campaign.title}".`,
  });

  revalidatePath("/campaigns");
  revalidatePath("/");

  if (restore) {
    revalidatePath(`/campaigns/${slug}`);
    return { ok: true };
  }
  redirect("/campaigns");
}

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------

export async function saveBrief(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const slug = String(formData.get("slug") ?? "");
  const row = await loadCampaignBySlug(slug);
  if (!row) return { message: "That campaign no longer exists." };

  const parsed = briefSchema.safeParse(
    readForm(formData, [
      "problem",
      "desiredOutcome",
      "promise",
      "proof",
      "offer",
      "primaryCta",
      "ctaPath",
      "productContext",
    ]),
  );
  if (!parsed.success) return { errors: firstErrors(parsed.error) };

  const db = getDb();

  // The link is built here, tagged with this campaign, rather than typed by
  // hand. That is what keeps the results from landing on the wrong campaign.
  const ctaUrl = buildTaggedUrl({
    siteUrl: getEnv().PUBLIC_SITE_URL,
    path: parsed.data.ctaPath,
    channel: "BLOG",
    campaignCode: row.campaign.campaignCode,
  });

  const values = {
    campaignId: row.campaign.id,
    problem: parsed.data.problem,
    desiredOutcome: parsed.data.desiredOutcome,
    promise: parsed.data.promise,
    proof: parsed.data.proof,
    offer: parsed.data.offer,
    primaryCta: parsed.data.primaryCta,
    ctaUrl,
    productContext: parsed.data.productContext ?? null,
  };

  await db
    .insert(campaignBriefs)
    .values(values)
    .onConflictDoUpdate({
      target: campaignBriefs.campaignId,
      set: { ...values, updatedAt: new Date() },
    });

  await db.insert(auditEvents).values({
    action: "CAMPAIGN_TRANSITIONED",
    actorId: user.id,
    subjectType: "CampaignBrief",
    subjectId: row.campaign.id,
    campaignId: row.campaign.id,
    summary: `${user.name} saved the brief for "${row.campaign.title}".`,
  });

  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/** Which capability each destination needs. Approving is not publishing. */
const CAPABILITY_FOR: Partial<
  Record<CampaignStatus, "campaign:edit" | "campaign:approve" | "campaign:schedule">
> = {
  BRIEF: "campaign:edit",
  DRAFT: "campaign:edit",
  NEEDS_ASSET: "campaign:edit",
  IN_REVIEW: "campaign:edit",
  APPROVED: "campaign:approve",
  REJECTED: "campaign:approve",
  SCHEDULED: "campaign:schedule",
  PUBLISHING: "campaign:schedule",
  PUBLISHED: "campaign:schedule",
  CANCELLED: "campaign:edit",
  ARCHIVED: "campaign:edit",
};

export async function transitionCampaign(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const slug = String(formData.get("slug") ?? "");
  const to = String(formData.get("to") ?? "") as CampaignStatus;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  const capability = CAPABILITY_FOR[to] ?? "campaign:edit";

  let user;
  try {
    user = await requireCapability(capability);
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const row = await loadCampaignBySlug(slug);
  if (!row) return { message: "That campaign no longer exists." };

  // The server decides. A button in the browser is a suggestion, not authority.
  const verdict = evaluateTransition(row.campaign.status, to, row.readiness);
  if (!verdict.allowed) {
    return { message: verdict.reasons.join(" ") };
  }

  const db = getDb();
  const from = row.campaign.status;

  await db
    .update(campaigns)
    .set({ status: to, updatedAt: new Date() })
    .where(eq(campaigns.id, row.campaign.id));

  await db.insert(campaignTransitions).values({
    campaignId: row.campaign.id,
    fromStatus: from,
    toStatus: to,
    actorId: user.id,
    reason,
  });

  await db.insert(auditEvents).values({
    action: to === "ARCHIVED" ? "CAMPAIGN_ARCHIVED" : "CAMPAIGN_TRANSITIONED",
    actorId: user.id,
    subjectType: "Campaign",
    subjectId: row.campaign.id,
    campaignId: row.campaign.id,
    summary: `${user.name} moved "${row.campaign.title}" from ${from} to ${to}.`,
    detail: reason ? { reason } : null,
  });

  revalidatePath(`/campaigns/${slug}`);
  revalidatePath("/campaigns");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Verwijdert een campagne waar nooit iets van naar buiten is gegaan.
 *
 * Bedoeld voor proefcampagnes. De regel dat er niets hard verwijderd wordt gaat
 * over het dossier van wat er gepost is; die controle staat in `canDelete` en
 * gebeurt hier op de server, niet in het formulier. De auditregels blijven
 * staan: hun verwijzing naar de campagne wordt leeg, hun beschrijving niet.
 */
export async function deleteCampaign(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const slug = String(formData.get("slug") ?? "");
  const typedTitle = String(formData.get("confirm") ?? "");

  const db = getDb();
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .limit(1);

  if (!campaign) return { message: "Die campagne bestaat niet meer." };

  const attempts = await db
    .select({ id: publicationAttempts.id })
    .from(publicationAttempts)
    .innerJoin(
      channelVariants,
      eq(channelVariants.id, publicationAttempts.variantId),
    )
    .where(eq(channelVariants.campaignId, campaign.id))
    .limit(1);

  const verdict = canDeleteCampaign({
    status: campaign.status,
    hasPublications: attempts.length > 0,
    typedTitle,
    title: campaign.title,
  });

  if (!verdict.allowed) return { message: verdict.reason };

  // Eerst het spoor, dan pas de rij. Andersom zou de regel zelf meegaan.
  await db.insert(auditEvents).values({
    action: "DATA_DELETED",
    actorId: user.id,
    subjectType: "Campaign",
    subjectId: campaign.id,
    summary: `${user.name} verwijderde de campagne ${campaign.title} (${campaign.campaignCode}). Er was nooit iets van gepost.`,
    detail: { campaignCode: campaign.campaignCode, status: campaign.status },
  });

  await db.delete(campaigns).where(eq(campaigns.id, campaign.id));

  revalidatePath("/campaigns");
  revalidatePath("/calendar");
  revalidatePath("/review");
  redirect("/campaigns");
}
