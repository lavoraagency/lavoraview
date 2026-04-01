"use server";

import { createServiceClient } from "@/lib/supabase/server";

export async function updateModel(modelId: string, data: { max_recent_reels: number; viral_view_threshold: number }) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("models")
    .update({ max_recent_reels: data.max_recent_reels, viral_view_threshold: data.viral_view_threshold })
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
