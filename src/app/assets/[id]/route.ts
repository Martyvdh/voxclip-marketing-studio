import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { assetBlobs, assets } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Serves one file.
 *
 * Behind the session, deliberately. Unapproved captures, drafts of rendered
 * videos, and anything filed against an unpublished campaign live here, and
 * none of it should be readable by anyone who guesses an id. The cache header
 * is private for the same reason.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [row] = await db
    .select({
      mimeType: assets.mimeType,
      byteSize: assets.byteSize,
      bytes: assetBlobs.bytes,
    })
    .from(assets)
    .innerJoin(assetBlobs, eq(assetBlobs.assetId, assets.id))
    .where(eq(assets.id, id))
    .limit(1);

  if (!row) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(row.byteSize),
      "Cache-Control": "private, max-age=3600",
      // The library holds files people upload. Rendering one as a document in
      // this origin would let an SVG run script against the session.
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
