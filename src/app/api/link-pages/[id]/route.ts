// CRUD: get, update, delete a single link page.

import { NextResponse } from "next/server";
import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  return user;
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("link_pages")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ page: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // Allow-list of editable columns. Anything else is silently dropped.
  const patch: Record<string, any> = {};
  for (const k of [
    "slug", "display_name", "bio", "avatar_url", "background_url",
    "blocks", "theme", "is_published",
  ]) {
    if (k in body) patch[k] = body[k];
  }

  if ("slug" in patch) {
    const s = patch.slug;
    if (typeof s !== "string" || !/^[a-z0-9_-]{1,40}$/.test(s)) {
      return NextResponse.json({ error: "invalid slug" }, { status: 400 });
    }
  }

  const supabase = createServiceClient();

  // If slug is changing, ensure no collision
  if ("slug" in patch) {
    const { data: clash } = await supabase
      .from("link_pages")
      .select("id")
      .eq("slug", patch.slug)
      .is("domain_id", null)
      .neq("id", params.id)
      .maybeSingle();
    if (clash) return NextResponse.json({ error: "slug already taken" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("link_pages")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("link_pages").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
