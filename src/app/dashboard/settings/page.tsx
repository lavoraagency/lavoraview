import { createServiceClient as createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings-client";
import { getSystemDescription, getAiDataSources } from "@/app/dashboard/settings/actions";
import { getCurrentUserPerms } from "@/lib/auth/permissions";
import { getModels, getTags } from "@/lib/reference-data";
import { attachAllowedModelIds } from "@/lib/auth/creator-scope";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const perms = await getCurrentUserPerms();
  const isOwner = perms?.role === "owner";

  const [models, tags, { data: profiles }, systemDescription, aiDataSources] = await Promise.all([
    // getModels selects the superset of columns, which includes the
    // max_recent_reels / viral_view_threshold this page edits.
    getModels(),
    getTags(),
    supabase.from("profiles").select("model_id").not("model_id", "is", null),
    getSystemDescription(),
    getAiDataSources(),
  ]);

  // Only owners get the user list (used by the user-management section).
  // Creators offered in the per-user creator picker — the same set the
  // Analytics creator dropdown lists: any model with an IG profile (active
  // or not) or an active FB profile.
  let users: any[] = [];
  let creatorOptions: { id: string; label: string }[] = [];
  if (isOwner) {
    const [{ data }, { data: activeFb }] = await Promise.all([
      supabase
        .from("dashboard_users")
        .select("id, user_id, email, role, allowed_tabs, display_password, created_at")
        .order("created_at", { ascending: true }),
      supabase.from("facebook_profiles").select("model_id").eq("is_active", true).not("model_id", "is", null),
    ]);
    users = await attachAllowedModelIds(data || []);

    const pickerModelIds = new Set([...(profiles || []), ...(activeFb || [])].map((p: any) => p.model_id));
    creatorOptions = (models || [])
      .filter((m: any) => pickerModelIds.has(m.id))
      .map((m: any) => ({ id: m.id, label: m.nickname || m.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const usedModelIds = new Set((profiles || []).map((p: any) => p.model_id));
  const filteredModels = (models || []).filter((m: any) => usedModelIds.has(m.id));

  return (
    <SettingsClient
      initialModels={filteredModels}
      initialTags={tags || []}
      initialSystemDescription={systemDescription}
      initialAiDataSources={aiDataSources}
      isOwner={isOwner}
      initialUsers={users}
      creatorOptions={creatorOptions}
    />
  );
}
