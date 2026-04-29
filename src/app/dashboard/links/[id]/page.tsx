export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkEditorClient } from "@/components/link-editor-client";
import type { LinkPage, ProfileLite } from "@/lib/link-pages/types";

export default async function LinkEditorPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();

  const [{ data: page }, { data: pages }, { data: profiles }] = await Promise.all([
    supabase.from("link_pages").select("*").eq("id", params.id).maybeSingle(),
    // For the bulk-edit modal: every other page so the user can pick targets.
    supabase
      .from("link_pages")
      .select("id, slug, display_name, profile_id")
      .neq("id", params.id)
      .order("slug"),
    // For the profile-assignment dropdown — id, IG username, and the model
    // name so the dropdown can show context.
    supabase
      .from("profiles")
      .select("id, instagram_username, models(name, nickname)")
      .order("instagram_username"),
  ]);

  if (!page) notFound();

  const profilesLite: ProfileLite[] = (profiles || []).map((p: any) => ({
    id: p.id,
    instagram_username: p.instagram_username,
    model_name: p.models?.nickname || p.models?.name || null,
  }));

  return (
    <LinkEditorClient
      initialPage={page as LinkPage}
      otherPages={(pages || []) as { id: string; slug: string; display_name: string | null; profile_id: string | null }[]}
      profiles={profilesLite}
    />
  );
}
