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
    { data: snapshots },
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
    supabase
      .from("profile_snapshots")
      .select("profile_id, followers, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, scraped_at")
      .gte("scraped_at", sixtyDaysAgo.toISOString())
      .order("scraped_at", { ascending: true }),
    supabase.from("models").select("id, name").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  return (
    <AnalyticsClient
      profiles={profiles || []}
      snapshots={snapshots || []}
      models={models || []}
      groups={groups || []}
      tags={tags || []}
    />
  );
}
