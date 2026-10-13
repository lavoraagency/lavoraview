"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { canAccessTab, getCurrentUserPerms } from "@/lib/auth/permissions";
import { getCreatorScope } from "@/lib/auth/creator-scope";

export async function getReelSnapshots(reelId: string) {
  const perms = await getCurrentUserPerms();
  if (!perms || !canAccessTab(perms, "posts")) return [];

  const supabase = createServiceClient();

  // A creator-restricted employee may only open reels of their creators.
  const scope = await getCreatorScope(perms);
  if (scope) {
    const { data: reel } = await supabase.from("reels").select("profile_id").eq("id", reelId).maybeSingle();
    if (!reel?.profile_id || !scope.profileIds.has(reel.profile_id)) return [];
  }

  const { data } = await supabase
    .from("reel_snapshots")
    .select("scraped_at, views, views_delta")
    .eq("reel_id", reelId)
    .order("scraped_at", { ascending: true });
  return data || [];
}
