export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { TopReelsClient } from "@/components/top-reels-client";
import { enrichReelsWithMultiplier, fetchAllReels } from "./utils";

export default async function TopReelsPage() {
  const supabase = createClient();

  // Fetch all data in parallel
  const [{ data: models }, { data: groups }, { data: profiles }, { data: tags }] = await Promise.all([
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  const allReels = await fetchAllReels(supabase);

  // Build daily views map from last_daily_views (= yesterday's data)
  const dailyViewsMap: Record<string, number> = {};
  for (const reel of allReels) {
    dailyViewsMap[reel.id] = reel.last_daily_views || 0;
  }

  const enrichedReels = enrichReelsWithMultiplier(allReels, profiles || [], dailyViewsMap);

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
