/**
 * Wat werkt.
 *
 * Het scherm dat een marketingtool onderscheidt van een agenda. De rest van de
 * Studio houdt bij wát je deed; hier staat wat je ervan moet leren.
 *
 * De regel die dit scherm draagt: liever niets zeggen dan iets verzinnen. Met
 * vier posts is elk verschil ruis, en een tool die dan toch een patroon roept
 * stuurt je twintig video's de verkeerde kant op voordat je het merkt. Dus zegt
 * hij hoeveel posts er nog nodig zijn, in plaats van een conclusie te bedenken.
 */

import { Card } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { best, findings, nextMove } from "@/lib/learn/analyse";
import type { PostWithCampaign } from "@/lib/learn/queries";
import { loadPosts } from "@/lib/learn/queries";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  duidelijk: "bg-teal-wash text-teal-deep",
  aanwijzing: "bg-amber-wash text-amber",
  "te vroeg": "bg-paper text-ink-faint",
};

function count(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("nl-NL");
}

export default async function LearnPage() {
  await requireUser();

  const posts = await loadPosts();
  const results = findings(posts);
  const top = best(posts) as PostWithCampaign[];
  const measured = posts.filter((p) => p.views !== null).length;

  return (
    <>
      <h1 className="text-3xl font-bold">Wat werkt</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Wat je posts je vertellen, en wat er nog niet uit te halen valt. Elke
        uitspraak hieronder komt uit je eigen cijfers — er wordt niets geraden.
      </p>

      <Card className="mt-6">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          Wat nu te doen
        </h2>
        <p className="mt-2 text-lg">{nextMove(posts)}</p>
        <p className="mt-3 text-xs text-ink-faint">
          {posts.length} {posts.length === 1 ? "post" : "posts"} geplaatst,{" "}
          {measured} met cijfers.
        </p>
      </Card>

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-lg font-semibold">
        De vragen
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {results.map((finding) => (
          <Card key={finding.question}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium">{finding.question}</h3>
              <span
                className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-medium ${TONE[finding.confidence]}`}
              >
                {finding.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">{finding.verdict}</p>
            <p className="mt-2 text-xs text-ink-faint">
              {finding.sample[0]} tegen {finding.sample[1]} posts
            </p>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 font-[family-name:var(--font-display)] text-lg font-semibold">
        Best gelopen
      </h2>

      {top.length === 0 ? (
        <Card className="mt-3">
          <p className="text-sm text-ink-muted">
            Nog geen cijfers. Zodra TikTok gekoppeld is komen ze elke nacht
            binnen, en staat hier welke video het beste liep.
          </p>
        </Card>
      ) : (
        <ul className="mt-3 space-y-2">
          {top.map((post, index) => (
            <li key={post.variantId}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-faint">
                      #{index + 1} · {post.campaignTitle} · {post.channel}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">
                      {post.body.split("\n")[0] || "Zonder bijschrift"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-[family-name:var(--font-mono)] text-lg">
                      {count(post.views)}
                    </p>
                    <p className="text-xs text-ink-faint">weergaven</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
