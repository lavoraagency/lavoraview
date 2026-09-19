export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PostsClient } from "@/components/posts-client";
import { fetchReels } from "@/lib/posts-data";
import { getReferenceData } from "@/lib/reference-data";

// The default view is "Last 7 Days", so on first paint we only need reels
// posted in the last ~8 days (a small tz buffer over the preset). The full
// reel history loads in the background via /api/posts/history.
const INITIAL_WINDOW_DAYS = 8;

export default async function PostsPage() {
  const supabase = createClient();

  const initialSince = new Date();
  initialSince.setDate(initialSince.getDate() - INITIAL_WINDOW_DAYS);

  const [{ models, groups, tags }, { data: profiles }, reels] =
    await Promise.all([
      getReferenceData(),
      supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
      fetchReels(supabase, initialSince.toISOString()),
    ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <PostsClient
      reels={reels || []}
      models={filteredModels}
      groups={groups}
      profiles={profiles || []}
      tags={tags}
    />
  );
}
