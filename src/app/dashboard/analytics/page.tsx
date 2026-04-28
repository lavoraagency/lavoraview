export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "@/components/analytics-client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { verify?: string };
}) {
  const supabase = createClient();
  const verifyMode = searchParams?.verify === "1";

  // Fetch last 60 days of snapshots (need extra days for delta calculation)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [
    { data: profiles },
    { data: models },
    { data: groups },
    { data: tags },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, instagram_username, model_id, status, is_active, tags,
        models(id, name, nickname),
        account_groups(id, name)
      `)
      .order("instagram_username"),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  // Filter models to only those with at least one profile
  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  // Fetch snapshots with pagination to bypass 1000 row limit
  const snapshotFields = "profile_id, followers, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, daily_views, daily_likes, daily_comments, daily_shares, scraped_at";
  let allSnapshots: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: batch } = await supabase
      .from("profile_snapshots")
      .select(snapshotFields)
      .gte("scraped_at", sixtyDaysAgo.toISOString())
      .order("scraped_at", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (!batch || batch.length === 0) break;
    allSnapshots = allSnapshots.concat(batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  const snapshots = allSnapshots;

  // ── Reel daily deltas via aggregated DB view ────────────────────
  // The view `reel_daily_deltas_v` does the per-(profile,day) sum in
  // Postgres, returning ~1.6k rows instead of paginating ~44k raw
  // snapshot rows + aggregating in JS. Cuts page load 5-10s -> 1-2s.
  //
  // Append `?verify=1` to the page URL to additionally run the legacy
  // path in parallel and log row-level diffs to the server console
  // (visible in Vercel function logs). Use this if numbers ever look
  // off — by default only the view runs.
  const sixtyDaysAgoDate = sixtyDaysAgo.toISOString().split("T")[0];
  const fetchReelDeltasFromView = async () => {
    const { data, error } = await supabase
      .from("reel_daily_deltas_v")
      .select("profile_id, date, views, likes, comments, shares")
      .gte("date", sixtyDaysAgoDate);
    if (error) {
      console.error("[analytics] reel_daily_deltas_v query failed:", error);
      return [] as any[];
    }
    // Match the legacy shape exactly so AnalyticsClient stays unchanged
    return (data || []).map((d: any) => ({
      profile_id: d.profile_id,
      date: d.date,
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
      shares: d.shares || 0,
    }));
  };

  const fetchReelDeltasLegacy = async () => {
    const reelSnapshotFields = "views_delta,likes_delta,comments_delta,shares_delta,scraped_at,profile_id,reels(profile_id)";
    let all: any[] = [];
    let off = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("reel_snapshots")
        .select(reelSnapshotFields)
        .gte("scraped_at", sixtyDaysAgo.toISOString())
        .order("scraped_at", { ascending: true })
        .range(off, off + pageSize - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      off += pageSize;
    }
    const map: Record<string, { profile_id: string; date: string; views: number; likes: number; comments: number; shares: number }> = {};
    for (const rs of all) {
      const profileId = rs.profile_id || rs.reels?.profile_id;
      if (!profileId) continue;
      const date = rs.scraped_at.split("T")[0];
      const key = `${date}|${profileId}`;
      if (!map[key]) map[key] = { profile_id: profileId, date, views: 0, likes: 0, comments: 0, shares: 0 };
      map[key].views += rs.views_delta || 0;
      map[key].likes += rs.likes_delta || 0;
      map[key].comments += rs.comments_delta || 0;
      map[key].shares += rs.shares_delta || 0;
    }
    return Object.values(map);
  };

  let reelDailyDeltas: any[];
  if (verifyMode) {
    const t0 = Date.now();
    const [viewRows, legacyRows] = await Promise.all([
      fetchReelDeltasFromView(),
      fetchReelDeltasLegacy(),
    ]);
    const elapsed = Date.now() - t0;
    // Index both by (date|profile) and diff
    const idx = (rows: any[]) => {
      const m: Record<string, any> = {};
      for (const r of rows) m[`${r.date}|${r.profile_id}`] = r;
      return m;
    };
    const A = idx(viewRows), B = idx(legacyRows);
    const allKeys = Array.from(new Set([...Object.keys(A), ...Object.keys(B)]));
    const diffs: any[] = [];
    for (const k of allKeys) {
      const a = A[k], b = B[k];
      if (!a || !b) { diffs.push({ key: k, view: a, legacy: b }); continue; }
      for (const f of ["views", "likes", "comments", "shares"] as const) {
        if ((a[f] || 0) !== (b[f] || 0)) {
          diffs.push({ key: k, field: f, view: a[f], legacy: b[f] });
          break;
        }
      }
    }
    console.log(`[analytics][verify] view=${viewRows.length} legacy=${legacyRows.length} diffs=${diffs.length} elapsed=${elapsed}ms`);
    if (diffs.length > 0) console.log("[analytics][verify] sample diffs:", diffs.slice(0, 10));
    reelDailyDeltas = viewRows;
  } else {
    reelDailyDeltas = await fetchReelDeltasFromView();
  }

  // Fetch conversion snapshots (link clicks + new subs)
  let allConversions: any[] = [];
  let convOffset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("conversion_snapshots")
      .select("profile_id, date, link_clicks, new_subs")
      .gte("date", sixtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: true })
      .range(convOffset, convOffset + pageSize - 1);
    if (!batch || batch.length === 0) break;
    allConversions = allConversions.concat(batch);
    if (batch.length < pageSize) break;
    convOffset += pageSize;
  }
  const conversions = allConversions;

  // Fetch OF daily stats (total new subs per model)
  const { data: ofStats } = await supabase
    .from("of_daily_stats")
    .select("model_id, date, total_new_subs")
    .gte("date", sixtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  return (
    <AnalyticsClient
      profiles={profiles || []}
      snapshots={snapshots || []}
      conversions={conversions || []}
      ofStats={ofStats || []}
      models={filteredModels}
      groups={groups || []}
      tags={tags || []}
      reelDailyDeltas={reelDailyDeltas}
    />
  );
}
