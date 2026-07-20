// Background history endpoint for the posts page. Returns every reel; the
// page renders instantly from a short recent window and the client pulls
// this in the background for longer date ranges.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchReels } from "@/lib/posts-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();
  const reels = await fetchReels(supabase);
  return NextResponse.json({ reels }, { headers: { "Cache-Control": "no-store" } });
}
