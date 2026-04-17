export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { ChangelogClient } from "@/components/changelog-client";

export default async function ChangelogPage() {
  const supabase = createClient();

  const [{ data: changes }, { data: models }, { data: groups }, { data: profiles }] = await Promise.all([
    supabase.from("system_changes").select("*").order("change_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("models").select("id, name, nickname").order("name"),
    supabase.from("account_groups").select("id, name, model_id").order("name"),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id").order("instagram_username"),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <ChangelogClient
      changes={changes || []}
      models={filteredModels}
      groups={groups || []}
      profiles={profiles || []}
    />
  );
}
