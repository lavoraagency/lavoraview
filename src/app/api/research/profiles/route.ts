import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/research/profiles — add a new research profile
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let username = (body.instagram_username || "").trim();
    if (!username) {
      return NextResponse.json({ error: "Username fehlt" }, { status: 400 });
    }
    // Clean: strip @, strip instagram URL
    username = username.replace(/^@/, "");
    const urlMatch = username.match(/instagram\.com\/([^/?#]+)/i);
    if (urlMatch) username = urlMatch[1];
    username = username.toLowerCase();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("research_profiles")
      .insert({
        instagram_username: username,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Profil existiert bereits" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Unknown error" }, { status: 500 });
  }
}
