import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 300;

interface FollowUpMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  input_tokens?: number;
  output_tokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const { analysisId, message } = await req.json();
    if (!analysisId || !message?.trim()) {
      return NextResponse.json({ error: "analysisId and message required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Load the analysis
    const { data: analysis, error: loadError } = await supabase
      .from("ai_analyses")
      .select("id, original_prompt, result_markdown, follow_up_messages, model_used")
      .eq("id", analysisId)
      .single();

    if (loadError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (!analysis.original_prompt) {
      return NextResponse.json({
        error: "This analysis is too old to support follow-ups (the original prompt wasn't saved). Follow-ups only work for analyses created after this feature was added."
      }, { status: 400 });
    }

    const existingMessages: FollowUpMessage[] = Array.isArray(analysis.follow_up_messages)
      ? analysis.follow_up_messages
      : [];

    // Build the Anthropic messages array:
    // 1. Original prompt (user) — cached for 5 min
    // 2. Original analysis result (assistant)
    // 3. All existing follow-up messages (user/assistant pairs)
    // 4. The new user message
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: analysis.original_prompt,
            cache_control: { type: "ephemeral" } as any,
          },
        ],
      },
      {
        role: "assistant",
        content: analysis.result_markdown || "(no prior analysis)",
      },
    ];

    for (const m of existingMessages) {
      messages.push({ role: m.role, content: m.content });
    }

    messages.push({ role: "user", content: message.trim() });

    const modelUsed = analysis.model_used || "claude-sonnet-4-5";
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: modelUsed,
      max_tokens: 4096,
      messages,
    });

    const responseText = response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const cachedTokens = (response.usage as any)?.cache_read_input_tokens ?? 0;

    // Append new messages to DB
    const now = new Date().toISOString();
    const newMessages: FollowUpMessage[] = [
      ...existingMessages,
      { role: "user", content: message.trim(), created_at: now },
      {
        role: "assistant",
        content: responseText,
        created_at: new Date().toISOString(),
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    ];

    const { error: saveError } = await supabase
      .from("ai_analyses")
      .update({ follow_up_messages: newMessages })
      .eq("id", analysisId);

    if (saveError) {
      console.error("Failed to save follow-up:", saveError);
    }

    return NextResponse.json({
      reply: responseText,
      messages: newMessages,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_tokens: cachedTokens,
    });
  } catch (e: any) {
    console.error("follow-up error:", e);
    return NextResponse.json({ error: e.message || "Follow-up failed" }, { status: 500 });
  }
}
