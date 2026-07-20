// Shared reels fetch for the posts page.
//
// Used by the posts page (short recent window for an instant first paint of
// the default "Last 7 Days" view) and by /api/posts/history (all reels, in
// the background for longer date ranges).
//
// Reels are fetched FLAT (profile_id only, no nested profile/model/group
// join) — the nested join was the dominant cost (~35s for all reels). The
// client re-attaches profile/model/group from the already-loaded lookup
// arrays.
//
// Pages are fetched in parallel after a count. Order is by id (the primary
// key) so each offset page is an index walk — fast and stable across
// parallel requests. Ordering by current_views instead would force an
// unindexed sort on every page and, run 20-wide, took 30-90s. The client
// re-sorts by the user's chosen metric anyway, so fetch order is irrelevant.

const PAGE_SIZE = 1000;

const REELS_SELECT =
  "id, shortcode, thumbnail_url, reel_url, caption, posted_at, current_views, current_likes, current_comments, current_shares, is_viral_tracked, last_daily_views, profile_id";

export async function fetchReels(supabase: any, sinceIso?: string): Promise<any[]> {
  const countQuery = supabase.from("reels").select("id", { count: "exact", head: true });
  const { count } = await (sinceIso ? countQuery.gte("posted_at", sinceIso) : countQuery);

  const total = count || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const requests = [];
  for (let p = 0; p < pageCount; p++) {
    let q = supabase
      .from("reels")
      .select(REELS_SELECT)
      .order("id", { ascending: true })
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
    if (sinceIso) q = q.gte("posted_at", sinceIso);
    requests.push(q);
  }

  const results = await Promise.all(requests);
  return results.flatMap((r: any) => r.data || []);
}
