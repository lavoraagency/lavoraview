export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { ProfilesClient } from "@/components/profiles-client";

export default async function ProfilesPage() {
  const supabase = createClient();

  const [{ data: profiles }, { data: models }, { data: groups }, { data: tags }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, instagram_username, status, is_active, tags, va_name, editor_name, account_slot,
        models(id, name),
        account_groups(id, name, group_type),
        profile_snapshots(followers, total_reel_views, media_count, scraped_at)
      `)
      .order("instagram_username"),
    supabase.from("models").select("id, name").order("name"),
    supabase.from("account_groups").select("id, name, model_id, group_type").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  // Attach latest snapshot to each profile
  const profilesWithLatest = (profiles || []).map(p => {
    const snaps = ((p.profile_snapshots as any[]) || []).sort((a: any, b: any) =>
      new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );
    return {
      ...p,
      latestFollowers: snaps[0]?.followers ?? null,
      latestViews: snaps[0]?.total_reel_views ?? null,
      latestPosts: snaps[0]?.media_count ?? null,
      latestScrapedAt: snaps[0]?.scraped_at ?? null,
    };
  });

  return (
    <ProfilesClient
      initialProfiles={profilesWithLatest as any}
      models={models || []}
      groups={groups || []}
      tags={tags || []}
    />
  );
}
