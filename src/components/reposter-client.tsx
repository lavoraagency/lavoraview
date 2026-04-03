"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: number;
  report_date: string;
  report_text: string;
  created_at: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function SingleDatePicker({
  value,
  onChange,
  availableDates,
}: {
  value: string;
  onChange: (date: string) => void;
  availableDates: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      const d = new Date(value + "T00:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open]);

  const today = toLocalDateStr(new Date());
  const yesterdayD = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  const yesterday = toLocalDateStr(yesterdayD);

  const presets = useMemo(() => {
    const items: { label: string; date: string }[] = [];
    if (availableDates.has(today)) items.push({ label: "Today", date: today });
    if (availableDates.has(yesterday)) items.push({ label: "Yesterday", date: yesterday });
    return items;
  }, [availableDates, today, yesterday]);

  const displayText = useMemo(() => {
    if (value === today) return "Today";
    if (value === yesterday) return "Yesterday";
    const d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }, [value, today, yesterday]);

  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const days: { dateStr: string; day: number; inMonth: boolean }[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ dateStr: toLocalDateStr(date), day: d, inMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }
    return days;
  }, [viewMonth]);

  function prevMonth() {
    setViewMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 });
  }
  function nextMonth() {
    setViewMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-300 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        {displayText}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex">
          {/* Presets */}
          {presets.length > 0 && (
            <div className="border-r border-gray-100 py-2 w-32">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => { onChange(p.date); setOpen(false); }}
                  className={cn(
                    "block w-full text-left px-4 py-2 text-sm transition-colors",
                    value === p.date
                      ? "bg-brand-50 text-brand-600 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Calendar */}
          <div className="p-4 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {MONTH_NAMES[viewMonth.month]} {viewMonth.year}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const hasReport = availableDates.has(dateStr);
                const isSelected = dateStr === value;

                return (
                  <button
                    key={i}
                    disabled={!hasReport}
                    onClick={() => { onChange(dateStr); setOpen(false); }}
                    className={cn(
                      "h-8 text-xs rounded transition-colors relative",
                      !inMonth && !hasReport && "text-gray-300",
                      !inMonth && hasReport && !isSelected && "text-gray-400 hover:bg-gray-100",
                      inMonth && !hasReport && "text-gray-200 cursor-not-allowed",
                      inMonth && hasReport && !isSelected && "text-gray-700 hover:bg-gray-100",
                      isSelected && "bg-gray-900 text-white font-semibold rounded-lg",
                    )}
                  >
                    {day}
                    {hasReport && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-gray-400 text-center">
              Select a date with a report
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
        <p className="text-gray-500 text-sm mt-1">Daily Reports from Lavora Reposter Controller Bot</p>
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
          <p className="text-gray-500 text-sm mt-1">Daily Reports from Lavora Reposter Controller Bot</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIdx(Math.min(selectedIdx + 1, reports.length - 1))}
            disabled={selectedIdx >= reports.length - 1}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <SingleDatePicker
            value={report.report_date}
            availableDates={new Set(reports.map(r => r.report_date))}
            onChange={(date) => {
              const idx = reports.findIndex(r => r.report_date === date);
              if (idx >= 0) setSelectedIdx(idx);
            }}
          />
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
