// User management — list + create dashboard users. Owner-only.

import { NextResponse } from "next/server";
import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { ALL_TAB_KEYS } from "@/lib/auth/tabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the calling user's role, or null when not logged in.
async function callerRole(): Promise<"owner" | "employee" | null> {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  return (user.app_metadata?.role === "owner" ? "owner" : "employee");
}

function sanitizeTabs(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((t): t is string => typeof t === "string" && ALL_TAB_KEYS.includes(t));
}

// GET /api/users — list all dashboard users
export async function GET() {
  const role = await callerRole();
  if (role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("dashboard_users")
    .select("id, user_id, email, role, allowed_tabs, created_at")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

// POST /api/users — create a new employee
export async function POST(req: Request) {
  const role = await callerRole();
  if (role !== "owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const allowedTabs = sanitizeTabs(body.allowed_tabs);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Create the auth user with role + tabs baked into app_metadata so the
  // middleware can gate routes straight from the JWT.
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "employee", allowed_tabs: allowedTabs },
  });
  if (createErr || !created?.user) {
    return NextResponse.json({ error: createErr?.message || "could not create user" }, { status: 400 });
  }

  // Mirror into dashboard_users for the management UI
  const { data: row, error: rowErr } = await supabase
    .from("dashboard_users")
    .insert({
      user_id: created.user.id,
      email,
      role: "employee",
      allowed_tabs: allowedTabs,
    })
    .select("id, user_id, email, role, allowed_tabs, created_at")
    .single();
  if (rowErr) {
    // Roll back the auth user so we don't leave an orphan
    await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({ user: row });
}
