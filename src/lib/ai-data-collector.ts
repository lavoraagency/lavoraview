import type { SupabaseClient } from "@supabase/supabase-js";

export interface CollectDataOptions {
  scope: "global" | "model" | "group" | "profile";
  modelIds?: string[];
  groupIds?: string[];
  profileIds?: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  /**
   * Which data sections to include. If undefined, all are included.
   * Supported: 'profiles_info' | 'profile_daily' | 'conversions' | 'reels_in_period' | 'reel_snapshots' | 'video_analyses' | 'other_changes'
   */
  includedSources?: string[];
}

/**
 * Collects all relevant raw data for an AI analysis.
 * Returns a markdown string containing multiple sections with tables/CSVs.
 * Scope-filtered for efficiency.
 */
export async function collectData(supabase: SupabaseClient, opts: CollectDataOptions): Promise<string> {
  const { scope, modelIds = [], groupIds = [], profileIds = [], dateFrom, dateTo, includedSources } = opts;
  const include = (key: string) => !includedSources || includedSources.includes(key);

  // Resolve the list of profile IDs based on scope
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, instagram_username, model_id, account_group_id, status, is_active, tags, started_posting, va_name, editor_name");

  let targetProfileIds: string[] = [];
  const profiles = allProfiles || [];

  if (scope === "global") {
    targetProfileIds = profiles.map((p: any) => p.id);
  } else if (scope === "model") {
    targetProfileIds = profiles.filter((p: any) => modelIds.includes(p.model_id)).map((p: any) => p.id);
  } else if (scope === "group") {
    targetProfileIds = profiles.filter((p: any) => groupIds.includes(p.account_group_id)).map((p: any) => p.id);
  } else if (scope === "profile") {
    targetProfileIds = profileIds;
  }

  const profileSet = new Set(targetProfileIds);
  const scopedProfiles = profiles.filter((p: any) => profileSet.has(p.id));

  // Also load models and groups for display
  const [{ data: models }, { data: groups }] = await Promise.all([
    supabase.from("models").select("id, name, nickname"),
    supabase.from("account_groups").select("id, name, model_id"),
  ]);
  const modelMap = Object.fromEntries((models || []).map((m: any) => [m.id, m.nickname || m.name]));
  const groupMap = Object.fromEntries((groups || []).map((g: any) => [g.id, g.name]));

  // ISO timestamps for range queries
  const fromTs = `${dateFrom}T00:00:00+00:00`;
  const toTs = `${dateTo}T23:59:59+00:00`;

  // 1) profile_snapshots for these profiles in range (paginated)
  let profileSnapshots: any[] = [];
  {
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data } = await supabase
        .from("profile_snapshots")
        .select("profile_id, followers, following, media_count, total_reel_views, total_reel_likes, total_reel_comments, total_reel_shares, reels_tracked, daily_views, daily_likes, daily_comments, daily_shares, scraped_at")
        .in("profile_id", targetProfileIds.length > 0 ? targetProfileIds : ["00000000-0000-0000-0000-000000000000"])
        .gte("scraped_at", fromTs)
        .lte("scraped_at", toTs)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + limit - 1);
      if (!data || data.length === 0) break;
      profileSnapshots = profileSnapshots.concat(data);
      if (data.length < limit) break;
      offset += limit;
    }
  }

  // 2) conversion_snapshots for these profiles in range
  let conversions: any[] = [];
  {
    const { data } = await supabase
      .from("conversion_snapshots")
      .select("profile_id, date, link_clicks, new_subs")
      .in("profile_id", targetProfileIds.length > 0 ? targetProfileIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: true });
    conversions = data || [];
  }

  // 3) Reels posted in period for these profiles
  const { data: reelsInPeriod } = await supabase
    .from("reels")
    .select("id, shortcode, profile_id, posted_at, current_views, current_likes, current_comments, current_shares, is_viral_tracked, last_daily_views, video_analysis")
    .in("profile_id", targetProfileIds.length > 0 ? targetProfileIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("posted_at", fromTs)
    .lte("posted_at", toTs)
    .order("posted_at", { ascending: true });

  const reelsInPeriodArr = reelsInPeriod || [];

  // 4) reel_snapshots for those reels in date range
  const reelIds = reelsInPeriodArr.map((r: any) => r.id);
  let reelSnapshots: any[] = [];
  if (reelIds.length > 0) {
    let offset = 0;
    const limit = 1000;
    while (true) {
      const { data } = await supabase
        .from("reel_snapshots")
        .select("reel_id, views, views_delta, likes_delta, comments_delta, scraped_at")
        .in("reel_id", reelIds)
        .gte("scraped_at", fromTs)
        .lte("scraped_at", toTs)
        .order("scraped_at", { ascending: true })
        .range(offset, offset + limit - 1);
      if (!data || data.length === 0) break;
      reelSnapshots = reelSnapshots.concat(data);
      if (data.length < limit) break;
      offset += limit;
    }
  }

  // 5) system_changes in range (any scope — because cross-scope changes could matter)
  const { data: changesInWindow } = await supabase
    .from("system_changes")
    .select("id, change_date, category, title, description, hypothesis, scope, affected_model_ids, affected_group_ids, affected_profile_ids, tags")
    .gte("change_date", dateFrom)
    .lte("change_date", dateTo)
    .order("change_date", { ascending: true });

  // ── Build lookup maps for profiles
  const profileNameMap = Object.fromEntries(scopedProfiles.map((p: any) => [p.id, p.instagram_username]));
  const profileModelMap = Object.fromEntries(scopedProfiles.map((p: any) => [p.id, modelMap[p.model_id] || "?"]));
  const profileGroupMap = Object.fromEntries(scopedProfiles.map((p: any) => [p.id, groupMap[p.account_group_id] || "?"]));

  const reelShortcodeMap = Object.fromEntries(reelsInPeriodArr.map((r: any) => [r.id, r.shortcode]));

  // ── Format as markdown sections ──────────────────────────────
  const parts: string[] = [];

  // Scope summary
  parts.push(`## Scope\n`);
  parts.push(`- Scope: ${scope}`);
  parts.push(`- Date range: ${dateFrom} to ${dateTo}`);
  parts.push(`- Profiles included: ${scopedProfiles.length}`);
  parts.push(`- Reels posted in period: ${reelsInPeriodArr.length}`);
  parts.push(`- Total profile snapshots: ${profileSnapshots.length}`);
  parts.push(`- Conversion records: ${conversions.length}`);
  parts.push(``);

  // Profiles list
  if (include("profiles_info")) {
    parts.push(`## Profiles in Scope`);
    parts.push(`| username | model | group | status | active | tags |`);
    parts.push(`|---|---|---|---|---|---|`);
    for (const p of scopedProfiles) {
      const tags = (p.tags || []).join(",");
      parts.push(`| @${p.instagram_username} | ${modelMap[p.model_id] || "?"} | ${groupMap[p.account_group_id] || "?"} | ${p.status || "?"} | ${p.is_active ? "yes" : "no"} | ${tags} |`);
    }
    parts.push(``);
  }

  // Profile daily snapshots (CSV)
  if (include("profile_daily")) {
    parts.push(`## Daily Profile Snapshots (CSV)`);
    parts.push(`\`\`\`csv`);
    parts.push(`profile,date,followers,daily_views,daily_likes,daily_comments,daily_shares,reels_tracked,total_reel_views`);
    for (const s of profileSnapshots) {
      const date = s.scraped_at.split("T")[0];
      const user = profileNameMap[s.profile_id] || s.profile_id;
      parts.push(`${user},${date},${s.followers ?? ""},${s.daily_views ?? ""},${s.daily_likes ?? ""},${s.daily_comments ?? ""},${s.daily_shares ?? ""},${s.reels_tracked ?? ""},${s.total_reel_views ?? ""}`);
    }
    parts.push(`\`\`\``);
    parts.push(``);
  }

  // Conversions daily (CSV)
  if (include("conversions")) {
    parts.push(`## Conversions Daily (CSV)`);
    parts.push(`\`\`\`csv`);
    parts.push(`profile,date,link_clicks,new_subs`);
    for (const c of conversions) {
      const user = profileNameMap[c.profile_id] || c.profile_id;
      parts.push(`${user},${c.date},${c.link_clicks ?? 0},${c.new_subs ?? 0}`);
    }
    parts.push(`\`\`\``);
    parts.push(``);
  }

  // Reels posted in period (optionally with video analysis summary)
  if (include("reels_in_period")) {
    parts.push(`## Reels Posted In Period`);
    const showAnalysis = include("video_analyses");
    const headerCols = showAnalysis
      ? `| shortcode | profile | posted_at | current_views | current_likes | viral | video_analysis_summary |`
      : `| shortcode | profile | posted_at | current_views | current_likes | viral |`;
    const separatorCols = showAnalysis
      ? `|---|---|---|---|---|---|---|`
      : `|---|---|---|---|---|---|`;
    parts.push(headerCols);
    parts.push(separatorCols);
    for (const r of reelsInPeriodArr) {
      const user = profileNameMap[r.profile_id] || r.profile_id;
      const postedDate = r.posted_at ? r.posted_at.split("T")[0] : "?";
      if (showAnalysis) {
        const a = r.video_analysis;
        let summary = "—";
        if (a && !a.parse_error) {
          const parts2: string[] = [];
          if (a.sound_music?.has_music) parts2.push(`music:${a.sound_music.genre || "?"}`);
          if (a.sound_speaking?.has_speaking) parts2.push(`speaking:${a.sound_speaking.speaking_purpose || "?"}`);
          if (a.text_overlay?.has_text) parts2.push(`text:${a.text_overlay.text_goal || "?"}`);
          if (a.outfit) parts2.push(`outfit:${a.outfit.substring(0, 40)}`);
          if (a.acting) parts2.push(`acting:${a.acting.substring(0, 40)}`);
          if (a.background_location) parts2.push(`loc:${a.background_location}`);
          if (a.scroll_stopper?.has_scroll_stopper) parts2.push(`scroll_stop:yes`);
          if (a.caption_type?.type) parts2.push(`caption:${a.caption_type.type}`);
          summary = parts2.join("; ");
        }
        parts.push(`| ${r.shortcode} | @${user} | ${postedDate} | ${r.current_views ?? 0} | ${r.current_likes ?? 0} | ${r.is_viral_tracked ? "yes" : "no"} | ${summary.replace(/\|/g, "/")} |`);
      } else {
        parts.push(`| ${r.shortcode} | @${user} | ${postedDate} | ${r.current_views ?? 0} | ${r.current_likes ?? 0} | ${r.is_viral_tracked ? "yes" : "no"} |`);
      }
    }
    parts.push(``);
  }

  // Reel daily snapshots (CSV) — only for reels in period
  if (include("reel_snapshots")) {
    parts.push(`## Reel Daily Snapshots (CSV) — only reels posted in this period`);
    parts.push(`\`\`\`csv`);
    parts.push(`shortcode,date,views,views_delta,likes_delta,comments_delta`);
    for (const s of reelSnapshots) {
      const date = s.scraped_at.split("T")[0];
      const sc = reelShortcodeMap[s.reel_id] || s.reel_id;
      parts.push(`${sc},${date},${s.views ?? 0},${s.views_delta ?? 0},${s.likes_delta ?? 0},${s.comments_delta ?? 0}`);
    }
    parts.push(`\`\`\``);
    parts.push(``);
  }

  // Other changes in window
  if (include("other_changes")) {
    parts.push(`## System Changes In Window (other changes that happened in this time period — may confound analysis)`);
    if (!changesInWindow || changesInWindow.length === 0) {
      parts.push(`(none)`);
    } else {
      for (const c of changesInWindow) {
        parts.push(`### ${c.change_date} — ${c.category}: ${c.title}`);
        parts.push(`- Scope: ${c.scope}`);
        if (c.description) parts.push(`- Description: ${c.description}`);
        if (c.hypothesis) parts.push(`- Hypothesis: ${c.hypothesis}`);
        const affectedModels = (c.affected_model_ids || []).map((id: string) => modelMap[id]).filter(Boolean);
        const affectedGroups = (c.affected_group_ids || []).map((id: string) => groupMap[id]).filter(Boolean);
        if (affectedModels.length) parts.push(`- Affected Models: ${affectedModels.join(", ")}`);
        if (affectedGroups.length) parts.push(`- Affected Groups: ${affectedGroups.join(", ")}`);
        if (c.tags && c.tags.length) parts.push(`- Tags: ${c.tags.join(", ")}`);
        parts.push(``);
      }
    }
  }

  return parts.join("\n");
}
