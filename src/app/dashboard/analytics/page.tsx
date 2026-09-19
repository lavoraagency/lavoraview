export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "@/components/analytics-client";
import { fetchAnalyticsTimeSeries } from "@/lib/analytics-data";
import { getReferenceData } from "@/lib/reference-data";

// The default view is "yesterday", so on first paint we only need a short
// recent window (yesterday + a couple of prior days for delta calc). The
// full 60-day history is loaded in the background by AnalyticsClient via
// /api/analytics/history. This keeps the initial render sub-second.
const INITIAL_WINDOW_DAYS = 4;
const HISTORY_DAYS = 60;

/** Rebuild the nested { models, account_groups } shape the client expects.
 *
 * The profile queries used to ask PostgREST to embed those relations, which
 * measured ~4x slower than a flat select (1.6s vs 0.42s on ~730 profiles).
 * Since the same models/groups lists are already loaded for the filter
 * dropdowns, joining them here costs nothing and keeps the component's
 * contract identical. */
function attachRelations(rows: any[], models: any[], groups: any[], platform: string) {
  const modelById = new Map(models.map((m: any) => [m.id, m]));
  const groupById = new Map(groups.map((g: any) => [g.id, g]));
  return rows.map((p: any) => {
    const m = p.model_id ? modelById.get(p.model_id) : null;
    const g = p.account_group_id ? groupById.get(p.account_group_id) : null;
    return {
      ...p,
      platform,
      models: m ? { id: m.id, name: m.name, nickname: m.nickname } : null,
      account_groups: g ? { id: g.id, name: g.name } : null,
    };
  });
}

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
    reference,
    timeSeries,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, instagram_username, model_id, account_group_id, status, is_active, tags")
      .order("instagram_username"),
    supabase
      .from("facebook_profiles")
      .select("id, name, facebook_url, model_id, account_group_id, status, is_active, tags")
      .eq("is_active", true)
      .order("name"),
    getReferenceData(),
    // baselineSince lets the short window pull each profile's prior snapshot
    // (up to 60 days back) so follower/interaction deltas are correct
    // immediately and don't jump when the background history loads.
    fetchAnalyticsTimeSeries(supabase, initialSince, { baselineSince: historyMin }),
  ]);

  const { models, groups, tags } = reference;

  // Normalize FB profiles to same shape as IG profiles
  const fbProfilesNorm = attachRelations(
    (fbProfiles || []).map((p: any) => ({ ...p, instagram_username: p.name })),
    models, groups, "facebook"
  );

  const allProfiles = [
    ...attachRelations(profiles || [], models, groups, "instagram"),
    ...fbProfilesNorm,
  ];

  // Filter models to only those with at least one profile
  const usedModelIds = new Set(allProfiles.map((p: any) => p.model_id || p.models?.id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <AnalyticsClient
      profiles={allProfiles as any}
      snapshots={timeSeries.snapshots}
      conversions={timeSeries.conversions}
      ofStats={timeSeries.ofStats}
      models={filteredModels}
      groups={groups}
      tags={tags}
      reelDailyDeltas={timeSeries.reelDailyDeltas}
      minDate={minDate}
    />
  );
}
