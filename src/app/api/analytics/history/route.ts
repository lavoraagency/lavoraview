// Background history endpoint for the analytics page.
//
// The page renders instantly from a short recent window; the client then
// calls this to pull the full 60-day time series for trend charts and
// longer date ranges. Same data the page used to fetch synchronously —
// just moved off the critical render path.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAnalyticsTimeSeries } from "@/lib/analytics-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const verify = new URL(req.url).searchParams.get("verify") === "1";

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const supabase = createServiceClient();
  const data = await fetchAnalyticsTimeSeries(supabase, sixtyDaysAgo, { verify });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
