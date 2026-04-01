import { createServiceClient as createClient } from "@/lib/supabase/server";
import { PostsClient } from "@/components/posts-client";

export default async function PostsPage() {
  const supabase = createClient();

  const [{ data: reels }, { data: models }] = await Promise.all([
    supabase
      .from("reels")
      .select(`
        id, instagram_reel_id, shortcode, caption, thumbnail_url, reel_url,
        posted_at, current_views, current_likes, current_comments, current_shares,
        is_viral_tracked, last_daily_views,
        profiles(id, instagram_username, model_id, models(id, name), account_groups(id, name))
      `)
      .order("current_views", { ascending: false })
      .limit(500),
    supabase.from("models").select("id, name"),
  ]);

  return <PostsClient reels={reels || []} models={models || []} />;
}
