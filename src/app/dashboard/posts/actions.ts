"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function getReelSnapshots(reelId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("reel_snapshots")
    .select("scraped_at, views, views_delta")
    .eq("reel_id", reelId)
    .order("scraped_at", { ascending: true });
  return data || [];
}
