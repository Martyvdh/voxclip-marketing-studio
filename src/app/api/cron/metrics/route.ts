/**
 * De nachtelijke ronde.
 *
 * Draait via Vercel Cron; zie vercel.json. Beveiligd met een geheim, want een
 * open eindpunt dat de API van TikTok aanroept is een manier om je eigen
 * verzoeklimiet op te laten branden door een vreemde.
 */

import { NextResponse } from "next/server";

import { syncMetrics } from "@/lib/tiktok/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Niet toegestaan." }, { status: 401 });
  }

  try {
    const summary = await syncMetrics();
    console.log("Cijfers opgehaald:", summary);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Ophalen van cijfers mislukt:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
