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
        models(id, name),
        account_groups(id, name)
      `)
      .eq("is_active", true)
      .order("instagram_username"),
    supabase.from("models").select("id, name").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

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

  return (
    <AnalyticsClient
      profiles={profiles || []}
      snapshots={snapshots || []}
      conversions={conversions || []}
      models={models || []}
      groups={groups || []}
      tags={tags || []}
    />
  );
}
