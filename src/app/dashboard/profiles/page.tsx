export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { ProfilesClient } from "@/components/profiles-client";

export default async function ProfilesPage() {
  const supabase = createClient();

  const [
    { data: profiles },
    { data: fbProfiles },
    { data: models },
    { data: groups },
    { data: tags },
    { data: linkPages },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, instagram_username, status, is_active, tags, va_name, editor_name, account_slot,
        models(id, name, nickname),
        account_groups(id, name, group_type),
        profile_snapshots(followers, total_reel_views, media_count, scraped_at)
      `)
      .order("instagram_username"),
    supabase
      .from("facebook_profiles")
      .select(`
        id, facebook_url, name, status, is_active, tags, va_name, editor_name, model_id, account_group_id,
        models(id, name, nickname),
        account_groups(id, name, group_type),
        facebook_profile_snapshots(followers, total_reel_views, reels_tracked, scraped_at)
      `)
      .order("name"),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id, group_type").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase
      .from("link_pages")
      .select("slug, domain, profile_id")
      .not("profile_id", "is", null)
      .eq("is_published", true),
  ]);

  const linksByProfile = new Map<string, { slug: string; domain: string | null }[]>();
  for (const row of (linkPages || []) as { slug: string; domain: string | null; profile_id: string }[]) {
    const arr = linksByProfile.get(row.profile_id) || [];
    arr.push({ slug: row.slug, domain: row.domain });
    linksByProfile.set(row.profile_id, arr);
  }

  const igProfilesWithLatest = (profiles || []).map((p: any) => {
    const snaps = ((p.profile_snapshots as any[]) || []).sort((a: any, b: any) =>
      new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );
    return {
      ...p,
      platform: 'instagram',
      latestFollowers: snaps[0]?.followers ?? null,
      latestViews: snaps[0]?.total_reel_views ?? null,
      latestPosts: snaps[0]?.media_count ?? null,
      latestScrapedAt: snaps[0]?.scraped_at ?? null,
      links: linksByProfile.get(p.id) || [],
    };
  });

  const fbProfilesWithLatest = (fbProfiles || []).map((p: any) => {
    const snaps = ((p.facebook_profile_snapshots as any[]) || []).sort((a: any, b: any) =>
      new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );
    return {
      ...p,
      platform: 'facebook',
      instagram_username: p.name,
      latestFollowers: snaps[0]?.followers ?? null,
      latestViews: snaps[0]?.total_reel_views ?? null,
      latestPosts: snaps[0]?.reels_tracked ?? null,
      latestScrapedAt: snaps[0]?.scraped_at ?? null,
      links: [],
    };
  });

  const allProfiles = [...igProfilesWithLatest, ...fbProfilesWithLatest];

  return (
    <ProfilesClient
      initialProfiles={allProfiles as any}
      models={models || []}
      groups={groups || []}
      tags={tags || []}
    />
  );
}
