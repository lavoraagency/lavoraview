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

// POST /api/link-pages — create a new page
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { slug, display_name, bio } = body || {};

  // slug validation: lowercase letters, digits, dashes, underscores; 1-40 chars
  if (typeof slug !== "string" || !/^[a-z0-9_-]{1,40}$/.test(slug)) {
    return NextResponse.json({ error: "invalid slug (lowercase a-z, 0-9, _, -, max 40 chars)" }, { status: 400 });
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

  // Default Bouncy-style starter blocks: header + 1 image card + 2 link buttons
  const defaultBlocks = [
    { id: newBlockId(), type: "header" },
    {
      id: newBlockId(),
      type: "image-card",
      imageUrl: "",
      title: "Lets become friends! 😋",
      url: "",
      overlayIcon: "of",
    },
    {
      id: newBlockId(),
      type: "link",
      title: "Onlyfans",
      url: "",
      icon: "of",
    },
    {
      id: newBlockId(),
      type: "link",
      title: "Fansly",
      url: "",
      icon: "fansly",
    },
  ];

  const { data, error } = await supabase
    .from("link_pages")
    .insert({
      slug,
      display_name: display_name || slug,
      bio: bio || null,
      blocks: defaultBlocks,
      theme: { buttonStyle: "glass" },
      is_published: true,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
