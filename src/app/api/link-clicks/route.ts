// Fire-and-forget click tracker.
// The public page POSTs (or sendBeacons) here on every button click.
// We never block the navigation — even if the insert fails we silently swallow.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 200 }); }
  const { link_page_id, block_id, url, user_agent, is_iab, iab_app } = body || {};
  if (!link_page_id || !block_id) {
    return NextResponse.json({ ok: false, reason: "missing fields" }, { status: 200 });
  }

  // Vercel passes geo in headers (production only) — best-effort.
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    null;

  try {
    const supabase = createServiceClient();
    await supabase.from("link_clicks").insert({
      link_page_id,
      block_id,
      url: typeof url === "string" ? url.slice(0, 2048) : null,
      user_agent: typeof user_agent === "string" ? user_agent.slice(0, 512) : null,
      country,
      is_iab: !!is_iab,
      iab_app: typeof iab_app === "string" ? iab_app.slice(0, 32) : null,
    });
  } catch { /* never let analytics crash the page */ }

  return NextResponse.json({ ok: true }, { status: 200 });
}
