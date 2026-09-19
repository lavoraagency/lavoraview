// Cached reference data: models, account groups and tags.
//
// These three tables are tiny (17 / 19 / ~700 rows) and change rarely, but
// every dashboard page re-fetched all of them on every single load — three
// round trips per page, on 8+ pages, for data that is effectively static.
//
// Each fetcher is cached by Next's Data Cache under its own tag. In-app
// edits (settings, the tags API) call revalidateReferenceData() so changes
// appear immediately. The TTL is the safety net for writes that happen
// OUTSIDE the app — the n8n scrapers also insert models/groups — so the
// worst-case staleness for those is REFERENCE_TTL_SECONDS.
//
// Each fetcher selects the SUPERSET of columns its call sites need, so one
// cache entry serves every page. At these row counts the extra columns are
// free, and it avoids a cache entry per column combination.

import { unstable_cache, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";

export const REFERENCE_TTL_SECONDS = 60;

export const REF_TAG = {
  models: "ref:models",
  groups: "ref:account_groups",
  tags: "ref:tags",
} as const;

export const getModels = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("models")
      .select("id, name, nickname, max_recent_reels, viral_view_threshold")
      .order("name");
    // Never cache a failure as an empty list — throw so the cache entry
    // isn't written and the next request retries.
    if (error) throw error;
    return data || [];
  },
  ["ref-models"],
  { revalidate: REFERENCE_TTL_SECONDS, tags: [REF_TAG.models] }
);

export const getAccountGroups = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("account_groups")
      .select("id, name, model_id, group_type")
      .order("name");
    if (error) throw error;
    return data || [];
  },
  ["ref-account-groups"],
  { revalidate: REFERENCE_TTL_SECONDS, tags: [REF_TAG.groups] }
);

export const getTags = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tags")
      .select("id, name, color")
      .order("name");
    if (error) throw error;
    return data || [];
  },
  ["ref-tags"],
  { revalidate: REFERENCE_TTL_SECONDS, tags: [REF_TAG.tags] }
);

/** All three reference tables at once.
 *
 * The fetchers above throw on error so a failure is never written to the
 * cache; here we swallow it and fall back to an empty list, because these
 * lists only drive filter dropdowns — losing them should degrade a page,
 * not break it. That matters during a Supabase incident, which this project
 * has seen more than once. */
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

/** Drop cached reference data after an in-app edit. Call from server
 * actions / route handlers only (revalidateTag isn't valid elsewhere). */
export function revalidateReferenceData(...which: (keyof typeof REF_TAG)[]) {
  const keys = which.length ? which : (Object.keys(REF_TAG) as (keyof typeof REF_TAG)[]);
  for (const k of keys) revalidateTag(REF_TAG[k]);
}
