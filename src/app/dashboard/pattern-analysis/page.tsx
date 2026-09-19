export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PatternAnalysisClient } from "@/components/pattern-analysis-client";
import { getReferenceData } from "@/lib/reference-data";

const BATCH_SIZE = 1000;

/** Reels that carry a video_analysis blob, with their profile relation.
 *
 * Walked one page at a time on purpose: these rows carry large JSON blobs
 * (~2.8MB per page), and firing the pages concurrently piles load onto a
 * small Supabase instance for a saving of about a second. See the note on
 * fetchAllPages in lib/analytics-data.ts. */
async function fetchAnalysedReels(supabase: any) {
  const select = `
    id, shortcode, thumbnail_url, reel_url, caption,
    posted_at, current_views, current_likes, current_comments, current_shares,
    last_daily_views, video_analysis, video_storage_url, video_duration, profile_id,
    profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
  `;
  let rows: any[] = [];
  let from = 0;
  while (true) {
    const { data: batch } = await supabase
      .from("reels")
      .select(select)
      .not("video_analysis", "is", null)
      .order("current_views", { ascending: false })
      .range(from, from + BATCH_SIZE - 1);
    if (!batch || batch.length === 0) break;
    rows = rows.concat(batch);
    if (batch.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }
  return rows.filter((r: any) => r.video_analysis && !r.video_analysis.parse_error);
}

export default async function PatternAnalysisPage() {
  const supabase = createClient();

  const [{ models, groups, tags }, { data: profiles }, reels] = await Promise.all([
    getReferenceData(),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
    fetchAnalysedReels(supabase),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <PatternAnalysisClient
      reels={reels}
      models={filteredModels}
      groups={groups}
      profiles={profiles || []}
      tags={tags}
    />
  );
}
