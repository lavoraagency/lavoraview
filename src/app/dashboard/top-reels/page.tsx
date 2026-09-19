export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { TopReelsClient } from "@/components/top-reels-client";
import { enrichReelsWithMultiplier, fetchAllReels } from "./utils";
import { getReferenceData } from "@/lib/reference-data";

export default async function TopReelsPage() {
  const supabase = createClient();

  // Everything in one parallel batch — the reel fetch used to run only
  // after the reference/profile queries had returned, serialising two
  // independent round trips for no reason.
  const [{ models, groups, tags }, { data: profiles }, allReels] = await Promise.all([
    getReferenceData(),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
    fetchAllReels(supabase),
  ]);

  // Build daily views map from last_daily_views (= yesterday's data)
  const dailyViewsMap: Record<string, number> = {};
  for (const reel of allReels) {
    dailyViewsMap[reel.id] = reel.last_daily_views || 0;
  }

  const enrichedReels = enrichReelsWithMultiplier(allReels, profiles || [], dailyViewsMap);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <TopReelsClient
      reels={enrichedReels}
      models={filteredModels}
      groups={groups}
      profiles={profiles || []}
      tags={tags}
    />
  );
}
