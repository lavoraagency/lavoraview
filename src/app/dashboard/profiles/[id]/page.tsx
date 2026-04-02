import { createServiceClient as createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProfileDetailClient } from "@/components/profile-detail-client";

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: profile }, { data: reels }, { data: snapshots }, { data: tags }, { data: conversions }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`*, models(id, name, viral_view_threshold), account_groups(id, name)`)
      .eq("id", params.id)
      .single(),
    supabase
      .from("reels")
      .select(`*, reel_snapshots(views, views_delta, scraped_at)`)
      .eq("profile_id", params.id)
      .order("current_views", { ascending: false })
      .limit(50),
    supabase
      .from("profile_snapshots")
      .select("followers, total_reel_views, scraped_at")
      .eq("profile_id", params.id)
      .order("scraped_at", { ascending: true })
      .limit(30),
    supabase.from("tags").select("id, name, color"),
    supabase
      .from("conversion_snapshots")
      .select("date, link_clicks, new_subs")
      .eq("profile_id", params.id)
      .order("date", { ascending: true })
      .limit(60),
  ]);

  if (!profile) notFound();

  return (
    <ProfileDetailClient
      profile={profile as any}
      reels={reels || []}
      snapshots={snapshots || []}
      conversions={conversions || []}
      allTags={tags || []}
    />
  );
}
