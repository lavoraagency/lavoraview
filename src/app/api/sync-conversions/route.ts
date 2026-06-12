import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/sync-conversions
// Accepts array of { username, date, link_clicks, new_subs }
// Matches username to profile_id (IG) or facebook_profile_id (FB) and upserts into conversion_snapshots
//
// n8n should POST to this endpoint with the Authorization header:
// Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>

export async function POST(req: NextRequest) {
  // Simple auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const records: { username: string; date: string; link_clicks: number; new_subs: number }[] = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Expected non-empty array" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch all IG profiles (active only) and FB profiles in parallel
    const [{ data: igProfiles, error: igError }, { data: fbProfiles, error: fbError }] = await Promise.all([
      supabase.from("profiles").select("id, instagram_username").eq("is_active", true),
      supabase.from("facebook_profiles").select("id, name"),
    ]);

    if (igError) throw igError;
    if (fbError) throw fbError;

    const igUsernameToId: Record<string, string> = {};
    for (const p of igProfiles || []) {
      igUsernameToId[p.instagram_username.toLowerCase()] = p.id;
    }

    const fbNameToId: Record<string, string> = {};
    for (const p of fbProfiles || []) {
      fbNameToId[p.name.toLowerCase()] = p.id;
    }

    const igRows: { profile_id: string; date: string; link_clicks: number; new_subs: number }[] = [];
    const fbRows: { facebook_profile_id: string; date: string; link_clicks: number; new_subs: number }[] = [];
    const skipped: string[] = [];

    for (const r of records) {
      if (!r.date || r.date === "Start" || r.date === "Week ⬆") continue;

      const igId = igUsernameToId[r.username.toLowerCase()];
      if (igId) {
        igRows.push({
          profile_id: igId,
          date: r.date,
          link_clicks: Number(r.link_clicks) || 0,
          new_subs: Number(r.new_subs) || 0,
        });
        continue;
      }

      const fbId = fbNameToId[r.username.toLowerCase()];
      if (fbId) {
        fbRows.push({
          facebook_profile_id: fbId,
          date: r.date,
          link_clicks: Number(r.link_clicks) || 0,
          new_subs: Number(r.new_subs) || 0,
        });
        continue;
      }

      skipped.push(r.username);
    }

    if (igRows.length > 0) {
      const { error } = await supabase
        .from("conversion_snapshots")
        .upsert(igRows, { onConflict: "profile_id,date" });
      if (error) throw error;
    }

    if (fbRows.length > 0) {
      const { error } = await supabase
        .from("conversion_snapshots")
        .upsert(fbRows, { onConflict: "facebook_profile_id,date" });
      if (error) throw error;
    }

    return NextResponse.json({
      ok: true,
      inserted: igRows.length + fbRows.length,
      ig: igRows.length,
      fb: fbRows.length,
      skipped,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
