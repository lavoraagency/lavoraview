// Shared analytics time-series fetch.
//
// Used by two callers so they stay byte-identical:
//   1. the analytics page (server component) — loads a SHORT recent
//      window for an instant first paint of the default "yesterday" view;
//   2. the /api/analytics/history route — loads the full 60-day window in
//      the background for trend charts and longer date ranges.
//
// Both call fetchAnalyticsTimeSeries() with a different `since` date. Reel
// deltas come from the parameterized RPCs (reel_daily_deltas /
// fb_reel_daily_deltas) which filter scraped_at first and never time out.

export interface AnalyticsTimeSeries {
  snapshots: any[];
  conversions: any[];
  ofStats: any[];
  reelDailyDeltas: any[];
}

const PAGE_SIZE = 1000;

// Normalize a FB profile snapshot to the same shape as an IG one.
const normalizeFbSnap = (s: any) => ({
  profile_id: s.profile_id,
  followers: s.followers,
  total_reel_views: s.total_reel_views,
  reels_tracked: s.reels_tracked,
  scraped_at: s.scraped_at,
  media_count: null,
  total_reel_likes: null,
  total_reel_comments: null,
  total_reel_shares: null,
  daily_views: null,
  daily_likes: null,
  daily_comments: null,
  daily_shares: null,
});

export async function fetchAnalyticsTimeSeries(
  supabase: any,
  since: Date,
  opts: { verify?: boolean; baselineSince?: Date } = {}
): Promise<AnalyticsTimeSeries> {
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.split("T")[0];
  const verify = !!opts.verify;

  // PostgREST caps RPC results at 1000 rows, so the reel-delta functions
  // (which return one row per profile/day, ~3.6k over 60 days) must be
  // paginated — otherwise the history is silently truncated. The RPCs
  // ORDER BY (profile_id, date) so offset paging is stable.
  //
  // But paging an RPC is expensive: PostgREST applies LIMIT/OFFSET *around*
  // the function call, so every page re-runs the whole aggregation and then
  // throws away all but its slice. Measured: ~4s per page × 4 pages ≈ 16s
  // for one 60-day load, to produce ~4s worth of data.
  //
  // The `_json` variants below wrap the same functions and return a single
  // row containing a JSON array — one row is never capped, so the whole
  // result arrives in one execution. Falls back to paging when those
  // functions don't exist yet (a deploy can land before the SQL is run).
  const rpcPaginated = async (fn: string, params: any) => {
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.rpc(fn, params).range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return all;
  };

  const rpcAllRows = async (fn: string, params: any) => {
    const { data, error } = await supabase.rpc(`${fn}_json`, params);
    if (error) {
      // PGRST202 = function not found → SQL not applied yet, use the old path.
      console.warn(`[analytics] ${fn}_json unavailable (${error.code}), paging ${fn} instead`);
      return rpcPaginated(fn, params);
    }
    return (data as any[]) || [];
  };

  // Plain-table pagination. Unlike the RPC case above, paging a table is
  // cheap per page (indexed range scan) — the cost is the round trips, which
  // used to run one after another. Fetch page 0 with an exact count, then
  // pull the remaining pages in parallel. Fetching them simultaneously also
  // narrows the window in which a concurrent insert could shift rows between
  // pages, compared with walking them sequentially.
  const fetchAllPages = async (
    build: (from: number, to: number, withCount: boolean) => any
  ): Promise<any[]> => {
    const first = await build(0, PAGE_SIZE - 1, true);
    if (first.error) throw first.error;
    let all: any[] = first.data || [];
    const total: number | null = first.count ?? null;
    if (total === null || all.length >= total) return all;

    const pending: any[] = [];
    for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) {
      pending.push(build(off, off + PAGE_SIZE - 1, false));
    }
    const results = await Promise.all(pending);
    for (const r of results) if (r?.data) all = all.concat(r.data);
    return all;
  };

  // When loading only a short recent window, follower/interaction deltas
  // need each profile's most recent snapshot BEFORE the window as a
  // baseline — otherwise a profile whose prior snapshot predates the
  // window is treated as brand-new and its full follower count is counted
  // as growth. These RPCs return exactly one row per profile (the latest
  // snapshot in [baselineSince, since)), so the short window matches the
  // full-history result. Not needed for the full 60-day load.
  const fetchIgBaselines = async () => {
    if (!opts.baselineSince) return [] as any[];
    const { data, error } = await supabase.rpc("profile_snapshot_baselines", {
      p_before: sinceIso,
      p_since: opts.baselineSince.toISOString(),
    });
    if (error) {
      console.error("[analytics] profile_snapshot_baselines rpc failed:", error);
      return [] as any[];
    }
    return data || [];
  };
  const fetchFbBaselines = async () => {
    if (!opts.baselineSince) return [] as any[];
    const { data, error } = await supabase.rpc("fb_profile_snapshot_baselines", {
      p_before: sinceIso,
      p_since: opts.baselineSince.toISOString(),
    });
    if (error) {
      console.error("[analytics] fb_profile_snapshot_baselines rpc failed:", error);
      return [] as any[];
    }
    return (data || []).map(normalizeFbSnap);
  };

  // profile_snapshots — paginated to bypass the 1000-row limit
  const fetchProfileSnapshots = async () => {
    const fields = "profile_id, followers, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, daily_views, daily_likes, daily_comments, daily_shares, scraped_at";
    return fetchAllPages((from, to, withCount) =>
      supabase
        .from("profile_snapshots")
        .select(fields, withCount ? { count: "exact" } : {})
        .gte("scraped_at", sinceIso)
        .order("scraped_at", { ascending: true })
        .range(from, to)
    );
  };

  // IG reel daily deltas — parameterized RPC (filters scraped_at, then
  // aggregates per profile/day in Postgres). Never times out.
  const fetchReelDeltasFromRpc = async () => {
    let data: any[];
    try {
      data = await rpcAllRows("reel_daily_deltas", { p_since: sinceDate });
    } catch (error) {
      console.error("[analytics] reel_daily_deltas rpc failed:", error);
      return [] as any[];
    }
    return (data || []).map((d: any) => ({
      profile_id: d.profile_id,
      date: d.date,
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
      shares: d.shares || 0,
    }));
  };

  // Legacy IG path — only used by verify mode to diff against the RPC.
  const fetchReelDeltasLegacy = async () => {
    const fields = "views_delta,likes_delta,comments_delta,shares_delta,scraped_at,profile_id,reels(profile_id)";
    let all: any[] = [];
    let off = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("reel_snapshots")
        .select(fields)
        .gte("scraped_at", sinceIso)
        .order("scraped_at", { ascending: true })
        .range(off, off + PAGE_SIZE - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      off += PAGE_SIZE;
    }
    const map: Record<string, any> = {};
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
    if (!verify) return fetchReelDeltasFromRpc();
    const t0 = Date.now();
    const [rpcRows, legacyRows] = await Promise.all([fetchReelDeltasFromRpc(), fetchReelDeltasLegacy()]);
    const elapsed = Date.now() - t0;
    const idx = (rows: any[]) => {
      const m: Record<string, any> = {};
      for (const r of rows) m[`${r.date}|${r.profile_id}`] = r;
      return m;
    };
    const A = idx(rpcRows), B = idx(legacyRows);
    const allKeys = Array.from(new Set([...Object.keys(A), ...Object.keys(B)]));
    const diffs: any[] = [];
    for (const k of allKeys) {
      const a = A[k], b = B[k];
      if (!a || !b) { diffs.push({ key: k, rpc: a, legacy: b }); continue; }
      for (const f of ["views", "likes", "comments", "shares"] as const) {
        if ((a[f] || 0) !== (b[f] || 0)) { diffs.push({ key: k, field: f, rpc: a[f], legacy: b[f] }); break; }
      }
    }
    console.log(`[analytics][verify] rpc=${rpcRows.length} legacy=${legacyRows.length} diffs=${diffs.length} elapsed=${elapsed}ms`);
    if (diffs.length > 0) console.log("[analytics][verify] sample diffs:", diffs.slice(0, 10));
    return rpcRows;
  };

  // facebook_profile_snapshots — paginated, normalized to IG shape
  const fetchFbSnapshots = async () => {
    const all = await fetchAllPages((from, to, withCount) =>
      supabase
        .from("facebook_profile_snapshots")
        .select("profile_id, followers, total_reel_views, reels_tracked, scraped_at", withCount ? { count: "exact" } : {})
        .gte("scraped_at", sinceIso)
        .order("scraped_at", { ascending: true })
        .range(from, to)
    );
    return all.map(normalizeFbSnap);
  };

  // FB reel daily deltas — parameterized RPC, with pagination fallback.
  const fetchFbReelDeltasFromRpc = async () => {
    const data = await rpcAllRows("fb_reel_daily_deltas", { p_since: sinceDate });
    return (data || []).map((d: any) => ({
      profile_id: d.profile_id,
      date: d.date,
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
      shares: d.shares || 0,
    }));
  };

  const fetchFbReelDeltasLegacy = async () => {
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const { data: batch } = await supabase
        .from("facebook_reel_snapshots")
        .select("reel_id, views_delta, reactions_delta, comments_delta, shares_delta, scraped_at, facebook_reels(profile_id)")
        .gte("scraped_at", sinceIso)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    const map: Record<string, any> = {};
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
      return await fetchFbReelDeltasFromRpc();
    } catch (e) {
      console.error("[analytics] fb_reel_daily_deltas rpc failed, falling back to pagination:", e);
      return fetchFbReelDeltasLegacy();
    }
  };

  // conversion_snapshots (link clicks + new subs) — IG + FB, normalized
  const fetchConversions = async () => {
    const all = await fetchAllPages((from, to, withCount) =>
      supabase
        .from("conversion_snapshots")
        .select("profile_id, facebook_profile_id, date, link_clicks, new_subs", withCount ? { count: "exact" } : {})
        .gte("date", sinceDate)
        .order("date", { ascending: true })
        .range(from, to)
    );
    return all.map((c: any) =>
      !c.profile_id && c.facebook_profile_id ? { ...c, profile_id: c.facebook_profile_id } : c
    );
  };

  const fetchOfStats = async () => {
    const { data } = await supabase
      .from("of_daily_stats")
      .select("model_id, date, total_new_subs")
      .gte("date", sinceDate)
      .order("date", { ascending: true });
    return data || [];
  };

  const [snapshots, reelDailyDeltas, fbSnapshots, fbReelDailyDeltas, conversions, ofStats, igBaselines, fbBaselines] =
    await Promise.all([
      fetchProfileSnapshots(),
      fetchReelDailyDeltas(),
      fetchFbSnapshots(),
      fetchFbReelDailyDeltas(),
      fetchConversions(),
      fetchOfStats(),
      fetchIgBaselines(),
      fetchFbBaselines(),
    ]);

  return {
    snapshots: [...igBaselines, ...snapshots, ...fbBaselines, ...fbSnapshots],
    conversions,
    ofStats,
    reelDailyDeltas: [...reelDailyDeltas, ...fbReelDailyDeltas],
  };
}
