import { Card, EmptyState } from "@/components/brand";
import { can, requireUser } from "@/lib/auth";
import { campaignOptions, currentProductVersion } from "@/lib/assets/actions";
import { loadAssets } from "@/lib/assets/queries";
import { AssetCard, UploadForm } from "./assets-client";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await requireUser();
  const currentVersion = await currentProductVersion();

  const [library, campaigns] = await Promise.all([
    loadAssets(currentVersion),
    campaignOptions(),
  ]);

  const canEdit = can(user.role, "asset:upload");
  const canApprove = can(user.role, "campaign:approve");
  const stale = library.filter((asset) => asset.stale);

  return (
    <>
      <h1 className="text-3xl font-bold">Assets</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Real captures of the shipping app, and everything else that goes out
        with the words. Each one carries what it shows, which version it shows,
        and whether anyone has approved it for use.
      </p>

      {currentVersion ? (
        <p className="mt-3 font-[family-name:var(--font-mono)] text-sm text-ink-muted">
          Current app version: {currentVersion}
          {stale.length > 0 ? ` · ${stale.length} capture(s) show an older one` : ""}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">
          Product Truth has no app version recorded, so nothing here can be
          checked against one. That is deliberate: the version is not guessed.
        </p>
      )}

      {canEdit ? (
        <div className="mt-6">
          <UploadForm campaigns={campaigns} currentVersion={currentVersion} />
        </div>
      ) : null}

      <div className="mt-8">
        {library.length === 0 ? (
          <EmptyState
            title="Nothing stored yet"
            detail="A screenshot of the real app beats a mockup every time, and the brand rules say so out loud. Add one and it becomes available to every campaign."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {library.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                canApprove={canApprove}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-8">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold">
          One rule worth repeating
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          A generated image may never stand in for the product. Designed graphics
          are fine as long as they are not pretending to be a screenshot. The
          upload form refuses the combination rather than leaving it to
          judgement on a busy day.
        </p>
      </Card>
    </>
  );
}
