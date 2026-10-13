// Background history endpoint for the posts page. Returns every reel; the
// page renders instantly from a short recent window and the client pulls
// this in the background for longer date ranges.
//
// Requires a logged-in user with Posts access; a creator-restricted
// employee only gets reels of their creators' profiles.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchReels } from "@/lib/posts-data";
import { canAccessTab, getCurrentUserPerms } from "@/lib/auth/permissions";
import { getCreatorScope } from "@/lib/auth/creator-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const perms = await getCurrentUserPerms();
  if (!perms) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canAccessTab(perms, "posts")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const scope = await getCreatorScope(perms);
  const supabase = createServiceClient();
  const reels = await fetchReels(supabase, undefined, scope?.igProfileIds);
  return NextResponse.json({ reels }, { headers: { "Cache-Control": "no-store" } });
}
