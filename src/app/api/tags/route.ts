import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/tags — update tags on a profile, optionally create new tag
export async function POST(req: NextRequest) {
  try {
    const { profileId, tags, newTag } = await req.json();
    const supabase = createServiceClient();

    // If a new tag name was provided, create it in the tags table first
    if (newTag?.name) {
      const existing = await supabase
        .from("tags")
        .select("id")
        .eq("name", newTag.name)
        .maybeSingle();

      if (!existing.data) {
        const colors = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16"];
        const color = newTag.color || colors[Math.floor(Math.random() * colors.length)];
        await supabase.from("tags").insert({ name: newTag.name, color });
      }
    }

    // Update the profile's tags array
    const { error } = await supabase
      .from("profiles")
      .update({ tags })
      .eq("id", profileId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return all tags so client can refresh dropdown
    const { data: allTags } = await supabase
      .from("tags")
      .select("id, name, color")
      .order("name");

    return NextResponse.json({ ok: true, allTags });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
