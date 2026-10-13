export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PostsClient } from "@/components/posts-client";
import { fetchReels } from "@/lib/posts-data";
import { getReferenceData } from "@/lib/reference-data";
import { getCurrentUserPerms } from "@/lib/auth/permissions";
import { getCreatorScope, scopeByModel, scopeModels } from "@/lib/auth/creator-scope";

// The default view is "Last 7 Days", so on first paint we only need reels
// posted in the last ~8 days (a small tz buffer over the preset). The full
// reel history loads in the background via /api/posts/history.
const INITIAL_WINDOW_DAYS = 8;

export default async function PostsPage() {
  const supabase = createClient();

  const initialSince = new Date();
  initialSince.setDate(initialSince.getDate() - INITIAL_WINDOW_DAYS);

  // Scope first: a creator-restricted employee's reel query is filtered to
  // their creators' profiles in the DB, not after the fact.
  const scope = await getCurrentUserPerms().then(getCreatorScope);

  const [reference, { data: allProfiles }, reels] =
    await Promise.all([
      getReferenceData(),
      supabase.from("profiles").select("id, instagram_username, model_id, account_group_id, tags, is_active, status").order("instagram_username"),
      fetchReels(supabase, initialSince.toISOString(), scope?.igProfileIds),
    ]);

  const { tags } = reference;
  const models = scopeModels(reference.models, scope);
  const groups = scopeByModel(reference.groups, scope);
  const profiles = scopeByModel(allProfiles || [], scope);

  const usedModelIds = new Set(profiles.map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <PostsClient
      reels={reels || []}
      models={filteredModels}
      groups={groups}
      profiles={profiles}
      tags={tags}
    />
  );
}
