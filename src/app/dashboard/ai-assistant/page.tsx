export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { AIAssistantClient } from "@/components/ai-assistant-client";
import { getReferenceData } from "@/lib/reference-data";

export default async function AIAssistantPage() {
  const supabase = createClient();

  const [{ models, groups }, { data: profiles }, { data: analyses }] = await Promise.all([
    getReferenceData(),
    supabase.from("profiles").select("id, instagram_username, model_id, account_group_id").order("instagram_username"),
    supabase.from("ai_analyses")
      .select("id, title, query, date_from, date_to, scope, model_ids, group_ids, profile_ids, created_at, model_used, input_tokens, output_tokens")
      .eq("type", "custom_query")
      .order("created_at", { ascending: false }),
  ]);

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id).filter(Boolean));
  const filteredModels = models.filter((m: any) => usedModelIds.has(m.id));

  return (
    <AIAssistantClient
      models={filteredModels}
      groups={groups}
      profiles={profiles || []}
      analyses={analyses || []}
    />
  );
}
