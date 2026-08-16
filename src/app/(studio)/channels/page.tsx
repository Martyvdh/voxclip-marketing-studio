import Link from "next/link";

import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * The honest capability matrix.
 *
 * A channel is not "connected" because we can read its metrics. Each row says
 * exactly what this system can and cannot do there today.
 */
const TIERS: {
  tier: "A" | "B" | "C";
  summary: string;
  channels: string[];
}[] = [
  {
    tier: "A",
    summary:
      "Where the vertical demos and the long-form writing go. Most of your week lands here.",
    channels: [
      "TikTok",
      "Instagram Reels",
      "YouTube Shorts",
      "LinkedIn",
      "Blog and Learn",
      "Email",
    ],
  },
  {
    tier: "B",
    summary: "Worth posting to, less often. Same handoff, shorter copy.",
    channels: ["X", "Threads", "Facebook", "YouTube long-form"],
  },
  {
    tier: "C",
    summary:
      "Communities with their own rules. The handoff includes those rules, because getting them wrong costs more here than anywhere else.",
    channels: ["Reddit", "Product Hunt", "Hacker News", "Directories"],
  },
];

export default async function ChannelsPage() {
  await requireUser();
  const db = getDb();

  const connections = await db.select().from(channelConnections);

  return (
    <>
      <h1 className="text-3xl font-bold">Channels</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        You post by hand for now. The Studio writes it, checks it, and hands it
        over ready to paste.
      </p>

      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Start from a campaign
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pick a variant and you get the caption, the tagged link, and a
              checklist for that platform, with a copy button on each.
            </p>
          </div>
          <Link
            href="/campaigns"
            className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white"
          >
            Open campaigns
          </Link>
        </div>
      </Card>

      <p className="mt-4 text-sm text-ink-muted">
        {connections.length === 0
          ? "No account is connected, so nothing posts by itself. That needs approved API access from each platform, which is an application with a review, not a setting."
          : `${connections.length} connection(s) on file, ${connections.filter((c) => c.isFake).length} of them still fakes that post nothing.`}
      </p>

      <div className="mt-8 space-y-4">
        {TIERS.map((tier) => (
          <Card key={tier.tier}>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              {tier.tier === "A" ? "Where the work goes" : tier.tier === "B" ? "Now and then" : "Read the room first"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{tier.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {tier.channels.map((channel) => (
                <li
                  key={channel}
                  className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-muted"
                >
                  {channel}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
