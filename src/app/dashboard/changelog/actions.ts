"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ChangeScope = "global" | "model" | "group" | "profile";

export interface NewChange {
  change_date: string; // YYYY-MM-DD
  category: string;
  title: string;
  description?: string;
  hypothesis?: string;
  scope: ChangeScope;
  affected_model_ids?: string[];
  affected_group_ids?: string[];
  affected_profile_ids?: string[];
  tags?: string[];
}

export async function createChange(change: NewChange) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("system_changes")
    .insert({
      change_date: change.change_date,
      category: change.category,
      title: change.title,
      description: change.description || null,
      hypothesis: change.hypothesis || null,
      scope: change.scope,
      affected_model_ids: change.affected_model_ids || [],
      affected_group_ids: change.affected_group_ids || [],
      affected_profile_ids: change.affected_profile_ids || [],
      tags: change.tags || [],
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/changelog");
  return { success: true, data };
}

export async function deleteChange(id: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("system_changes").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/changelog");
  return { success: true };
}

export async function updateChange(id: string, change: Partial<NewChange>) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("system_changes")
    .update({
      ...change,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard/changelog");
  return { success: true, data };
}
