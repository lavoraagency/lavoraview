export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/server";
import { LinkPagesListClient } from "@/components/link-pages-list-client";

export default async function LinkPagesPage() {
  const supabase = createServiceClient();
  const { data: pages } = await supabase
    .from("link_pages")
    .select("id, slug, display_name, bio, avatar_url, background_url, is_published, view_count, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return <LinkPagesListClient initialPages={pages || []} />;
}
