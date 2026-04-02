import { createServiceClient as createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProfileDetailClient } from "@/components/profile-detail-client";

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: profile }, { data: reels }, { data: snapshots }, { data: tags }] = await Promise.all([
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
  ]);

  if (!profile) notFound();

  return (
    <ProfileDetailClient
      profile={profile as any}
      reels={reels || []}
      snapshots={snapshots || []}
      allTags={tags || []}
    />
  );
}
