"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

interface Report {
  id: number;
  report_date: string;
  report_text: string;
  created_at: string;
}

function parseReport(text: string) {
  // Split report into sections for styled rendering
  const lines = text.split("\n");
  const sections: { type: "header" | "group" | "issue" | "divider" | "summary" | "empty"; content: string }[] = [];

  for (const line of lines) {
    if (line.startsWith("\u{1F4CA} Daily Report")) {
      sections.push({ type: "header", content: line });
    } else if (line.startsWith("\u274C ISSUES:")) {
      // skip, we show it in the header area
    } else if (line.startsWith("\u{1F4C1} ")) {
      sections.push({ type: "group", content: line });
    } else if (line.trim().startsWith("\u2022 ") || line.trim().startsWith("• ")) {
      sections.push({ type: "issue", content: line.trim().replace(/^[•\u2022]\s*/, "") });
    } else if (line.startsWith("\u2500") || line.startsWith("──")) {
      sections.push({ type: "divider", content: "" });
    } else if (line.startsWith("\u{1F4C8} SUMMARY:") || line.startsWith("Total ") || line.startsWith("Accounts ")) {
      sections.push({ type: "summary", content: line });
    } else if (line.startsWith("\u2705 No issues found")) {
      sections.push({ type: "summary", content: line });
    } else if (line.trim() === "") {
      sections.push({ type: "empty", content: "" });
    } else {
      sections.push({ type: "summary", content: line });
    }
  }
  return sections;
}

function extractSummary(text: string) {
  const totalMatch = text.match(/Total accounts:\s*(\d+)/);
  const issuesMatch = text.match(/Accounts with issues:\s*(\d+)/);
  const okMatch = text.match(/Accounts without issues:\s*(\d+)/);
  const vasMatch = text.match(/Total VAs:\s*(\d+)/);
  return {
    total: totalMatch ? parseInt(totalMatch[1]) : 0,
    issues: issuesMatch ? parseInt(issuesMatch[1]) : 0,
    ok: okMatch ? parseInt(okMatch[1]) : 0,
    vas: vasMatch ? parseInt(vasMatch[1]) : 0,
  };
}

export function ReposterClient({ reports }: { reports: Report[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (reports.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Reposter Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Daily reports from the account checker</p>
        <div className="mt-8 text-center text-gray-400 py-12">
          No reports available yet. Reports will appear after the next daily workflow run.
        </div>
      </div>
    );
  }

  const report = reports[selectedIdx];
  const sections = parseReport(report.report_text);
  const summary = extractSummary(report.report_text);
  const dateStr = new Date(report.report_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reposter Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Daily reports from the account checker</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIdx(Math.min(selectedIdx + 1, reports.length - 1))}
            disabled={selectedIdx >= reports.length - 1}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">
            {report.report_date}
          </span>
          <button
            onClick={() => setSelectedIdx(Math.max(selectedIdx - 1, 0))}
            disabled={selectedIdx <= 0}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total Accounts</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Total VAs</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{summary.vas}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
          <div className="text-xs text-red-500 uppercase tracking-wide">With Issues</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{summary.issues}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
          <div className="text-xs text-green-600 uppercase tracking-wide">No Issues</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{summary.ok}</div>
        </div>
      </div>

      {/* Date subtitle */}
      <div className="text-sm text-gray-500">{dateStr}</div>

      {/* Report content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {sections.map((section, i) => {
          if (section.type === "empty") return null;
          if (section.type === "header") return null; // already shown above
          if (section.type === "divider") return <div key={i} className="border-t border-gray-200" />;

          if (section.type === "group") {
            const groupName = section.content.replace(/\uD83D\uDCC1\s*/, "").replace(/:$/, "");
            return (
              <div key={i} className="px-5 py-3 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">{groupName}</span>
              </div>
            );
          }

          if (section.type === "issue") {
            // Parse: @telegramUser (instaUser): issue1, issue2
            const match = section.content.match(/^(@\S+)\s*\(([^)]+)\):\s*(.+)$/);
            if (match) {
              const [, telegram, instagram, issuesStr] = match;
              const issues = issuesStr.split(", ");
              return (
                <div key={i} className="px-5 py-2.5 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{instagram}</span>
                      <span className="text-xs text-gray-400">{telegram}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {issues.map((issue, j) => {
                        let color = "bg-red-50 text-red-700 border-red-100";
                        if (issue.includes("screenshot")) color = "bg-yellow-50 text-yellow-700 border-yellow-100";
                        if (issue.includes("trackable") || issue.includes("restriction")) color = "bg-orange-50 text-orange-700 border-orange-100";
                        if (issue.includes("set up")) color = "bg-blue-50 text-blue-700 border-blue-100";
                        return (
                          <span key={j} className={`text-xs px-2 py-0.5 rounded-full border ${color}`}>
                            {issue}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="px-5 py-2.5 text-sm text-gray-700">{section.content}</div>
            );
          }

          if (section.type === "summary") {
            if (section.content.includes("No issues found")) {
              return (
                <div key={i} className="px-5 py-4 flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">No issues found!</span>
                </div>
              );
            }
            // Skip summary lines already shown in cards
            if (section.content.match(/^(Total |Accounts |📈)/)) return null;
            return (
              <div key={i} className="px-5 py-2 text-sm text-gray-600">{section.content}</div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
