export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PatternAnalysisClient } from "@/components/pattern-analysis-client";
import { getReferenceData } from "@/lib/reference-data";

const BATCH_SIZE = 1000;

/** Reels that carry a video_analysis blob, with their profile relation.
 *
 * Page 0 comes back with an exact count so the remaining pages can be
 * fetched in parallel rather than walked one at a time. */
async function fetchAnalysedReels(supabase: any) {
  const select = `
    id, shortcode, thumbnail_url, reel_url, caption,
    posted_at, current_views, current_likes, current_comments, current_shares,
    last_daily_views, video_analysis, video_storage_url, video_duration, profile_id,
    profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
  `;
  const page = (from: number, withCount: boolean) =>
    supabase
      .from("reels")
      .select(select, withCount ? { count: "exact" } : {})
      .not("video_analysis", "is", null)
      .order("current_views", { ascending: false })
      .range(from, from + BATCH_SIZE - 1);

  const first = await page(0, true);
  let rows: any[] = first.data || [];
  const total: number | null = first.count ?? null;

  if (total !== null && rows.length < total) {
    const pending = [];
    for (let off = BATCH_SIZE; off < total; off += BATCH_SIZE) pending.push(page(off, false));
    for (const r of await Promise.all(pending)) if (r?.data) rows = rows.concat(r.data);
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
