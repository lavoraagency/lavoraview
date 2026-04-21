export const dynamic = 'force-dynamic';

import { createServiceClient } from "@/lib/supabase/server";
import { ResearchClient } from "@/components/research-client";

// Returns yesterday in Europe/London as YYYY-MM-DD (matches n8n scrape convention)
function getYesterdayLondon(): string {
  const london = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  london.setDate(london.getDate() - 1);
  return `${london.getFullYear()}-${String(london.getMonth() + 1).padStart(2, "0")}-${String(london.getDate()).padStart(2, "0")}`;
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = createServiceClient();
  const date = searchParams.date || getYesterdayLondon();

  // Load profiles and top reels in parallel
  const [profilesRes, snapshotsRes] = await Promise.all([
    supabase
      .from("research_profiles")
      .select("id, instagram_username, display_name, followers, profile_pic_url, is_active, last_scraped_at, last_scrape_error, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("research_reel_snapshots")
      .select(`
        id, research_reel_id, scraped_at, views, likes, comments, shares,
        views_delta, avg_views, multiplier, is_top,
        research_reels (
          id, instagram_reel_id, shortcode, caption, thumbnail_url, reel_url,
          video_cdn_url, video_storage_url, video_deleted_at, posted_at,
          is_pinned, research_profile_id,
          research_profiles ( id, instagram_username, display_name, profile_pic_url )
        )
      `)
      .eq("scraped_at", date)
      .eq("is_top", true)
      .order("multiplier", { ascending: false }),
  ]);

  // Flatten Supabase's array-shaped relations (to-one relations come back as arrays)
  const topReels = (snapshotsRes.data || []).map((s: any) => ({
    ...s,
    research_reels: Array.isArray(s.research_reels)
      ? {
          ...s.research_reels[0],
          research_profiles: Array.isArray(s.research_reels[0]?.research_profiles)
            ? s.research_reels[0].research_profiles[0] || null
            : s.research_reels[0]?.research_profiles || null,
        }
      : s.research_reels,
  }));

  return (
    <ResearchClient
      profiles={profilesRes.data || []}
      topReels={topReels}
      date={date}
    />
  );
}
