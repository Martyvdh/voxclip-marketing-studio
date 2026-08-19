/**
 * Stap twee: terug van TikTok.
 *
 * De code wordt hier ingewisseld voor tokens en die gaan versleuteld de database
 * in. De code zelf is eenmalig en komt nooit in een log terecht.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireCapability } from "@/lib/auth";
import { exchangeCode } from "@/lib/tiktok/api";
import { saveConnection } from "@/lib/tiktok/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireCapability("connection:manage");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = (await cookies()).get("tiktok_state")?.value;

  const back = (message: string) =>
    NextResponse.redirect(new URL(`/channels?tiktok=${encodeURIComponent(message)}`, request.url));

  if (url.searchParams.get("error")) {
    return back("Je hebt de koppeling afgebroken. Er is niets veranderd.");
  }
  if (!code || !state || !expected || state !== expected) {
    // Geen details: bij een mislukte controle weet je niet wie er aan de andere
    // kant zat, en dan help je die niet verder.
    return back("De koppeling kon niet worden gecontroleerd. Probeer het opnieuw.");
  }

  try {
    const redirectUri = new URL("/api/tiktok/callback", request.url).toString();
    const tokens = await exchangeCode(code, redirectUri);
    await saveConnection(tokens, "TikTok");
    return back("Verbonden. De cijfers worden vannacht voor het eerst opgehaald.");
  } catch (error) {
    console.error("TikTok-koppeling mislukt:", error);
    return back("TikTok gaf een fout terug. Probeer het opnieuw.");
  }
}
