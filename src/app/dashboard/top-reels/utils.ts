import type { SupabaseClient } from "@supabase/supabase-js";

const REELS_PER_PROFILE = 36;
const MIN_REELS_FOR_PROFILE_AVG = 9;

type AvgLevel = "profile" | "group" | "creator";

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Collect current_views > 0 from a list of reels, excluding a specific reel */
function collectTotalViews(reels: any[], excludeReelId?: string): number[] {
  return reels
    .filter((r: any) => r.id !== excludeReelId && (r.current_views || 0) > 0)
    .map((r: any) => r.current_views as number);
}

/**
 * Fetch all reels FLAT (profile_id only, no nested profile/model/group
 * join). The nested join was the dominant cost (~35s for all reels); the
 * client re-attaches profile/model/group from its already-loaded lookup
 * arrays. Pages are fetched in parallel ordered by id (PK) — fast and
 * stable. Fetch order does not matter: enrichReelsWithMultiplier sorts each
 * profile's reels by posted_at itself.
 */
export async function fetchAllReels(supabase: SupabaseClient): Promise<any[]> {
  const batchSize = 1000;
  const { count } = await supabase.from("reels").select("id", { count: "exact", head: true });
  const pageCount = Math.max(1, Math.ceil((count || 0) / batchSize));

  const requests = [];
  for (let p = 0; p < pageCount; p++) {
    requests.push(
      supabase
        .from("reels")
        // Only the fields the multiplier/baseline maths and the
        // filter+sort need. Card display fields (thumbnail, shortcode,
        // likes/comments/shares, video url) are lazy-loaded per rendered
        // page via getReelCards, and caption/video_analysis by the insights
        // modal. Fetching card fields for all ~19k reels cost ~6s and ~10MB
        // of RSC payload; this minimal set is ~0.9s.
        .select("id, profile_id, current_views, posted_at, last_daily_views")
        .order("id", { ascending: true })
        .range(p * batchSize, p * batchSize + batchSize - 1)
    );
  }

  const results = await Promise.all(requests);
  return results.flatMap((r: any) => r.data || []);
}

/**
 * Enrich reels with multiplier.
 *
 * Median baseline = median of TOTAL VIEWS (current_views) of last 36 reels per profile.
 * Multiplier = daily views for target date / median total views.
 *
 * Example: Account median = 500 total views per reel.
 *   Reel gets +5000 views yesterday → 5000/500 = 10x → Viral
 *   Reel gets +20 views yesterday → 20/500 = 0.04x → not shown
 *
 * Fallback hierarchy: Profile (≥9 reels) → Group → Creator
 *
 * @param allReels - All reels with profile joins
 * @param profiles - All profiles (for group/model lookup)
 * @param dailyViewsMap - reel.id → daily views for the target date
 */
export function enrichReelsWithMultiplier(
  allReels: any[],
  profiles: any[],
  dailyViewsMap: Record<string, number>,
) {
  // Build lookup: profile_id → { account_group_id, model_id }
  const profileLookup: Record<string, { account_group_id: string | null; model_id: string | null }> = {};
  for (const p of profiles) {
    profileLookup[p.id] = { account_group_id: p.account_group_id, model_id: p.model_id };
  }

  // Group reels by profile, group, and creator
  const reelsByProfile: Record<string, any[]> = {};
  const reelsByGroup: Record<string, any[]> = {};
  const reelsByModel: Record<string, any[]> = {};

  for (const reel of allReels) {
    const pid = reel.profile_id;
    if (!pid) continue;

    // Collect all of the profile's reels; the last-36 selection happens
    // after grouping (fetch order is no longer guaranteed by posted_at).
    if (!reelsByProfile[pid]) reelsByProfile[pid] = [];
    reelsByProfile[pid].push(reel);

    const groupId = profileLookup[pid]?.account_group_id;
    if (groupId) {
      if (!reelsByGroup[groupId]) reelsByGroup[groupId] = [];
      reelsByGroup[groupId].push(reel);
    }

    const modelId = profileLookup[pid]?.model_id;
    if (modelId) {
      if (!reelsByModel[modelId]) reelsByModel[modelId] = [];
      reelsByModel[modelId].push(reel);
    }
  }

  // Per profile, keep only the last REELS_PER_PROFILE reels by posted_at
  // (most recent first) — the baseline for the profile-level average.
  const reelsByProfileRecent: Record<string, any[]> = {};
  for (const [pid, rs] of Object.entries(reelsByProfile)) {
    reelsByProfileRecent[pid] = [...rs]
      .sort((a, b) => String(b.posted_at || "").localeCompare(String(a.posted_at || "")))
      .slice(0, REELS_PER_PROFILE);
  }

  // Pre-compute group and creator averages (based on TOTAL views)
  const avgByGroup: Record<string, number> = {};
  for (const [gid, reels] of Object.entries(reelsByGroup)) {
    avgByGroup[gid] = computeAverage(collectTotalViews(reels));
  }

  const avgByModel: Record<string, number> = {};
  for (const [mid, reels] of Object.entries(reelsByModel)) {
    avgByModel[mid] = computeAverage(collectTotalViews(reels));
  }

  // Enrich each reel
  return allReels.map(reel => {
    const pid = reel.profile_id;
    const info = profileLookup[pid];
    const profileReels = reelsByProfileRecent[pid] || [];
    const dailyViews = dailyViewsMap[reel.id] || 0;

    // 1) Try profile-level average (exclude self, need ≥9 other reels)
    const profileTotalViews = collectTotalViews(profileReels, reel.id);
    let avg = 0;
    let level: AvgLevel = "profile";

    if (profileTotalViews.length >= MIN_REELS_FOR_PROFILE_AVG) {
      avg = computeAverage(profileTotalViews);
    }

    // 2) Fallback: group-level average
    if (avg === 0 && info?.account_group_id) {
      avg = avgByGroup[info.account_group_id] || 0;
      level = "group";
    }

    // 3) Fallback: creator/model-level average
    if (avg === 0 && info?.model_id) {
      avg = avgByModel[info.model_id] || 0;
      level = "creator";
    }

    // Multiplier = daily views / average total views
    const multiplier = avg > 0 ? dailyViews / avg : 0;

    return {
      ...reel,
      dailyViews,
      multiplier: Math.round(multiplier * 100) / 100,
      avgViews: Math.round(avg),
      avgLevel: level,
    };
  });
}
