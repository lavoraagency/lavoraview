// Page-view counter — increments link_pages.view_count once per page mount.

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
    await supabase.from("link_pages").update({ view_count: next }).eq("id", link_page_id);
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true }, { status: 200 });
}
