export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PatternAnalysisClient } from "@/components/pattern-analysis-client";

export default async function PatternAnalysisPage() {
  const supabase = createClient();

  const [{ data: models }, { data: groups }, { data: profiles }, { data: tags }] = await Promise.all([
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  // Fetch all reels that have video_analysis (paginated)
  let reels: any[] = [];
  let from = 0;
  const batchSize = 1000;
  while (true) {
    const { data: batch } = await supabase
      .from("reels")
      .select(`
        id, shortcode, thumbnail_url, reel_url, caption,
        posted_at, current_views, current_likes, current_comments, current_shares,
        last_daily_views, video_analysis, video_storage_url, video_duration, profile_id,
        profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
      `)
      .not("video_analysis", "is", null)
      .order("current_views", { ascending: false })
      .range(from, from + batchSize - 1);
    if (!batch || batch.length === 0) break;
    reels = reels.concat(batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  // Filter out parse errors
  reels = reels.filter((r: any) => r.video_analysis && !r.video_analysis.parse_error);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <PatternAnalysisClient
      reels={reels}
      models={filteredModels}
      groups={groups || []}
      profiles={profiles || []}
      tags={tags || []}
    />
  );
}
