"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getAnalysesByChange(changeId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ai_analyses")
    .select("id, title, date_from, date_to, created_at, model_used, input_tokens, output_tokens")
    .eq("change_id", changeId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getCustomAnalyses() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("ai_analyses")
    .select("id, title, query, date_from, date_to, scope, model_ids, group_ids, profile_ids, created_at, model_used, input_tokens, output_tokens")
    .eq("type", "custom_query")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getAnalysis(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("ai_analyses").select("*").eq("id", id).single();
  return data;
}


export async function deleteAnalysis(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("ai_analyses").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/changelog");
  revalidatePath("/dashboard/ai-assistant");
  return { success: true };
}
