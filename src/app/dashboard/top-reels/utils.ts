import type { SupabaseClient } from "@supabase/supabase-js";

const REELS_PER_PROFILE = 36;
const MIN_REELS_FOR_PROFILE_MEDIAN = 9;

type MedianLevel = "profile" | "group" | "creator";

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Collect daily views > 0 from a list of reels using the dailyViewsMap, excluding a specific reel */
function collectDailyViews(reels: any[], dailyViewsMap: Record<string, number>, excludeReelId?: string): number[] {
  return reels
    .filter((r: any) => r.id !== excludeReelId && (dailyViewsMap[r.id] || 0) > 0)
    .map((r: any) => dailyViewsMap[r.id] as number);
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
 * Enrich reels with multiplier based on daily views.
 * Uses fallback hierarchy: Profile (≥9 reels) → Group → Creator
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

  // Pre-compute group and creator medians (based on daily views)
  const medianByGroup: Record<string, number> = {};
  for (const [gid, reels] of Object.entries(reelsByGroup)) {
    medianByGroup[gid] = computeMedian(collectDailyViews(reels, dailyViewsMap));
  }

  const medianByModel: Record<string, number> = {};
  for (const [mid, reels] of Object.entries(reelsByModel)) {
    medianByModel[mid] = computeMedian(collectDailyViews(reels, dailyViewsMap));
  }

  // Enrich each reel
  return allReels.map(reel => {
    const pid = reel.profile_id;
    const info = profileLookup[pid];
    const profileReels = reelsByProfile[pid] || [];
    const dailyViews = dailyViewsMap[reel.id] || 0;

    // 1) Try profile-level median (exclude self, need ≥9 other reels with daily views)
    const profileDailyViews = collectDailyViews(profileReels, dailyViewsMap, reel.id);
    let median = 0;
    let level: MedianLevel = "profile";

    if (profileDailyViews.length >= MIN_REELS_FOR_PROFILE_MEDIAN) {
      median = computeMedian(profileDailyViews);
    }

    // 2) Fallback: group-level median
    if (median === 0 && info?.account_group_id) {
      median = medianByGroup[info.account_group_id] || 0;
      level = "group";
    }

    // 3) Fallback: creator/model-level median
    if (median === 0 && info?.model_id) {
      median = medianByModel[info.model_id] || 0;
      level = "creator";
    }

    const multiplier = median > 0 ? dailyViews / median : 0;

    return {
      ...reel,
      dailyViews,
      multiplier: Math.round(multiplier * 100) / 100,
      medianViews: Math.round(median),
      medianLevel: level,
    };
  });
}
