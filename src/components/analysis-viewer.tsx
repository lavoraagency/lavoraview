"use client";

import { X, Sparkles, Trash2, Calendar, Target } from "lucide-react";
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

function MarkdownRenderer({ markdown }: { markdown: string }) {
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
    <div className="space-y-5">
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
          <div key={idx} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4">
            {s.heading && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                {emoji && <span className="text-xl leading-none">{emoji}</span>}
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{headingText}</h3>
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

export function AnalysisViewer({
  result,
  meta,
  loading,
  error,
  onClose,
  onDelete,
}: {
  result: string;
  meta?: AnalysisMeta;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onDelete?: () => void;
}) {
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
              <p className="text-sm text-gray-500">Claude Opus analyzing… this can take 1-2 minutes</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
          {!loading && !error && result && <MarkdownRenderer markdown={result} />}
        </div>

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
