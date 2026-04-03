export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PostsClient } from "@/components/posts-client";

export default async function PostsPage() {
  const supabase = createClient();

  const [{ data: reels }, { data: models }, { data: groups }, { data: profiles }, { data: tags }] = await Promise.all([
    supabase
      .from("reels")
      .select(`
        id, shortcode, thumbnail_url, reel_url,
        posted_at, current_views, current_likes, current_comments, current_shares,
        is_viral_tracked, last_daily_views,
        profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
      `)
      .order("current_views", { ascending: false })
      .limit(2000),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, tags").eq("is_active", true).order("instagram_username"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  // Fetch recent reel snapshots (last 3 days) to compute daily view deltas
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  let allSnapshots: any[] = [];
  let snapOffset = 0;
  const snapPageSize = 1000;
  while (true) {
    const { data: batch, error: snapError } = await supabase
      .from("reel_snapshots")
      .select("reel_id, views, scraped_at")
      .gte("scraped_at", threeDaysAgo.toISOString())
      .order("scraped_at", { ascending: true })
      .range(snapOffset, snapOffset + snapPageSize - 1);
    if (snapError) { console.error("reel_snapshots error:", snapError.message); break; }
    if (!batch || batch.length === 0) break;
    allSnapshots = allSnapshots.concat(batch);
    if (batch.length < snapPageSize) break;
    snapOffset += snapPageSize;
  }
  console.log(`Loaded ${allSnapshots.length} reel snapshots from last 3 days`);

  // Group snapshots by reel_id, get last two distinct dates, compute delta
  const reelDailyGrowth: Record<string, number> = {};
  const byReel: Record<string, { views: number; date: string }[]> = {};
  for (const s of allSnapshots) {
    const date = s.scraped_at.split("T")[0];
    if (!byReel[s.reel_id]) byReel[s.reel_id] = [];
    byReel[s.reel_id].push({ views: s.views || 0, date });
  }
  for (const [reelId, snaps] of Object.entries(byReel)) {
    // Get latest snapshot per date
    const byDate: Record<string, number> = {};
    for (const s of snaps) {
      if (!byDate[s.date] || s.views > byDate[s.date]) {
        byDate[s.date] = s.views;
      }
    }
    const dates = Object.keys(byDate).sort();
    if (dates.length >= 2) {
      const latest = byDate[dates[dates.length - 1]];
      const previous = byDate[dates[dates.length - 2]];
      const delta = latest - previous;
      if (delta > 0) reelDailyGrowth[reelId] = delta;
    } else if (dates.length === 1) {
      // First time tracked — show total views as growth
      if (byDate[dates[0]] > 0) reelDailyGrowth[reelId] = byDate[dates[0]];
    }
  }

  return (
    <PostsClient
      reels={reels || []}
      models={filteredModels}
      groups={groups || []}
      profiles={profiles || []}
      tags={tags || []}
      reelDailyGrowth={reelDailyGrowth}
    />
  );
}
