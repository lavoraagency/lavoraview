// CRUD: list + create link pages.
// Auth: any logged-in dashboard user (matches existing dashboard policy).

import { NextResponse } from "next/server";
import { createClient as createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { newBlockId } from "@/lib/link-pages/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireUser() {
  const auth = createAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  return user;
}

// GET /api/link-pages — list all pages for the dashboard
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
