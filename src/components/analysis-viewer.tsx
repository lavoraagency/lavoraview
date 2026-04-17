"use client";

import { useState, useRef, useEffect } from "react";
import { X, Sparkles, Trash2, Calendar, Target, Send, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-implementation of the markdown renderer for analysis results.
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, j) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      const inner = p.slice(2, -2);
      const isFraction = /\d+\s*(out of|von|\/)\s*\d+/i.test(inner);
      if (isFraction) {
        return <span key={j} className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold text-sm rounded">{inner}</span>;
      }
      return <strong key={j} className="font-bold text-gray-900">{inner}</strong>;
    }
    return <span key={j}>{p}</span>;
  });
}

function MarkdownRenderer({ markdown, compact = false }: { markdown: string; compact?: boolean }) {
  const lines = markdown.split("\n");
  const sections: Array<{ heading: string | null; items: React.ReactNode[] }> = [];
  let current: { heading: string | null; items: React.ReactNode[] } = { heading: null, items: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (current.heading !== null || current.items.length > 0) sections.push(current);
      current = { heading: trimmed.replace(/^#+\s*/, ""), items: [] };
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      current.items.push(
        <li key={`li-${i}`} className="flex gap-2 mb-1.5">
          <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
          <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
        </li>
      );
      continue;
    }

    current.items.push(
      <p key={`p-${i}`} className="mb-2 leading-relaxed">{renderInline(trimmed)}</p>
    );
  }
  if (current.heading !== null || current.items.length > 0) sections.push(current);

  function groupItems(items: React.ReactNode[]): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    let buffer: React.ReactNode[] = [];
    const flush = () => {
      if (buffer.length > 0) {
        out.push(<ul key={`ul-${out.length}`} className="space-y-0 mb-2">{buffer}</ul>);
        buffer = [];
      }
    };
    for (const item of items) {
      const el = item as any;
      if (el?.key?.toString().startsWith("li-")) buffer.push(item);
      else { flush(); out.push(item); }
    }
    flush();
    return out;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {sections.map((s, idx) => {
        let emoji: string | null = null;
        let headingText: string | null = s.heading;
        if (s.heading) {
          const firstSpace = s.heading.indexOf(" ");
          if (firstSpace > 0) {
            const prefix = s.heading.slice(0, firstSpace);
            if (/[^\x00-\x7F]/.test(prefix)) {
              emoji = prefix;
              headingText = s.heading.substring(firstSpace).trim();
            }
          }
        }
        return (
          <div key={idx} className={cn(
            "rounded-xl",
            compact ? "" : "bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-4"
          )}>
            {s.heading && (
              <div className={cn("flex items-center gap-2", compact ? "mb-2" : "mb-3 pb-2 border-b border-gray-100")}>
                {emoji && <span className={compact ? "text-base leading-none" : "text-xl leading-none"}>{emoji}</span>}
                <h3 className={cn("font-bold text-gray-900 uppercase tracking-wide", compact ? "text-xs" : "text-sm")}>{headingText}</h3>
              </div>
            )}
            <div className="text-sm text-gray-700">{groupItems(s.items)}</div>
          </div>
        );
      })}
    </div>
  );
}

export interface AnalysisMeta {
  title?: string;
  scope?: string;
  date_from?: string;
  date_to?: string;
  query?: string;
  created_at?: string;
  model_used?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface FollowUpMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  input_tokens?: number;
  output_tokens?: number;
}

export function AnalysisViewer({
  result,
  meta,
  loading,
  error,
  onClose,
  onDelete,
  analysisId,
  initialFollowUps,
  canFollowUp,
}: {
  result: string;
  meta?: AnalysisMeta;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onDelete?: () => void;
  /** If set, enables the follow-up chat. The analysis must be saved first. */
  analysisId?: string | null;
  initialFollowUps?: FollowUpMessage[];
  /** Set to false to explicitly hide the chat even if analysisId is present */
  canFollowUp?: boolean;
}) {
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>(initialFollowUps || []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [followError, setFollowError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFollowUps(initialFollowUps || []);
  }, [initialFollowUps, analysisId]);

  useEffect(() => {
    // Scroll chat to bottom when new message arrives
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [followUps.length, sending]);

  const showChat = canFollowUp !== false && !!analysisId && !loading && !error && !!result;

  async function sendFollowUp() {
    if (!draft.trim() || sending || !analysisId) return;
    const userMsg = draft.trim();
    setDraft("");
    setFollowError("");
    setSending(true);

    // Optimistically add user message
    const optimisticUserMsg: FollowUpMessage = { role: "user", content: userMsg, created_at: new Date().toISOString() };
    setFollowUps(prev => [...prev, optimisticUserMsg]);

    try {
      const resp = await fetch("/api/analyze/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, message: userMsg }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Follow-up failed");
      // Replace with server-returned messages (source of truth)
      setFollowUps(data.messages);
    } catch (e: any) {
      setFollowError(e.message || "Failed to send follow-up");
      // Remove the optimistic message on error
      setFollowUps(prev => prev.filter(m => m !== optimisticUserMsg));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendFollowUp();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{meta?.title || "AI Analysis"}</h2>
              <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                {meta?.date_from && meta?.date_to && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {meta.date_from} → {meta.date_to}</span>
                )}
                {meta?.scope && (
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {meta.scope}</span>
                )}
                {meta?.model_used && <span>{meta.model_used}</span>}
                {meta?.created_at && <span>{new Date(meta.created_at).toLocaleString("de-DE")}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Query display for custom queries */}
        {meta?.query && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</span>
            <p className="text-sm text-gray-800 mt-1">{meta.query}</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Claude is analyzing… this can take 1-2 minutes</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
          {!loading && !error && result && <MarkdownRenderer markdown={result} />}

          {/* Follow-up chat */}
          {showChat && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Follow-up</h3>
              </div>

              {followUps.length === 0 && !sending && (
                <p className="text-xs text-gray-400 italic mb-4">Ask a follow-up question. Claude remembers the original data and analysis.</p>
              )}

              <div className="space-y-3">
                {followUps.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      msg.role === "user"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}>
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="text-sm">
                          <MarkdownRenderer markdown={msg.content} compact />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                      <span className="text-sm text-gray-500">Claude is thinking…</span>
                    </div>
                  </div>
                )}
                {followError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                    {followError}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Follow-up input */}
        {showChat && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask a follow-up question…  (Cmd/Ctrl+Enter to send)"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white"
                disabled={sending}
              />
              <button
                onClick={sendFollowUp}
                disabled={!draft.trim() || sending}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        )}

        {/* Footer with token info */}
        {meta?.input_tokens != null && meta?.output_tokens != null && !loading && (
          <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>Tokens: {meta.input_tokens.toLocaleString()} in / {meta.output_tokens.toLocaleString()} out</span>
          </div>
        )}
      </div>
    </div>
  );
}
