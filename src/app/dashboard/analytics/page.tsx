export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "@/components/analytics-client";
import { fetchAnalyticsTimeSeries } from "@/lib/analytics-data";

// The default view is "yesterday", so on first paint we only need a short
// recent window (yesterday + a couple of prior days for delta calc). The
// full 60-day history is loaded in the background by AnalyticsClient via
// /api/analytics/history. This keeps the initial render sub-second.
const INITIAL_WINDOW_DAYS = 4;
const HISTORY_DAYS = 60;

export default async function AnalyticsPage() {
  const supabase = createClient();

  const initialSince = new Date();
  initialSince.setDate(initialSince.getDate() - INITIAL_WINDOW_DAYS);

  // Earliest date the UI should offer in the picker, even though its data
  // arrives with the background history load.
  const historyMin = new Date();
  historyMin.setDate(historyMin.getDate() - HISTORY_DAYS);
  const minDate = historyMin.toISOString().split("T")[0];

  const [
    { data: profiles },
    { data: fbProfiles },
    { data: models },
    { data: groups },
    { data: tags },
    timeSeries,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, instagram_username, model_id, status, is_active, tags,
        models(id, name, nickname),
        account_groups(id, name)
      `)
      .order("instagram_username"),
    supabase
      .from("facebook_profiles")
      .select(`id, name, facebook_url, model_id, account_group_id, status, is_active, tags, models(id, name, nickname), account_groups(id, name)`)
      .eq("is_active", true)
      .order("name"),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
    fetchAnalyticsTimeSeries(supabase, initialSince),
  ]);

  // Normalize FB profiles to same shape as IG profiles
  const fbProfilesNorm = (fbProfiles || []).map((p: any) => ({
    ...p,
    instagram_username: p.name,
    platform: 'facebook',
  }));

  const allProfiles = [...(profiles || []).map((p: any) => ({ ...p, platform: 'instagram' })), ...fbProfilesNorm];

  // Filter models to only those with at least one profile
  const usedModelIds = new Set(allProfiles.map((p: any) => p.model_id || p.models?.id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <AnalyticsClient
      profiles={allProfiles as any}
      snapshots={timeSeries.snapshots}
      conversions={timeSeries.conversions}
      ofStats={timeSeries.ofStats}
      models={filteredModels}
      groups={groups || []}
      tags={tags || []}
      reelDailyDeltas={timeSeries.reelDailyDeltas}
      minDate={minDate}
    />
  );
}
