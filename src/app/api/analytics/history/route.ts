// Background history endpoint for the analytics page.
//
// The page renders instantly from a short recent window; the client then
// calls this to pull the full 60-day time series for trend charts and
// longer date ranges. Same data the page used to fetch synchronously —
// just moved off the critical render path.
//
// Requires a logged-in user with Analytics access, and applies the same
// creator scope as the page so a restricted employee only gets their
// creators' data.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAnalyticsTimeSeries } from "@/lib/analytics-data";
import { canAccessTab, getCurrentUserPerms } from "@/lib/auth/permissions";
import { getCreatorScope, scopeTimeSeries } from "@/lib/auth/creator-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const perms = await getCurrentUserPerms();
  if (!perms) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canAccessTab(perms, "analytics")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const verify = new URL(req.url).searchParams.get("verify") === "1";

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const supabase = createServiceClient();
  const [data, scope] = await Promise.all([
    fetchAnalyticsTimeSeries(supabase, sixtyDaysAgo, { verify }),
    getCreatorScope(perms),
  ]);

  return NextResponse.json(scopeTimeSeries(data, scope), {
    headers: { "Cache-Control": "no-store" },
  });
}
