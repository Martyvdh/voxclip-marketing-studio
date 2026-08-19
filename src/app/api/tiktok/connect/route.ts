/**
 * Stap één van de koppeling: naar TikTok toe.
 *
 * De `state` gaat mee en wordt in een httpOnly-cookie gezet. Bij terugkomst
 * moeten die twee gelijk zijn. Zonder die controle kan iemand jou een link
 * sturen die jouw Studio aan zíjn TikTok-account hangt.
 */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { requireCapability } from "@/lib/auth";
import { authorizeUrl, isConfigured } from "@/lib/tiktok/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireCapability("connection:manage");

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "TikTok is nog niet ingesteld. Zet TIKTOK_CLIENT_KEY en TIKTOK_CLIENT_SECRET in je omgevingsvariabelen.",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("base64url");
  const redirectUri = new URL("/api/tiktok/callback", request.url).toString();

  const response = NextResponse.redirect(authorizeUrl(redirectUri, state));
  response.cookies.set("tiktok_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
