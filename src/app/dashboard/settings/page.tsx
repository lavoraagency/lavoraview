import { createServiceClient as createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const supabase = createClient();

  const [{ data: models }, { data: tags }, { data: profiles }] = await Promise.all([
    supabase.from("models").select("id, name, nickname, max_recent_reels, viral_view_threshold").order("name"),
    supabase.from("tags").select("id, name, color").order("name"),
    supabase.from("profiles").select("model_id").not("model_id", "is", null),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return <SettingsClient initialModels={filteredModels} initialTags={tags || []} />;
}
