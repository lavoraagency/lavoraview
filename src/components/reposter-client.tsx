"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Calendar, ChevronDown, ExternalLink, X } from "lucide-react";
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

  const presets: { label: string; date: string }[] = [];

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

interface IssueRow {
  telegram: string;
  instagram: string;
  streak: number;     // 0 = first time / 1 day, otherwise days
  issues: string[];
  raw: string;
  parsed: boolean;
}

interface ReportGroup {
  name: string;
  items: IssueRow[];
}

interface ReportStructure {
  groups: ReportGroup[];
  noIssuesFound: boolean;
}

function buildReportStructure(text: string): ReportStructure {
  const lines = text.split("\n");
  const groups: ReportGroup[] = [];
  let current: ReportGroup | null = null;
  let noIssuesFound = false;

  for (const line of lines) {
    if (line.startsWith("\u{1F4C1} ")) {
      const name = line.replace(/^📁\s*/, "").replace(/:$/, "");
      current = { name, items: [] };
      groups.push(current);
      continue;
    }
    if (line.startsWith("✅ No issues found")) {
      noIssuesFound = true;
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith("• ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[••]\s*/, "");
      const m = content.match(/^(@\S+)\s*\(([^)]+)\)\s*(?:(\d+)\.\s*)?:\s*(.+)$/);
      if (m && current) {
        const [, telegram, instagram, streakStr, issuesStr] = m;
        const streak = streakStr ? parseInt(streakStr) : 0;
        const issues = issuesStr.split(",").map(s => s.trim()).filter(Boolean);
        current.items.push({ telegram, instagram, streak, issues, raw: content, parsed: true });
      } else if (current) {
        current.items.push({ telegram: "", instagram: "", streak: 0, issues: [], raw: content, parsed: false });
      }
    }
  }
  return { groups, noIssuesFound };
}

// Lightweight MultiSelect for Reposter filters - empty selection = no filter applied (show all)
function FilterSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const display = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.name || label
    : `${selected.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm transition-colors min-w-[180px]",
          selected.length > 0
            ? "border-brand-400 text-gray-900"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        )}
      >
        <span className="truncate flex-1 text-left">{display}</span>
        {selected.length > 0 && (
          <span
            role="button"
            aria-label={`Clear ${label}`}
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange([]); } }}
            className="text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-40 min-w-[260px] max-w-[90vw]">
          <div className="max-h-72 overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input
                type="checkbox"
                checked={selected.length === 0}
                onChange={() => onChange([])}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm font-medium">All {label}</span>
            </label>
            {options.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No options</div>
            )}
            {options.map(o => {
              const checked = selected.includes(o.id);
              return (
                <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) onChange(selected.filter(id => id !== o.id));
                      else onChange([...selected, o.id]);
                    }}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm">{o.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [selectedStreaks, setSelectedStreaks] = useState<string[]>([]);

  // Reset filters when report changes
  useEffect(() => {
    setSelectedIssues([]);
    setSelectedStreaks([]);
  }, [selectedIdx]);

  const report = reports.length > 0 ? reports[selectedIdx] : null;
  const summary = useMemo(() => report ? extractSummary(report.report_text) : { total: 0, issues: 0, ok: 0, vas: 0 }, [report]);
  const structure = useMemo(() => report ? buildReportStructure(report.report_text) : { groups: [], noIssuesFound: false }, [report]);

  // Distinct issue labels and streak buckets present in this report.
  // Consolidate any "x/y Reels" variants (0/3, 1/3, 2/3, …) into a single
  // "Too few Reels" filter bucket — the user doesn't care which exact
  // ratio it is, only that the account underposted.
  const issueFilterKey = (issue: string): string => {
    if (/^\d+\s*\/\s*\d+\s+[Rr]eels?$/.test(issue.trim())) return "Too few Reels";
    return issue;
  };

  const { issueOptions, streakOptions } = useMemo(() => {
    const issueSet = new Set<string>();
    const streakSet = new Set<number>();
    for (const g of structure.groups) {
      for (const it of g.items) {
        it.issues.forEach(i => issueSet.add(issueFilterKey(i)));
        streakSet.add(it.streak);
      }
    }
    const issueOptions = Array.from(issueSet).sort().map(s => ({ id: s, name: s }));
    const streakOptions = Array.from(streakSet).sort((a, b) => a - b).map(n => ({
      id: String(n),
      name: n === 0 ? "1 day" : `${n} days`,
    }));
    return { issueOptions, streakOptions };
  }, [structure]);

  const filteredGroups = useMemo(() => {
    const issueFilter = new Set(selectedIssues);
    const streakFilter = new Set(selectedStreaks);
    const useIssue = issueFilter.size > 0;
    const useStreak = streakFilter.size > 0;
    if (!useIssue && !useStreak) return structure.groups;
    return structure.groups
      .map(g => ({
        ...g,
        items: g.items.filter(it => {
          if (useIssue && !it.issues.some(i => issueFilter.has(issueFilterKey(i)))) return false;
          if (useStreak && !streakFilter.has(String(it.streak))) return false;
          return true;
        }),
      }))
      .filter(g => g.items.length > 0);
  }, [structure, selectedIssues, selectedStreaks]);

  if (reports.length === 0 || !report) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reposter Overview</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">Daily Reports from Lavora Reposter Controller Bot</p>
        <div className="mt-8 text-center text-gray-400 py-12">
          No reports available yet. Reports will appear after the next daily workflow run.
        </div>
      </div>
    );
  }

  const filteredCount = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);
  const filtersActive = selectedIssues.length > 0 || selectedStreaks.length > 0;

  const dateStr = new Date(report.report_date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function renderIssueRow(it: IssueRow, key: string) {
    if (!it.parsed) {
      return <div key={key} className="px-4 md:px-5 py-2.5 text-sm text-gray-700">{it.raw}</div>;
    }
    return (
      <div key={key} className="px-4 md:px-5 py-2.5 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-gray-900 break-all">{it.instagram}</span>
            <a
              href={`https://www.instagram.com/${it.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-brand-500 transition-colors"
              title="Open on Instagram"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-xs text-gray-400">{it.telegram}</span>
            {it.streak >= 2 && (
              <span className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded",
                it.streak >= 5 ? "bg-red-100 text-red-700 border border-red-200" :
                it.streak >= 3 ? "bg-orange-100 text-orange-700 border border-orange-200" :
                "bg-yellow-100 text-yellow-700 border border-yellow-200"
              )}>
                {it.streak} days
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {it.issues.map((issue, j) => {
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
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reposter Overview</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Daily Reports from Lavora Reposter Controller Bot</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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

      {/* Date subtitle + filter row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-500">{dateStr}</div>
        {(issueOptions.length > 0 || streakOptions.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {issueOptions.length > 0 && (
              <FilterSelect
                label="Issues"
                options={issueOptions}
                selected={selectedIssues}
                onChange={setSelectedIssues}
              />
            )}
            {streakOptions.length > 0 && (
              <FilterSelect
                label="Streaks"
                options={streakOptions}
                selected={selectedStreaks}
                onChange={setSelectedStreaks}
              />
            )}
            {filtersActive && (
              <span className="text-xs text-gray-500 ml-1">{filteredCount} match{filteredCount === 1 ? "" : "es"}</span>
            )}
          </div>
        )}
      </div>

      {/* Report content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {structure.noIssuesFound && structure.groups.length === 0 ? (
          <div className="px-4 md:px-5 py-4 flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">No issues found!</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="px-4 md:px-5 py-8 text-center text-sm text-gray-400">
            {filtersActive ? "No issues match the selected filters." : "No issues to display."}
          </div>
        ) : (
          filteredGroups.map((g, gi) => (
            <div key={gi}>
              <div className="px-4 md:px-5 py-3 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">{g.name}</span>
                {filtersActive && (
                  <span className="ml-2 text-xs font-normal text-gray-400">({g.items.length})</span>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {g.items.map((it, ii) => renderIssueRow(it, `${gi}-${ii}`))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
