"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { auditEvents, videoProjects } from "@/db/schema";
import { NotAuthorisedError, requireCapability } from "@/lib/auth";
import type { FormState } from "@/lib/campaign/actions";
import { loadCampaignBySlug } from "@/lib/campaign/queries";
import type { Clip, Project } from "./project";

export interface SavedVideo {
  id: string;
  name: string;
  ratio: string;
  totalSeconds: number;
  clipCount: number;
  pendingMediaCount: number;
  updatedAt: string;
}

/** Footage is not stored yet, so it is stripped rather than saved half-broken. */
function stripMedia(clips: Clip[]): { clips: Clip[]; pending: number } {
  let pending = 0;
  const stripped = clips.map((c) => {
    if (!c.media) return c;
    pending += 1;
    return {
      ...c,
      media: undefined,
      theme: c.theme === "media" ? ("ink" as const) : c.theme,
      note:
        c.note ??
        `This clip had footage called ${c.media.name}. Attach it again after opening.`,
    };
  });
  return { clips: stripped, pending };
}

export async function saveVideoProject(
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
  const name = String(formData.get("name") ?? "").trim();
  const raw = String(formData.get("project") ?? "");
  const existingId = String(formData.get("id") ?? "").trim();

  if (name.length < 2) {
    return { errors: { name: "Give it a name you would recognise in a list." } };
  }

  let project: Project;
  try {
    project = JSON.parse(raw) as Project;
  } catch {
    return { message: "The editor sent something unreadable. Try saving again." };
  }
  if (!Array.isArray(project.clips) || project.clips.length === 0) {
    return { message: "There are no clips to save." };
  }

  const row = await loadCampaignBySlug(slug);
  if (!row) return { message: "That campaign no longer exists." };

  const { clips, pending } = stripMedia(project.clips);
  const seconds =
    Math.round(clips.reduce((sum, c) => sum + (c.seconds ?? 0), 0) * 10) / 10;

  const db = getDb();
  const values = {
    campaignId: row.campaign.id,
    name,
    ratio: project.ratio,
    showMark: project.showMark,
    clips,
    totalSeconds: seconds,
    pendingMediaCount: pending,
    createdById: user.id,
  };

  if (existingId) {
    await db
      .update(videoProjects)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(videoProjects.id, existingId));
  } else {
    await db
      .insert(videoProjects)
      .values(values)
      .onConflictDoUpdate({
        target: [videoProjects.campaignId, videoProjects.name],
        set: { ...values, updatedAt: new Date() },
      });
  }

  await db.insert(auditEvents).values({
    action: "ASSET_UPLOADED",
    actorId: user.id,
    subjectType: "VideoProject",
    subjectId: existingId || null,
    campaignId: row.campaign.id,
    summary: `${user.name} saved the video "${name}".`,
    detail: { clips: clips.length, seconds, pendingMediaCount: pending },
  });

  revalidatePath(`/campaigns/${slug}/video`);
  return { ok: true };
}

export async function deleteVideoProject(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireCapability("campaign:edit");
  } catch (error) {
    if (error instanceof NotAuthorisedError) return { message: error.message };
    throw error;
  }

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!id) return { message: "Nothing to remove." };

  // Archived, not deleted. Nothing in this system is hard-deleted.
  await getDb()
    .update(videoProjects)
    .set({ archivedAt: new Date() })
    .where(eq(videoProjects.id, id));

  revalidatePath(`/campaigns/${slug}/video`);
  return { ok: true };
}

export async function listVideoProjects(campaignId: string): Promise<SavedVideo[]> {
  const rows = await getDb()
    .select()
    .from(videoProjects)
    .where(
      and(eq(videoProjects.campaignId, campaignId), isNull(videoProjects.archivedAt)),
    )
    .orderBy(desc(videoProjects.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ratio: r.ratio,
    totalSeconds: r.totalSeconds,
    clipCount: Array.isArray(r.clips) ? (r.clips as unknown[]).length : 0,
    pendingMediaCount: r.pendingMediaCount,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function loadVideoProject(id: string): Promise<Project | null> {
  const [row] = await getDb()
    .select()
    .from(videoProjects)
    .where(eq(videoProjects.id, id))
    .limit(1);

  if (!row) return null;
  return {
    ratio: row.ratio as Project["ratio"],
    showMark: row.showMark,
    clips: row.clips as Clip[],
  };
}
