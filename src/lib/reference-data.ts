// Shared reference data: models, account groups and tags.
//
// These three tables are tiny (17 / 19 / ~700 rows) and every dashboard page
// needs all three, so they live here instead of being spelled out per page.
// Each fetcher selects the SUPERSET of columns its call sites need — at
// these row counts the extra columns are free.
//
// NOT cached, deliberately. An earlier version wrapped these in
// unstable_cache with a 60s TTL; on a low-traffic dashboard the entry was
// almost always stale by the next page view, so nearly every request paid
// the cache overhead (lookup + query + write) and almost none got a hit.
// Users reported every page getting slower after it shipped. These queries
// take ~0.15s against Supabase — cheaper than the cache round trip.
// Revisit only with a measurement showing a real hit rate.

import { createServiceClient } from "@/lib/supabase/server";

export async function getModels() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("models")
    .select("id, name, nickname, max_recent_reels, viral_view_threshold")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function getAccountGroups() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("account_groups")
    .select("id, name, model_id, group_type")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function getTags() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .order("name");
  if (error) throw error;
  return data || [];
}

/** All three reference tables in one parallel batch.
 *
 * The fetchers above throw on error; here we swallow it and fall back to an
 * empty list, because these lists only drive filter dropdowns — losing them
 * should degrade a page, not break it. That matters during a Supabase
 * incident, which this project has seen more than once. */
export async function getReferenceData() {
  const safe = async (label: string, fn: () => Promise<any[]>) => {
    try {
      return await fn();
    } catch (e) {
      console.error(`[reference-data] ${label} failed:`, e);
      return [] as any[];
    }
  };
  const [models, groups, tags] = await Promise.all([
    safe("models", getModels),
    safe("account_groups", getAccountGroups),
    safe("tags", getTags),
  ]);
  return { models, groups, tags };
}

/** No-op kept so call sites don't have to change if caching returns.
 * Nothing is cached right now, so there is nothing to invalidate. */
export function revalidateReferenceData(..._which: ("models" | "groups" | "tags")[]) {
  /* intentionally empty — see the note at the top of this file */
}
