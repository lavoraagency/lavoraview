import { createServiceClient as createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const supabase = createClient();

  const [{ data: models }, { data: tags }] = await Promise.all([
    supabase.from("models").select("id, name, nickname, max_recent_reels, viral_view_threshold").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
  ]);

  return <SettingsClient initialModels={models || []} initialTags={tags || []} />;
}
