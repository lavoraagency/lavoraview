// Image upload to the link-page-assets bucket. Returns the public URL.
// The editor calls this when the user picks a file in any image picker.
// Auth intentionally off to match the dashboard's no-login behaviour.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "link-page-assets";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  const pageId = (form.get("page_id") as string) || "shared";
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too large (>10MB)" }, { status: 413 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "unsupported type" }, { status: 415 });

  const ext = file.type.split("/")[1] || "jpg";
  const path = `${pageId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const supabase = createServiceClient();
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
