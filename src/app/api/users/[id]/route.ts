// User management — update (tabs / password) + delete a dashboard user.
// [id] is the auth user_id. Owner-only.

import { NextResponse } from "next/server";
import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { ALL_TAB_KEYS } from "@/lib/auth/tabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function caller(): Promise<{ role: "owner" | "employee" | null; userId: string | null }> {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { role: null, userId: null };
  return { role: user.app_metadata?.role === "owner" ? "owner" : "employee", userId: user.id };
}

function sanitizeTabs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is string => typeof t === "string" && ALL_TAB_KEYS.includes(t));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { role } = await caller();
  if (role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const supabase = createServiceClient();

  // Look up the target so we don't accidentally demote/lock out the owner.
  const { data: target } = await supabase
    .from("dashboard_users")
    .select("user_id, role")
    .eq("user_id", params.id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "not found" }, { status: 404 });

  const authUpdate: Record<string, any> = {};
  const rowUpdate: Record<string, any> = {};

  if ("allowed_tabs" in body && target.role !== "owner") {
    const tabs = sanitizeTabs(body.allowed_tabs);
    authUpdate.app_metadata = { role: "employee", allowed_tabs: tabs };
    rowUpdate.allowed_tabs = tabs;
  }
  if ("password" in body && body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
    }
    authUpdate.password = String(body.password);
    rowUpdate.display_password = String(body.password);
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(params.id, authUpdate);
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });
  }
  if (Object.keys(rowUpdate).length > 0) {
    const { error: rowErr } = await supabase
      .from("dashboard_users")
      .update(rowUpdate)
      .eq("user_id", params.id);
    if (rowErr) return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { role, userId } = await caller();
  if (role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (userId === params.id) {
    return NextResponse.json({ error: "you can't delete your own account" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Refuse to delete an owner account
  const { data: target } = await supabase
    .from("dashboard_users")
    .select("role")
    .eq("user_id", params.id)
    .maybeSingle();
  if (target?.role === "owner") {
    return NextResponse.json({ error: "can't delete an owner account" }, { status: 400 });
  }

  // Deleting the auth user cascades the dashboard_users row (FK on delete cascade)
  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
