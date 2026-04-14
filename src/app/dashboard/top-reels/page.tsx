export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { TopReelsClient } from "@/components/top-reels-client";

const REELS_PER_PROFILE = 36;
const MIN_REELS_FOR_MEDIAN = 3; // Minimum reels needed for a meaningful median

function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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

  // Group reels by profile_id and compute median views per profile
  const reelsByProfile: Record<string, any[]> = {};
  for (const reel of allReels) {
    const pid = reel.profile_id;
    if (!pid) continue;
    if (!reelsByProfile[pid]) reelsByProfile[pid] = [];
    reelsByProfile[pid].push(reel);
  }

  // For each profile, store the recent reels list (for per-reel median calculation)
  const recentByProfile: Record<string, any[]> = {};
  for (const [pid, reels] of Object.entries(reelsByProfile)) {
    recentByProfile[pid] = reels.slice(0, REELS_PER_PROFILE);
  }

  // Enrich each reel with multiplier and medianViews
  // Median is computed EXCLUDING the reel itself to avoid self-comparison
  const enrichedReels = allReels.map(reel => {
    const pid = reel.profile_id;
    const recent = recentByProfile[pid] || [];

    // Get views of OTHER reels in this profile (exclude current reel)
    const otherViews = recent
      .filter((r: any) => r.id !== reel.id)
      .map((r: any) => r.current_views || 0)
      .filter((v: number) => v > 0);

    // Need at least MIN_REELS_FOR_MEDIAN other reels for a meaningful comparison
    const median = otherViews.length >= MIN_REELS_FOR_MEDIAN ? computeMedian(otherViews) : 0;
    const multiplier = median > 0 ? (reel.current_views || 0) / median : 0;

    return {
      ...reel,
      multiplier: Math.round(multiplier * 100) / 100,
      medianViews: Math.round(median),
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
