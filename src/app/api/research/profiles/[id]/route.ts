import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// PATCH /api/research/profiles/[id] — pause/unpause
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const supabase = createServiceClient();
    const update: any = {};
    if (typeof body.is_active === "boolean") update.is_active = body.is_active;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("research_profiles")
      .update(update)
      .eq("id", params.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}

// DELETE /api/research/profiles/[id] — delete profile (cascades to reels + snapshots)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("research_profiles")
      .delete()
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
