// Creator scoping for employees.
//
// An employee can be limited to a subset of creators (models). On the
// creator-scoped tabs (Analytics, Posts) everything outside that subset is
// dropped SERVER-SIDE — before it is rendered or returned from an API — so
// the employee's totals are computed as if their creators were the whole
// agency, and other creators' data never reaches their browser.
//
// Owners and employees without a creator restriction get `null` (no scope),
// and every helper below is a no-op for `null`.

import { createServiceClient } from "@/lib/supabase/server";
import type { UserPerms } from "@/lib/auth/permissions";
import type { AnalyticsTimeSeries } from "@/lib/analytics-data";

export interface CreatorScope {
  modelIds: Set<string>;
  /** IG + FB profile ids belonging to those models (active or not, so
   * historical data of since-deactivated accounts still counts). */
  profileIds: Set<string>;
  igProfileIds: string[];
}

export async function getCreatorScope(perms: UserPerms | null): Promise<CreatorScope | null> {
  if (!perms || perms.role === "owner" || perms.allowedModelIds.length === 0) return null;

  const modelIds = perms.allowedModelIds;
  const supabase = createServiceClient();
  const [{ data: ig, error: igErr }, { data: fb, error: fbErr }] = await Promise.all([
    supabase.from("profiles").select("id").in("model_id", modelIds),
    supabase.from("facebook_profiles").select("id").in("model_id", modelIds),
  ]);
  // Fail closed: a scoped user must never fall back to seeing everything.
  if (igErr || fbErr) throw igErr || fbErr;

  const igProfileIds = (ig || []).map((p: any) => p.id as string);
  const fbProfileIds = (fb || []).map((p: any) => p.id as string);
  return {
    modelIds: new Set(modelIds),
    profileIds: new Set([...igProfileIds, ...fbProfileIds]),
    igProfileIds,
  };
}

/** Keep only rows whose model_id is in scope. */
export function scopeByModel<T extends { model_id?: string | null }>(rows: T[], scope: CreatorScope | null): T[] {
  if (!scope) return rows;
  return rows.filter((r) => !!r.model_id && scope.modelIds.has(r.model_id));
}

/** Keep only rows whose profile_id is in scope. */
export function scopeByProfile<T extends { profile_id?: string | null }>(rows: T[], scope: CreatorScope | null): T[] {
  if (!scope) return rows;
  return rows.filter((r) => !!r.profile_id && scope.profileIds.has(r.profile_id));
}

export function scopeTimeSeries(ts: AnalyticsTimeSeries, scope: CreatorScope | null): AnalyticsTimeSeries {
  if (!scope) return ts;
  return {
    snapshots: scopeByProfile(ts.snapshots, scope),
    conversions: scopeByProfile(ts.conversions, scope),
    ofStats: scopeByModel(ts.ofStats, scope),
    reelDailyDeltas: scopeByProfile(ts.reelDailyDeltas, scope),
  };
}

/** Attach each dashboard user's allowed_model_ids (which live only in auth
 * app_metadata, not in dashboard_users) for the user-management UI. */
export async function attachAllowedModelIds<T extends { user_id: string }>(
  rows: T[]
): Promise<(T & { allowed_model_ids: string[] })[]> {
  const supabase = createServiceClient();
  const byId = new Map<string, string[]>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const ids = (u.app_metadata as any)?.allowed_model_ids;
      byId.set(u.id, Array.isArray(ids) ? ids : []);
    }
    if (data.users.length < 1000) break;
  }
  return rows.map((r) => ({ ...r, allowed_model_ids: byId.get(r.user_id) || [] }));
}
