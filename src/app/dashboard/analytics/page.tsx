export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "@/components/analytics-client";

export default async function AnalyticsPage() {
  const supabase = createClient();

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
  const snapshotFields = "profile_id, followers, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, scraped_at";
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

  // Fetch reel snapshots with profile_id for accurate daily delta calculation
  // Use direct profile_id column (preferred) with fallback to reels join
  const reelSnapshotFields = "views_delta,likes_delta,comments_delta,shares_delta,scraped_at,profile_id,reels(profile_id)";
  let allReelSnapshots: any[] = [];
  let rsOffset = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("reel_snapshots")
      .select(reelSnapshotFields)
      .gte("scraped_at", sixtyDaysAgo.toISOString())
      .order("scraped_at", { ascending: true })
      .range(rsOffset, rsOffset + pageSize - 1);
    if (!batch || batch.length === 0) break;
    allReelSnapshots = allReelSnapshots.concat(batch);
    if (batch.length < pageSize) break;
    rsOffset += pageSize;
  }

  // Aggregate reel snapshots: sum deltas per profile per date
  const reelDeltaMap: Record<string, { profile_id: string; date: string; views: number; likes: number; comments: number; shares: number }> = {};
  for (const rs of allReelSnapshots) {
    const profileId = rs.profile_id || rs.reels?.profile_id;
    if (!profileId) continue;
    const date = rs.scraped_at.split("T")[0];
    const key = `${date}|${profileId}`;
    if (!reelDeltaMap[key]) {
      reelDeltaMap[key] = { profile_id: profileId, date, views: 0, likes: 0, comments: 0, shares: 0 };
    }
    reelDeltaMap[key].views += rs.views_delta || 0;
    reelDeltaMap[key].likes += rs.likes_delta || 0;
    reelDeltaMap[key].comments += rs.comments_delta || 0;
    reelDeltaMap[key].shares += rs.shares_delta || 0;
  }
  const reelDailyDeltas = Object.values(reelDeltaMap);

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
