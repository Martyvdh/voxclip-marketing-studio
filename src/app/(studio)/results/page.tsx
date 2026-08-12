import { Card, EmptyState } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { listResults } from "@/lib/metrics/actions";
import { ImportExport, LogResult } from "./results-client";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  await requireUser();
  const results = await listResults();

  const perChannel = new Map<
    string,
    { views: number; likes: number; comments: number; downloads: number; posts: number }
  >();

  for (const r of results) {
    const t = perChannel.get(r.channel) ?? {
      views: 0,
      likes: 0,
      comments: 0,
      downloads: 0,
      posts: 0,
    };
    t.views += r.views;
    t.likes += r.likes;
    t.comments += r.comments;
    t.downloads += r.downloads;
    t.posts += 1;
    perChannel.set(r.channel, t);
  }

  return (
    <>
      <h1 className="text-3xl font-bold">Results</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Numbers you logged yourself, per post. Nothing here is read from a
        connected account, because nothing is connected yet, and a figure whose
        source you cannot name is worse than no figure.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <section aria-labelledby="totals-heading">
            <h2 id="totals-heading" className="mb-3 text-lg font-semibold">
              Per channel
            </h2>
            {perChannel.size === 0 ? (
              <EmptyState
                title="Nothing logged yet"
                detail="Post something, read the numbers off the platform a few days later, and log them here. Two weeks of that beats any dashboard nobody trusts."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...perChannel.entries()].map(([channel, t]) => (
                  <Card key={channel} className="py-4">
                    <p className="font-[family-name:var(--font-display)] font-semibold">
                      {channel.replace(/_/g, " ")}
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {(
                        [
                          ["Views", t.views],
                          ["Likes", t.likes],
                          ["Comments", t.comments],
                          ["Downloads", t.downloads],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="text-ink-muted">{label}</dt>
                          <dd className="font-[family-name:var(--font-mono)]">
                            {value.toLocaleString("nl-NL")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-xs text-ink-faint">
                      {t.posts} {t.posts === 1 ? "post" : "posts"} · entered by hand
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {results.length > 0 ? (
            <section className="mt-8" aria-labelledby="log-heading">
              <h2 id="log-heading" className="mb-3 text-lg font-semibold">
                Everything logged
              </h2>
              <table className="w-full border-separate border-spacing-y-1 text-left text-sm">
                <caption className="sr-only">Logged results, newest first</caption>
                <thead className="text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th scope="col" className="px-3 pb-1 font-medium">Date</th>
                    <th scope="col" className="px-3 pb-1 font-medium">Channel</th>
                    <th scope="col" className="px-3 pb-1 font-medium">Post</th>
                    <th scope="col" className="px-3 pb-1 text-right font-medium">Views</th>
                    <th scope="col" className="px-3 pb-1 text-right font-medium">Likes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.key} className="bg-surface">
                      <td className="rounded-l-lg border-y border-l border-line px-3 py-2 font-[family-name:var(--font-mono)] text-xs">
                        {r.date}
                      </td>
                      <td className="border-y border-line px-3 py-2 text-ink-muted">
                        {r.channel.replace(/_/g, " ")}
                      </td>
                      <td className="border-y border-line px-3 py-2">{r.label}</td>
                      <td className="border-y border-line px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                        {r.views.toLocaleString("nl-NL")}
                      </td>
                      <td className="rounded-r-lg border-y border-r border-line px-3 py-2 text-right font-[family-name:var(--font-mono)]">
                        {r.likes.toLocaleString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>

        <div>
          <LogResult />
          <ImportExport results={results} />
        </div>
      </div>
    </>
  );
}
