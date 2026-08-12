import Link from "next/link";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { audiences as audiencesTable } from "@/db/schema";
import { requireUser, can } from "@/lib/auth";
import { NewCampaignForm } from "./new-campaign-form";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await requireUser();

  if (!can(user.role, "campaign:create")) {
    return (
      <>
        <h1 className="text-3xl font-bold">New campaign</h1>
        <p className="mt-4 text-ink-muted">
          Your role is {user.role}, which can read campaigns but not create them.
          Ask an admin if that should change.
        </p>
      </>
    );
  }

  const rows = await getDb()
    .select({ id: audiencesTable.id, name: audiencesTable.name })
    .from(audiencesTable)
    .where(eq(audiencesTable.isActive, true));

  return (
    <>
      <Link href="/campaigns" className="text-sm text-ink-muted hover:underline">
        Back to campaigns
      </Link>

      <h1 className="mt-3 text-3xl font-bold">New campaign</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        A campaign starts as an idea. It cannot move to a brief until it has an
        objective and an audience, and it cannot be reviewed until its copy passes
        the quality gate. That order is the point of the system.
      </p>

      <NewCampaignForm
        audiences={rows.map((a) => ({ value: a.id, label: a.name }))}
      />
    </>
  );
}
