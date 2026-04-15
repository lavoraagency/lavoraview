import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// POST /api/analyze-pattern
// Body: { column: "outfit" | "acting" | ..., reels: [{ shortcode, views, value, ...}] }
// Returns: { analysis: string }

const COLUMN_LABELS: Record<string, string> = {
  music: "Music (genre, volume, description)",
  speaking: "Speaking (purpose, summary)",
  text_goal: "Text Overlay (goal, content, purpose)",
  location: "Background Location",
  outfit: "Outfit",
  acting: "Acting / Behavior",
  camera: "Camera Setup",
  scroll_stopper: "Scroll Stopper",
  reward_ending: "Reward Ending",
  caption_type: "Caption Type",
  other: "Other Notable",
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const { column, reels } = await req.json();
    if (!column || !Array.isArray(reels) || reels.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const columnLabel = COLUMN_LABELS[column] || column;

    // Format reel data for the prompt
    const reelLines = reels
      .map((r: any, i: number) => `${i + 1}. [${r.views.toLocaleString()} views] ${r.value || "(empty)"}`)
      .join("\n");

    const prompt = `You are a social media pattern analyst for OnlyFans creator content. The dataset below contains ${reels.length} viral Instagram Reels (all performed above-average for their accounts). Your task is to analyze the "${columnLabel}" category and identify patterns that correlate with virality.

DATA (sorted by views, highest first):
${reelLines}

Provide a concise, actionable analysis in English. Focus on:

1. **Most common patterns**: What appears in the majority of these viral reels? Use concrete numbers (e.g. "8 out of 11 reels use...").

2. **Top performers**: What distinguishes the top 3-5 highest-viewed reels in this category specifically? What do they have in common that sets them apart?

3. **Recommendation**: Based on these patterns, what should creators do more of? Be specific and actionable.

Keep your response focused and under 250 words. Use markdown formatting with bold numbers. Do not repeat the raw data back.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("\n");

    return NextResponse.json({
      analysis: text,
      reelCount: reels.length,
      column: columnLabel,
    });
  } catch (e: any) {
    console.error("analyze-pattern error:", e);
    return NextResponse.json({ error: e.message || "Analysis failed" }, { status: 500 });
  }
}
