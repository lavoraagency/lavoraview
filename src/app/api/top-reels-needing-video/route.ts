import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { enrichReelsWithMultiplier, fetchAllReels } from "@/app/dashboard/top-reels/utils";

// GET /api/top-reels-needing-video
// Returns reels with multiplier >= 2x that have a video_cdn_url but no video_storage_url yet.
// Called by the n8n Video Download workflow after the daily scrape.
//
// Query params:
//   date (optional) - YYYY-MM-DD, defaults to yesterday
//
// Response: { reels: [{ id, shortcode, video_cdn_url, multiplier, username }] }

export async function GET(req: NextRequest) {
  try {
    // Simple auth: check for API key header
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, instagram_username, model_id, account_group_id, tags, is_active, status");

    // Fetch all reels
    const allReels = await fetchAllReels(supabase);

    // Build daily views map from last_daily_views (yesterday's data)
    const dailyViewsMap: Record<string, number> = {};
    for (const reel of allReels) {
      dailyViewsMap[reel.id] = reel.last_daily_views || 0;
    }

    // Enrich with multiplier
    const enriched = enrichReelsWithMultiplier(allReels, profiles || [], dailyViewsMap);

    // Filter: multiplier >= 2x AND has video_cdn_url
    const needingVideo = enriched.filter((r: any) => {
      if ((r.multiplier || 0) < 2.0) return false;
      if ((r.dailyViews || 0) <= 0) return false;
      if (!r.video_cdn_url) return false;
      return true;
    });

    return NextResponse.json({
      count: needingVideo.length,
      reels: needingVideo.map((r: any) => ({
        id: r.id,
        shortcode: r.shortcode,
        video_cdn_url: r.video_cdn_url,
        multiplier: r.multiplier,
        daily_views: r.dailyViews,
        username: r.profiles?.instagram_username || "",
        caption: r.caption || "",
      })),
    });
  } catch (e: any) {
    console.error("top-reels-needing-video error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
