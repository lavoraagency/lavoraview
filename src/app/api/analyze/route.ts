import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";
import { collectData } from "@/lib/ai-data-collector";

// Longer timeout for Opus — can take 1-2 minutes
export const maxDuration = 300;

const DEFAULT_SYSTEM_DESCRIPTION = `We are an OnlyFans creator marketing agency. We run multiple Instagram accounts (Reels) to drive viewers to tracking links that lead to OnlyFans subscriptions.

Structure:
- Models (creators): the actual OF creators (e.g. Stephanie, Amalia). Each model has multiple Instagram accounts.
- Account Groups: sub-groupings of accounts per model (e.g. "Normal Stephanie", "Special Stephanie", "AI Branding Stephanie")
- Profiles: individual Instagram accounts
- Reels: individual Instagram Reels posted on these profiles

Metrics:
- followers, daily_views, daily_likes, daily_comments, daily_shares: from profile scraping (Instagram)
- link_clicks: taps on the bio tracking link → short.io link
- new_subs: new OnlyFans subscribers attributable to that account (from conversion tracking)
- reels_tracked: how many reels the scraper tracks for a profile (usually the 36 most recent)
- video_analysis: AI-analyzed patterns of each viral reel (outfit, music, speaking, text overlay, location, acting, camera, scroll stopper, reward ending, caption type)

Funnel: Reel views → Link Clicks → New Subs. More views should lead to more clicks should lead to more subs — but not always linearly.

A "Top Reel" is a reel where daily views >= 2x the account's average views. A "Viral" reel has daily views above a model-specific threshold.

When analyzing impact of changes, consider:
- Funnel correlation: did only views change, or clicks, or subs?
- Account-level variance: a global average can hide that one model improved while another worsened
- Confounding: other system_changes in the same window
- Seasonality/weekday effects if the window is short
`;

async function getSystemDescription(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "system_description")
    .single();
  const val = data?.value;
  if (typeof val === "string" && val.trim()) return val;
  if (val?.text && typeof val.text === "string" && val.text.trim()) return val.text;
  return DEFAULT_SYSTEM_DESCRIPTION;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type, changeId, query, scope, modelIds = [], groupIds = [], profileIds = [], dateFrom, dateTo, language } = body;

    if (!type || !scope || !dateFrom || !dateTo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (type === "change_impact" && !changeId) {
      return NextResponse.json({ error: "changeId required for change_impact" }, { status: 400 });
    }
    if (type === "custom_query" && !query?.trim()) {
      return NextResponse.json({ error: "query required for custom_query" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const lang = language === "de" ? "de" : "en";

    // Load system description
    const systemDescription = await getSystemDescription(supabase);

    // Load change if needed
    let change: any = null;
    if (type === "change_impact" && changeId) {
      const { data } = await supabase.from("system_changes").select("*").eq("id", changeId).single();
      change = data;
      if (!change) {
        return NextResponse.json({ error: "Change not found" }, { status: 404 });
      }
    }

    // Collect all raw data
    const dataMarkdown = await collectData(supabase, {
      scope,
      modelIds,
      groupIds,
      profileIds,
      dateFrom,
      dateTo,
    });

    // Build the prompt
    const taskSection = type === "change_impact"
      ? `## Change to Analyze

**Date**: ${change.change_date}
**Category**: ${change.category}
**Title**: ${change.title}
**Scope**: ${change.scope}
**Description**: ${change.description || "(none)"}
**Hypothesis**: ${change.hypothesis || "(none)"}

The data below contains snapshots from **7 days before the change** up to **today**. Your job is to analyze whether this change had any impact — and whether the hypothesis held. Look at all metrics, look at individual accounts (not just averages), and consider confounding changes.`
      : `## User Question

The user wants an analysis of this system data. Here is their question:

> ${query}

Answer this question thoroughly by examining the raw data below.`;

    const instructions = lang === "de"
      ? `# Your Task

${type === "change_impact" ? "Analysiere den Impact der Änderung." : "Beantworte die Frage des Users."}

**Wichtig:**
- Schaue dir WIRKLICH alle Zahlen an, nicht nur Durchschnitte
- Vergleiche einzelne Accounts / Models / Groups
- Berücksichtige Zusammenhänge zwischen Views, Link Clicks und New Subs (Funnel)
- Wenn andere Changes im gleichen Zeitraum passiert sind, beziehe sie ein (Confounding)
- Sei konkret mit Zahlen und Profil-Namen
- Nenne konkrete Beispiele aus den Daten
- Wenn du Unklarheiten siehst, benenne sie

**Format:** Antworte auf DEUTSCH in Markdown mit klaren Sektionen. Nutze Headings (##), Listen (-), und **fett** für wichtige Zahlen. Konkrete Handlungsempfehlungen am Ende.`
      : `# Your Task

${type === "change_impact" ? "Analyze the impact of this change." : "Answer the user's question."}

**Important:**
- Actually look at ALL the numbers, not just averages
- Compare individual accounts / models / groups
- Consider the funnel: Views → Link Clicks → New Subs
- If other changes happened in the same window, factor them in (confounding)
- Be specific with numbers and profile names
- Cite concrete examples from the data
- Call out uncertainty when you see it

**Format:** Respond in ENGLISH in markdown with clear sections. Use headings (##), lists (-), and **bold** for important numbers. End with concrete recommendations.`;

    const fullPrompt = `# System Context

${systemDescription}

${taskSection}

# Raw Data

${dataMarkdown}

${instructions}`;

    // Call Claude Opus (fallback to Sonnet if Opus fails)
    const client = new Anthropic({ apiKey });

    let modelUsed = "claude-opus-4-5";
    let response: any;

    try {
      response = await client.messages.create({
        model: modelUsed,
        max_tokens: 4096,
        messages: [{ role: "user", content: fullPrompt }],
      });
    } catch (e: any) {
      console.warn("Opus failed, trying Sonnet:", e.message);
      modelUsed = "claude-sonnet-4-5";
      response = await client.messages.create({
        model: modelUsed,
        max_tokens: 4096,
        messages: [{ role: "user", content: fullPrompt }],
      });
    }

    const resultText = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    // Generate a short title for list display
    const title = type === "change_impact"
      ? `Impact: ${change.title.substring(0, 80)}`
      : (query || "").substring(0, 80) + (query && query.length > 80 ? "…" : "");

    // Save analysis
    const { data: saved, error: saveError } = await supabase
      .from("ai_analyses")
      .insert({
        type,
        change_id: changeId || null,
        query: query || null,
        date_from: dateFrom,
        date_to: dateTo,
        scope,
        model_ids: modelIds,
        group_ids: groupIds,
        profile_ids: profileIds,
        title,
        result_markdown: resultText,
        model_used: modelUsed,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save analysis:", saveError);
    }

    return NextResponse.json({
      id: saved?.id,
      result: resultText,
      title,
      model_used: modelUsed,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  } catch (e: any) {
    console.error("analyze error:", e);
    return NextResponse.json({ error: e.message || "Analysis failed" }, { status: 500 });
  }
}
