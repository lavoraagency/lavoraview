// Page-view tracker — fires once per real page mount (see the useEffect in
// link-page-render.tsx). Does two things:
//   1. Bumps link_pages.view_count — the cheap lifetime total shown as
//      "Total Views" in the per-page analytics view.
//   2. Inserts a timestamped row into link_page_views — lets us break views
//      down per day (see link_page_views_daily_by_page), the same way
//      link_clicks already does for button clicks.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const { link_page_id } = body || {};
  if (!link_page_id) return NextResponse.json({ ok: false }, { status: 200 });

  try {
    const supabase = createServiceClient();
    // Read-then-update is fine for a low-write counter; race condition acceptable.
    const { data } = await supabase
      .from("link_pages")
      .select("view_count")
      .eq("id", link_page_id)
      .maybeSingle();
    const next = (data?.view_count || 0) + 1;
    await Promise.all([
      supabase.from("link_pages").update({ view_count: next }).eq("id", link_page_id),
      supabase.from("link_page_views").insert({ link_page_id }),
    ]);
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true }, { status: 200 });
}
