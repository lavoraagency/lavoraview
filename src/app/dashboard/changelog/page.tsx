export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { ChangelogClient } from "@/components/changelog-client";
import { getReferenceData } from "@/lib/reference-data";

export default async function ChangelogPage() {
  const supabase = createClient();

  const [{ data: changes }, { models, groups }, { data: profiles }, { data: analyses }] = await Promise.all([
    supabase.from("system_changes").select("*").order("change_date", { ascending: false }).order("created_at", { ascending: false }),
    getReferenceData(),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id").order("instagram_username"),
    supabase.from("ai_analyses").select("id, change_id, title, date_from, date_to, created_at, model_used, input_tokens, output_tokens").eq("type", "change_impact").order("created_at", { ascending: false }),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <ChangelogClient
      changes={changes || []}
      models={filteredModels}
      groups={groups}
      profiles={profiles || []}
      analyses={analyses || []}
    />
  );
}
