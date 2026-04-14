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

/** Fetch all reels with profile joins (paginated) */
export async function fetchAllReels(supabase: SupabaseClient): Promise<any[]> {
  let allReels: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data: batch } = await supabase
      .from("reels")
      .select(`
        id, shortcode, thumbnail_url, reel_url, caption,
        posted_at, current_views, current_likes, current_comments, current_shares,
        is_viral_tracked, last_daily_views, profile_id,
        video_cdn_url, video_storage_url, video_analysis,
        profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
      `)
      .order("posted_at", { ascending: false })
      .range(from, from + batchSize - 1);

    if (!batch || batch.length === 0) break;
    allReels = allReels.concat(batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }
  return allReels;
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

    if (!reelsByProfile[pid]) reelsByProfile[pid] = [];
    if (reelsByProfile[pid].length < REELS_PER_PROFILE) {
      reelsByProfile[pid].push(reel);
    }

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
    const profileReels = reelsByProfile[pid] || [];
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
