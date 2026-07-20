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
  const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();
  const sixtyDaysAgoDate = sixtyDaysAgoIso.split("T")[0];
  const pageSize = 1000;

  // ── Fetch helpers ───────────────────────────────────────────────
  // Each block below is fully independent of the others, so they all run
  // in parallel via the single Promise.all further down. Previously they
  // ran sequentially (one paginated loop after another), which is what
  // dominated the 20-30s page load.

  // profile_snapshots — paginated to bypass the 1000-row limit
  const fetchProfileSnapshots = async () => {
    const snapshotFields = "profile_id, followers, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, daily_views, daily_likes, daily_comments, daily_shares, scraped_at";
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("profile_snapshots")
        .select(snapshotFields)
        .gte("scraped_at", sixtyDaysAgoIso)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    return all;
  };

  // ── Reel daily deltas via aggregated DB view ────────────────────
  // The view `reel_daily_deltas_v` does the per-(profile,day) sum in
  // Postgres, returning ~1.6k rows instead of paginating ~44k raw
  // snapshot rows + aggregating in JS. Cuts page load 5-10s -> 1-2s.
  //
  // Append `?verify=1` to the page URL to additionally run the legacy
  // path in parallel and log row-level diffs to the server console
  // (visible in Vercel function logs). Use this if numbers ever look
  // off — by default only the view runs.
  const fetchReelDeltasFromView = async () => {
    // Parameterized RPC that filters scraped_at BEFORE aggregating (uses the
    // scraped_at index) and raises statement_timeout, so it never times out
    // under concurrent load the way the plain view did.
    const { data, error } = await supabase
      .rpc("reel_daily_deltas", { p_since: sixtyDaysAgoDate });
    if (error) {
      console.error("[analytics] reel_daily_deltas rpc failed:", error);
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
        .gte("scraped_at", sixtyDaysAgoIso)
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

  const fetchReelDailyDeltas = async () => {
    if (!verifyMode) return fetchReelDeltasFromView();
    const t0 = Date.now();
    const [viewRows, legacyRows] = await Promise.all([
      fetchReelDeltasFromView(),
      fetchReelDeltasLegacy(),
    ]);
    const elapsed = Date.now() - t0;
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
    return viewRows;
  };

  // facebook_profile_snapshots — paginated, normalized to IG shape
  const fetchFbSnapshots = async () => {
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("facebook_profile_snapshots")
        .select("profile_id, followers, total_reel_views, reels_tracked, scraped_at")
        .gte("scraped_at", sixtyDaysAgoIso)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    return all.map((s: any) => ({
      ...s,
      media_count: null,
      total_reel_likes: null,
      total_reel_comments: null,
      total_reel_shares: null,
      daily_views: null,
      daily_likes: null,
      daily_comments: null,
      daily_shares: null,
    }));
  };

  // ── FB reel daily deltas via parameterized RPC ──────────────────
  // Mirrors reel_daily_deltas for Facebook: filters scraped_at then does
  // the per-(profile,day) sum in Postgres, returning ~1.5k rows instead
  // of paginating ~32k raw snapshot rows + aggregating in JS.
  const fetchFbReelDeltasFromView = async () => {
    const { data, error } = await supabase
      .rpc("fb_reel_daily_deltas", { p_since: sixtyDaysAgoDate });
    if (error) throw error;
    return (data || []).map((d: any) => ({
      profile_id: d.profile_id,
      date: d.date,
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
      shares: d.shares || 0,
    }));
  };

  // Legacy fallback: paginate facebook_reel_snapshots and aggregate in
  // JS. Kept as a safety net in case the view is missing/dropped.
  const fetchFbReelDeltasLegacy = async () => {
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("facebook_reel_snapshots")
        .select("reel_id, views_delta, reactions_delta, comments_delta, shares_delta, scraped_at, facebook_reels(profile_id)")
        .gte("scraped_at", sixtyDaysAgoIso)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    const map: Record<string, { profile_id: string; date: string; views: number; likes: number; comments: number; shares: number }> = {};
    for (const rs of all) {
      const profileId = (rs.facebook_reels as any)?.profile_id;
      if (!profileId) continue;
      const date = rs.scraped_at.split("T")[0];
      const key = `${date}|${profileId}`;
      if (!map[key]) map[key] = { profile_id: profileId, date, views: 0, likes: 0, comments: 0, shares: 0 };
      map[key].views += rs.views_delta || 0;
      map[key].likes += rs.reactions_delta || 0;
      map[key].comments += rs.comments_delta || 0;
      map[key].shares += rs.shares_delta || 0;
    }
    return Object.values(map);
  };

  const fetchFbReelDailyDeltas = async () => {
    try {
      return await fetchFbReelDeltasFromView();
    } catch (e) {
      console.error("[analytics] facebook_reel_daily_deltas_v query failed, falling back to pagination:", e);
      return fetchFbReelDeltasLegacy();
    }
  };

  // conversion_snapshots (link clicks + new subs) — IG + FB, normalized
  const fetchConversions = async () => {
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("conversion_snapshots")
        .select("profile_id, facebook_profile_id, date, link_clicks, new_subs")
        .gte("date", sixtyDaysAgoDate)
        .order("date", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    // FB conversion rows use facebook_profile_id — map to profile_id so
    // analytics can match them.
    return all.map((c: any) =>
      !c.profile_id && c.facebook_profile_id ? { ...c, profile_id: c.facebook_profile_id } : c
    );
  };

  const fetchOfStats = async () => {
    const { data } = await supabase
      .from("of_daily_stats")
      .select("model_id, date, total_new_subs")
      .gte("date", sixtyDaysAgoDate)
      .order("date", { ascending: true });
    return data || [];
  };

  // ── Run everything in parallel ──────────────────────────────────
  const [
    { data: profiles },
    { data: fbProfiles },
    { data: models },
    { data: groups },
    { data: tags },
    snapshots,
    reelDailyDeltas,
    fbSnapshots,
    fbReelDailyDeltas,
    conversions,
    ofStats,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, instagram_username, model_id, status, is_active, tags,
        models(id, name, nickname),
        account_groups(id, name)
      `)
      .order("instagram_username"),
    supabase
      .from("facebook_profiles")
      .select(`id, name, facebook_url, model_id, account_group_id, status, is_active, tags, models(id, name, nickname), account_groups(id, name)`)
      .eq("is_active", true)
      .order("name"),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
    fetchProfileSnapshots(),
    fetchReelDailyDeltas(),
    fetchFbSnapshots(),
    fetchFbReelDailyDeltas(),
    fetchConversions(),
    fetchOfStats(),
  ]);

  // Normalize FB profiles to same shape as IG profiles
  const fbProfilesNorm = (fbProfiles || []).map((p: any) => ({
    ...p,
    instagram_username: p.name,
    platform: 'facebook',
  }));

  const allProfiles = [...(profiles || []).map((p: any) => ({ ...p, platform: 'instagram' })), ...fbProfilesNorm];

  // Filter models to only those with at least one profile
  const usedModelIds = new Set(allProfiles.map((p: any) => p.model_id || p.models?.id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  const mergedSnapshots = [...snapshots, ...fbSnapshots];
  const mergedReelDailyDeltas = [...reelDailyDeltas, ...fbReelDailyDeltas];

  return (
    <AnalyticsClient
      profiles={allProfiles as any}
      snapshots={mergedSnapshots}
      conversions={conversions || []}
      ofStats={ofStats || []}
      models={filteredModels}
      groups={groups || []}
      tags={tags || []}
      reelDailyDeltas={mergedReelDailyDeltas}
    />
  );
}
