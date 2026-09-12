export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkPageAnalyticsClient } from "@/components/link-page-analytics-client";
import type { LinkPage } from "@/lib/link-pages/types";

// Covers the picker's largest preset ("Last 90 Days") so any preset the
// viewer picks is already in hand client-side — no extra round trip.
const HISTORY_DAYS = 90;

/** Calendar date string (YYYY-MM-DD) for a given instant, in London time —
 * matches the cutoff used by the link_clicks_daily_by_page DB function. */
function londonDateString(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export default async function LinkPageAnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_DAYS);
  const sinceStr = londonDateString(since);

  const [{ data: page }, { data: dailyClicks, error }] = await Promise.all([
    supabase.from("link_pages").select("*").eq("id", params.id).maybeSingle(),
    supabase.rpc("link_clicks_daily_by_page", { p_link_page_id: params.id, p_since: sinceStr }),
  ]);

  if (!page) notFound();
  if (error) console.error("[link-page-analytics] link_clicks_daily_by_page failed:", error);

  return (
    <LinkPageAnalyticsClient
      page={page as LinkPage}
      dailyClicks={(dailyClicks || []) as { date: string; clicks: number }[]}
      minDate={sinceStr}
    />
  );
}
