import { createServiceClient as createClient } from "@/lib/supabase/server";
import { SettingsClient } from "@/components/settings-client";
import { getSystemDescription, getAiDataSources } from "@/app/dashboard/settings/actions";
import { getCurrentUserPerms } from "@/lib/auth/permissions";
import { getModels, getTags } from "@/lib/reference-data";

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
  let users: any[] = [];
  if (isOwner) {
    const { data } = await supabase
      .from("dashboard_users")
      .select("id, user_id, email, role, allowed_tabs, display_password, created_at")
      .order("created_at", { ascending: true });
    users = data || [];
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
    />
  );
}
