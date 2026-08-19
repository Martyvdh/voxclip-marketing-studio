import Link from "next/link";

import { getDb } from "@/db";
import { channelConnections } from "@/db/schema";
import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { isConfigured } from "@/lib/tiktok/api";
import { connectionState } from "@/lib/tiktok/store";

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
  const tiktok = await connectionState();
  const tiktokReady = isConfigured();

  return (
    <>
      <h1 className="text-3xl font-bold">Channels</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        You post by hand for now. The Studio writes it, checks it, and hands it
        over ready to paste.
      </p>

      {/*
        De koppeling met TikTok. Alleen lezen: dit haalt de cijfers op van wat
        je zelf hebt geplaatst en plaatst zelf niets. Dat staat er ook zo, want
        "verbind je account" leest anders als "hij gaat nu voor mij posten".
      */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-md">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
              TikTok-cijfers ophalen
            </h2>
            {tiktok.connected ? (
              <p className="mt-1 text-sm text-ink-muted">
                Verbonden. Elke nacht om vier uur worden de views, likes,
                reacties en shares opgehaald van elke post waar je de link bij
                hebt geplakt. Je hoeft niets meer over te tikken.
              </p>
            ) : tiktokReady ? (
              <p className="mt-1 text-sm text-ink-muted">
                Eén keer verbinden en de cijfers komen vanzelf binnen. Dit leest
                alleen; er wordt niets geplaatst — dat blijf jij zelf doen.
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                Nog niet ingesteld. Maak een app aan op developers.tiktok.com met
                de scopes <code>user.info.basic</code> en <code>video.list</code>,
                en zet <code>TIKTOK_CLIENT_KEY</code> en{" "}
                <code>TIKTOK_CLIENT_SECRET</code> in je omgevingsvariabelen.
              </p>
            )}
          </div>

          {tiktokReady ? (
            <a
              href="/api/tiktok/connect"
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                tiktok.connected
                  ? "border border-line hover:border-ink"
                  : "bg-ink text-paper hover:opacity-90"
              }`}
            >
              {tiktok.connected ? "Opnieuw verbinden" : "Verbind TikTok"}
            </a>
          ) : null}
        </div>
      </Card>

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
