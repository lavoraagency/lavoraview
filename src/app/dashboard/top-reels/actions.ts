"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { enrichReelsWithMultiplier, fetchAllReels } from "./utils";

export async function getReelSnapshots(reelId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reel_snapshots")
    .select("scraped_at, views, views_delta")
    .eq("reel_id", reelId)
    .order("scraped_at", { ascending: true });
  return data || [];
}

/**
 * Lazy-load the heavy per-reel fields (video_analysis is a large JSON blob,
 * caption is only shown here) — all excluded from the bulk reels fetch.
 * Called by the insights modal.
 */
export async function getReelVideoAnalysis(reelId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reels")
    .select("video_analysis, video_duration, caption")
    .eq("id", reelId)
    .single();
  return data || { video_analysis: null, video_duration: null, caption: null };
}

/**
 * Card display fields for a specific set of reels. The bulk fetch only
 * loads what the multiplier maths and filtering need; the grid pulls these
 * for the ~12 reels it actually renders.
 */
export async function getReelCards(ids: string[]) {
  if (!ids.length) return [] as any[];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reels")
    .select("id, shortcode, thumbnail_url, reel_url, video_storage_url, current_likes, current_comments, current_shares")
    .in("id", ids);
  return data || [];
}

/**
 * Return just the per-reel daily views for a specific date
 * (reel_snapshots.views_delta, max per reel). The reels themselves and
 * their baseline averages don't change per date, so the client keeps the
 * reels it already has and only swaps in these daily views to recompute
 * multipliers — no need to refetch ~19k reels per date.
 */
export async function getDailyViewsForDate(dateStr: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();

  const nextDay = new Date(dateStr + "T00:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split("T")[0];

  const dailyViewsMap: Record<string, number> = {};
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data: batch } = await supabase
      .from("reel_snapshots")
      .select("reel_id, views_delta")
      .gte("scraped_at", dateStr + "T00:00:00")
      .lt("scraped_at", nextDayStr + "T00:00:00")
      .range(from, from + batchSize - 1);
    if (!batch || batch.length === 0) break;
    for (const s of batch) {
      dailyViewsMap[s.reel_id] = Math.max(dailyViewsMap[s.reel_id] || 0, s.views_delta || 0);
    }
    if (batch.length < batchSize) break;
    from += batchSize;
  }
  return dailyViewsMap;
}

/**
 * Load top reels data for a specific date.
 * Fetches reel_snapshots.views_delta for that date and computes multipliers.
 * Pass null for "yesterday" (uses last_daily_views from reels table).
 */
export async function getTopReelsForDate(dateStr: string | null) {
  const supabase = createServiceClient();

  // Fetch profiles and reels
  const [{ data: profiles }, allReels] = await Promise.all([
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status"),
    fetchAllReels(supabase),
  ]);

  let dailyViewsMap: Record<string, number> = {};

  if (!dateStr) {
    // Use last_daily_views from reels table (= yesterday)
    for (const reel of allReels) {
      dailyViewsMap[reel.id] = reel.last_daily_views || 0;
    }
  } else {
    // Fetch reel_snapshots for the specific date
    const nextDay = new Date(dateStr + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0];

    let allSnapshots: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from("reel_snapshots")
        .select("reel_id, views_delta")
        .gte("scraped_at", dateStr + "T00:00:00")
        .lt("scraped_at", nextDayStr + "T00:00:00")
        .range(from, from + batchSize - 1);
      if (!batch || batch.length === 0) break;
      allSnapshots = allSnapshots.concat(batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    // Build daily views map (take max delta per reel if multiple snapshots)
    for (const s of allSnapshots) {
      dailyViewsMap[s.reel_id] = Math.max(dailyViewsMap[s.reel_id] || 0, s.views_delta || 0);
    }
  }

  return enrichReelsWithMultiplier(allReels, profiles || [], dailyViewsMap);
}
