export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { TopReelsClient } from "@/components/top-reels-client";

const REELS_PER_PROFILE = 36;
const MIN_REELS_FOR_PROFILE_MEDIAN = 9; // Need ≥9 reels to use profile-level median

type MedianLevel = "profile" | "group" | "creator";

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Collect current_views > 0 from a list of reels, excluding a specific reel */
function collectViews(reels: any[], excludeReelId?: string): number[] {
  return reels
    .filter((r: any) => r.id !== excludeReelId && (r.current_views || 0) > 0)
    .map((r: any) => r.current_views as number);
}

export default async function TopReelsPage() {
  const supabase = createClient();

  // Fetch all data in parallel
  const [{ data: models }, { data: groups }, { data: profiles }, { data: tags }] = await Promise.all([
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  // Build lookup: profile_id → { account_group_id, model_id }
  const profileLookup: Record<string, { account_group_id: string | null; model_id: string | null }> = {};
  for (const p of (profiles || [])) {
    profileLookup[p.id] = { account_group_id: p.account_group_id, model_id: p.model_id };
  }

  // Fetch all reels with profile joins (paginated to bypass row limit)
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

  // ── Group reels by profile, group, and creator ────────────────
  const reelsByProfile: Record<string, any[]> = {};
  const reelsByGroup: Record<string, any[]> = {};
  const reelsByModel: Record<string, any[]> = {};

  for (const reel of allReels) {
    const pid = reel.profile_id;
    if (!pid) continue;

    // By profile (max 36 recent)
    if (!reelsByProfile[pid]) reelsByProfile[pid] = [];
    if (reelsByProfile[pid].length < REELS_PER_PROFILE) {
      reelsByProfile[pid].push(reel);
    }

    // By account group
    const groupId = profileLookup[pid]?.account_group_id;
    if (groupId) {
      if (!reelsByGroup[groupId]) reelsByGroup[groupId] = [];
      reelsByGroup[groupId].push(reel);
    }

    // By model/creator
    const modelId = profileLookup[pid]?.model_id;
    if (modelId) {
      if (!reelsByModel[modelId]) reelsByModel[modelId] = [];
      reelsByModel[modelId].push(reel);
    }
  }

  // ── Pre-compute group and creator medians ─────────────────────
  const medianByGroup: Record<string, number> = {};
  for (const [gid, reels] of Object.entries(reelsByGroup)) {
    const views = collectViews(reels);
    medianByGroup[gid] = computeMedian(views);
  }

  const medianByModel: Record<string, number> = {};
  for (const [mid, reels] of Object.entries(reelsByModel)) {
    const views = collectViews(reels);
    medianByModel[mid] = computeMedian(views);
  }

  // ── Enrich each reel with multiplier ──────────────────────────
  // Fallback hierarchy: Profile (≥9 reels) → Group → Creator
  const enrichedReels = allReels.map(reel => {
    const pid = reel.profile_id;
    const info = profileLookup[pid];
    const profileReels = reelsByProfile[pid] || [];

    // 1) Try profile-level median (exclude self, need ≥9 other reels)
    const profileViews = collectViews(profileReels, reel.id);
    let median = 0;
    let level: MedianLevel = "profile";

    if (profileViews.length >= MIN_REELS_FOR_PROFILE_MEDIAN) {
      median = computeMedian(profileViews);
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

    const multiplier = median > 0 ? (reel.current_views || 0) / median : 0;

    return {
      ...reel,
      multiplier: Math.round(multiplier * 100) / 100,
      medianViews: Math.round(median),
      medianLevel: level,
    };
  });

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <TopReelsClient
      reels={enrichedReels}
      models={filteredModels}
      groups={groups || []}
      profiles={profiles || []}
      tags={tags || []}
    />
  );
}
