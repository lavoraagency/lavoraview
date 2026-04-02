import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/sync-conversions
// Accepts array of { username, date, link_clicks, new_subs }
// Matches username to profile_id and upserts into conversion_snapshots
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

    // Fetch all profiles to build username → id map
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, instagram_username");

    if (profilesError) throw profilesError;

    const usernameToId: Record<string, string> = {};
    for (const p of profiles || []) {
      usernameToId[p.instagram_username.toLowerCase()] = p.id;
    }

    // Build upsert rows, skip unknown usernames
    const rows: { profile_id: string; date: string; link_clicks: number; new_subs: number }[] = [];
    const skipped: string[] = [];

    for (const r of records) {
      const profileId = usernameToId[r.username.toLowerCase()];
      if (!profileId) {
        skipped.push(r.username);
        continue;
      }
      if (!r.date || r.date === "Start" || r.date === "Week ⬆") continue;
      rows.push({
        profile_id: profileId,
        date: r.date,
        link_clicks: Number(r.link_clicks) || 0,
        new_subs: Number(r.new_subs) || 0,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, skipped });
    }

    const { error: upsertError } = await supabase
      .from("conversion_snapshots")
      .upsert(rows, { onConflict: "profile_id,date" });

    if (upsertError) throw upsertError;

    return NextResponse.json({ ok: true, inserted: rows.length, skipped });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
