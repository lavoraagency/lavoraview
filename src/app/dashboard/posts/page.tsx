export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PostsClient } from "@/components/posts-client";

export default async function PostsPage() {
  const supabase = createClient();

  const [{ data: reels }, { data: models }, { data: groups }, { data: profiles }, { data: tags }] = await Promise.all([
    supabase
      .from("reels")
      .select(`
        id, shortcode, thumbnail_url, reel_url, caption,
        posted_at, current_views, current_likes, current_comments, current_shares,
        is_viral_tracked, last_daily_views,
        profiles(id, instagram_username, model_id, tags, models(id, name, nickname), account_groups(id, name))
      `)
      .order("current_views", { ascending: false })
      .limit(2000),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, tags").eq("is_active", true).order("instagram_username"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <PostsClient
      reels={reels || []}
      models={filteredModels}
      groups={groups || []}
      profiles={profiles || []}
      tags={tags || []}
    />
  );
}
