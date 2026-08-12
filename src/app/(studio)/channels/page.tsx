import { getDb } from "@/db";
import { channelCapabilities, channelConnections } from "@/db/schema";
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
      "Intended to carry the full workflow: draft, preview, schedule, publish, and read metrics.",
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
    summary: "Partial. Some steps work, others stay manual.",
    channels: ["X", "Threads", "Facebook", "YouTube long-form"],
  },
  {
    tier: "C",
    summary:
      "Manual by design. The Studio produces a complete handoff package with the final copy, asset, alt text, tags, link, and a checklist. It never pretends to publish.",
    channels: ["Reddit", "Product Hunt", "Hacker News", "Directories"],
  },
];

export default async function ChannelsPage() {
  await requireUser();
  const db = getDb();

  const connections = await db.select().from(channelConnections);
  const capabilities = await db.select().from(channelCapabilities);

  return (
    <>
      <h1 className="text-3xl font-bold">Channels</h1>
      <p className="mt-2 text-ink-muted">
        What this system can actually do on each channel today. Nothing here is
        labelled connected until an official integration exists and a real
        payload has been previewed.
      </p>

      <div
        role="status"
        className="mt-6 rounded-xl border border-line bg-amber-wash p-5"
      >
        <p className="font-[family-name:var(--font-display)] font-semibold text-amber">
          No provider is connected
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {connections.length === 0
            ? "There are no channel connections yet. Every adapter is a fake that records the payload and posts nothing."
            : `${connections.length} connection(s) exist and ${connections.filter((c) => c.isFake).length} of them are fakes.`}{" "}
          Real publishing needs official API access, a feature flag, and an
          operator confirming the exact payload. Until then every channel has a
          handoff package: open a campaign, pick a variant, and everything is laid
          out ready to paste, with the link tagged and a place to record where you
          posted it.
        </p>
      </div>

      {capabilities.length > 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          {capabilities.length} capability records are on file.
        </p>
      ) : null}

      <div className="mt-8 space-y-4">
        {TIERS.map((tier) => (
          <Card key={tier.tier}>
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              Tier {tier.tier}
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
