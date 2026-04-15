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

    const { column, reels, language } = await req.json();
    if (!column || !Array.isArray(reels) || reels.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const columnLabel = COLUMN_LABELS[column] || column;
    const lang = language === "de" ? "de" : "en";

    // Format reel data for the prompt
    const reelLines = reels
      .map((r: any, i: number) => `${i + 1}. [${r.views.toLocaleString()} views] ${r.value || "(empty)"}`)
      .join("\n");

    const languageInstruction = lang === "de"
      ? `Schreibe die Analyse auf DEUTSCH. Die Rohdaten sind englisch, aber deine Auswertung soll deutsch sein.`
      : `Write your analysis in ENGLISH.`;

    const sections = lang === "de"
      ? {
          s1: "## 🎯 Häufigste Muster",
          s1desc: "Was kommt in der Mehrheit dieser viralen Reels vor? Nutze konkrete Zahlen (z.B. \"8 von 11 Reels verwenden...\"). Als Liste mit 3-5 Bullet Points.",
          s2: "## 🏆 Top-Performer",
          s2desc: "Was unterscheidet die Top 3-5 höchst-gesehenen Reels in dieser Kategorie? Was haben sie gemeinsam, das sie abhebt?",
          s3: "## 💡 Empfehlung",
          s3desc: "Basierend auf diesen Mustern: Was sollten Creator mehr machen? Konkret und umsetzbar. Kurze Liste mit Action-Items."
        }
      : {
          s1: "## 🎯 Most Common Patterns",
          s1desc: "What appears in the majority of these viral reels? Use concrete numbers (e.g. \"8 out of 11 reels use...\"). As a list with 3-5 bullet points.",
          s2: "## 🏆 Top Performers",
          s2desc: "What distinguishes the top 3-5 highest-viewed reels in this category specifically? What do they have in common that sets them apart?",
          s3: "## 💡 Recommendation",
          s3desc: "Based on these patterns, what should creators do more of? Specific and actionable. Short list of action items."
        };

    const prompt = `You are a social media pattern analyst for OnlyFans creator content. The dataset below contains ${reels.length} viral Instagram Reels (all performed above-average for their accounts). Your task is to analyze the "${columnLabel}" category and identify patterns that correlate with virality.

DATA (sorted by views, highest first):
${reelLines}

${languageInstruction}

Format your response in markdown with EXACTLY these three sections (use the exact headings with emojis):

${sections.s1}
${sections.s1desc}

${sections.s2}
${sections.s2desc}

${sections.s3}
${sections.s3desc}

Use **bold** for numbers and key findings. Use bullet lists (starting with "- ") where appropriate. Keep the total response under 300 words. Do not repeat the raw data back. Do not add any other headings or sections.`;

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
