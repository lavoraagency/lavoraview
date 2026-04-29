// CRUD: list + create link pages. Auth gate intentionally off for now
// to match the prior dashboard behaviour (no login was ever enforced).

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { newBlockId } from "@/lib/link-pages/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/link-pages — list all pages for the dashboard
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("link_pages")
    .select("id, slug, display_name, bio, avatar_url, background_url, is_published, view_count, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data || [] });
}

// POST /api/link-pages — create a new page.
//
// Two modes:
//   1. Plain create: body { slug, display_name?, bio? } — uses a default
//      Bouncy-style starter layout.
//   2. Duplicate from existing: body { slug, from: <pageId>, display_name? }
//      — server-side copy of blocks/theme/images so the client never has
//      to round-trip the full payload.
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { slug, display_name, bio, from } = body || {};

  if (typeof slug !== "string" || !/^[a-z0-9._-]{1,40}$/.test(slug)) {
    return NextResponse.json({ error: "invalid slug (lowercase a-z, 0-9, ., _, -, max 40 chars)" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Slug uniqueness check (Phase 1: globally unique since domain_id is null)
  const { data: existing } = await supabase
    .from("link_pages")
    .select("id")
    .eq("slug", slug)
    .is("domain_id", null)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "slug already taken" }, { status: 409 });
  }

  // Build the row to insert: either copy from an existing page or use defaults
  let insertRow: Record<string, any> = {
    slug,
    is_published: true,
  };

  if (typeof from === "string" && from) {
    const { data: src, error: srcErr } = await supabase
      .from("link_pages")
      .select("display_name, bio, avatar_url, background_url, background_original_url, blocks, theme")
      .eq("id", from)
      .maybeSingle();
    if (srcErr || !src) {
      return NextResponse.json({ error: "source page not found" }, { status: 404 });
    }
    // Regenerate block IDs so the duplicate's analytics don't collide with
    // the source's (link_clicks rows are scoped per page anyway, but unique
    // IDs make per-block dashboards clearer).
    const blocks = Array.isArray(src.blocks)
      ? src.blocks.map((b: any) => ({ ...b, id: newBlockId() }))
      : [];
    insertRow = {
      ...insertRow,
      display_name: display_name || src.display_name || slug,
      bio: src.bio || null,
      avatar_url: src.avatar_url || null,
      background_url: src.background_url || null,
      background_original_url: src.background_original_url || null,
      blocks,
      theme: src.theme || { buttonStyle: "glass" },
    };
  } else {
    // Default Bouncy-style starter blocks
    const defaultBlocks = [
      { id: newBlockId(), type: "header" },
      { id: newBlockId(), type: "image-card", imageUrl: "", title: "Lets become friends! 😋", url: "", overlayIcon: "of" },
      { id: newBlockId(), type: "link", title: "Onlyfans", url: "", icon: "of" },
      { id: newBlockId(), type: "link", title: "Fansly",   url: "", icon: "fansly" },
    ];
    insertRow = {
      ...insertRow,
      display_name: display_name || slug,
      bio: bio || null,
      blocks: defaultBlocks,
      theme: { buttonStyle: "glass" },
    };
  }

  const { data, error } = await supabase
    .from("link_pages")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
