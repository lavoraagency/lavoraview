// Server-side helpers for reading the current user's role + tab access.
//
// Role and allowed_tabs are stored in auth.users.app_metadata (set via
// the admin API on create/update), so they ride along in the session JWT
// and getUser() returns them without an extra DB query.

import { createClient } from "@/lib/supabase/server";

export type UserRole = "owner" | "employee";

export interface UserPerms {
  userId: string;
  email: string;
  role: UserRole;
  /** Tab keys this user may access. Empty + employee = no tabs. Ignored for owners. */
  allowedTabs: string[];
}

/** Returns the current user's permissions, or null when not logged in. */
export async function getCurrentUserPerms(): Promise<UserPerms | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.app_metadata || {}) as Record<string, unknown>;
  const role = (meta.role === "owner" ? "owner" : "employee") as UserRole;
  const allowedTabs = Array.isArray(meta.allowed_tabs) ? (meta.allowed_tabs as string[]) : [];
  return { userId: user.id, email: user.email || "", role, allowedTabs };
}

export function canAccessTab(perms: UserPerms, tabKey: string): boolean {
  if (perms.role === "owner") return true;
  return perms.allowedTabs.includes(tabKey);
}

/** The tab the user should land on (first allowed). Falls back to settings. */
export function firstAllowedTab(perms: UserPerms): string {
  if (perms.role === "owner") return "analytics";
  return perms.allowedTabs[0] || "settings";
}
