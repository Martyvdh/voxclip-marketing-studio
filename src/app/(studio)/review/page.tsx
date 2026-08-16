import { Card, EmptyState } from "@/components/brand";
import { can, requireUser } from "@/lib/auth";
import { loadReviewQueue } from "@/lib/review/queries";
import { ReviewCard } from "./review-client";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await requireUser();
  const queue = await loadReviewQueue(user.id);
  const canApproveByRole = can(user.role, "campaign:approve");

  const waiting = queue.filter((item) => item.status === "IN_REVIEW");
  const backWithAuthor = queue.filter(
    (item) => item.status === "CHANGES_REQUESTED",
  );

  return (
    <>
      <h1 className="text-3xl font-bold">Review</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Everything waiting on a person, oldest first. An approval binds to the
        exact version on screen, so a rewrite afterwards needs reading again. No
        one approves their own campaign.
      </p>

      {/*
        A review is reading. The column stays at a readable measure rather than
        stretching a paragraph across the whole page.
      */}
      <div className="max-w-3xl">
      {queue.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing waiting"
            detail="Send a variant for review from its campaign and it lands here, with what the quality gate found and the version before it."
          />
        </div>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="waiting-heading">
            <h2 id="waiting-heading" className="mb-3 text-lg font-semibold">
              Waiting on a decision
            </h2>
            {waiting.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Nothing to decide right now.
              </p>
            ) : (
              <div className="space-y-4">
                {waiting.map((item) => (
                  <ReviewCard
                    key={item.variantId}
                    item={item}
                    canApproveByRole={canApproveByRole}
                  />
                ))}
              </div>
            )}
          </section>

          {backWithAuthor.length > 0 ? (
            <section className="mt-10" aria-labelledby="back-heading">
              <h2 id="back-heading" className="mb-3 text-lg font-semibold">
                Back with the author
              </h2>
              <p className="mb-3 max-w-2xl text-sm text-ink-muted">
                Someone asked for a change. Revise it and it goes back into the
                queue.
              </p>
              <div className="space-y-4">
                {backWithAuthor.map((item) => (
                  <ReviewCard
                    key={item.variantId}
                    item={item}
                    canApproveByRole={canApproveByRole}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {!canApproveByRole ? (
        <Card className="mt-8 max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
            Your role
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            You can read the queue and revise your own work. Approving is a
            reviewer or admin job, on purpose: the person who wrote it is not the
            person who signs it off.
          </p>
        </Card>
      ) : null}
      </div>
    </>
  );
}
