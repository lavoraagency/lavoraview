"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function updateModel(modelId: string, data: { nickname?: string | null; max_recent_reels: number; viral_view_threshold: number }) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("models")
    .update({ nickname: data.nickname || null, max_recent_reels: data.max_recent_reels, viral_view_threshold: data.viral_view_threshold })
    .eq("id", modelId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function createTag(name: string, color: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: name.trim(), color })
    .select()
    .single();

  if (error) return { success: false, error: error.message, data: null };
  return { success: true, data };
}

export async function deleteTag(tagId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("tags").delete().eq("id", tagId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSystemDescription(): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "system_description")
    .maybeSingle();
  const val = data?.value;
  if (typeof val === "string") return val;
  if (val?.text && typeof val.text === "string") return val.text;
  return "";
}

export async function saveSystemDescription(text: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "system_description", value: { text }, updated_at: new Date().toISOString() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// AI data source toggles — which sections of raw data to include in analyses.
// Definitions live in /lib/ai-data-sources.ts (for client/server sharing).
import { DEFAULT_AI_DATA_SOURCES, type AiDataSourceKey } from "@/lib/ai-data-sources";

export async function getAiDataSources(): Promise<AiDataSourceKey[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ai_data_sources")
    .maybeSingle();
  const val = data?.value;
  if (Array.isArray(val)) return val as AiDataSourceKey[];
  if (val?.sources && Array.isArray(val.sources)) return val.sources;
  return DEFAULT_AI_DATA_SOURCES;
}

export async function saveAiDataSources(sources: AiDataSourceKey[]) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "ai_data_sources", value: { sources }, updated_at: new Date().toISOString() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
