"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Sparkles, X, Calendar, ChevronDown, ChevronLeft, ChevronRight, Target, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalysisViewer } from "@/components/analysis-viewer";
import { getAnalysis, deleteAnalysis } from "@/lib/ai-analyses";

type Scope = "global" | "model" | "group" | "profile";

// ── Date helpers ───────────────────────────────────────────────
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

// ── Date Range Picker (Analytics-style) ────────────────────────
interface DateRange { from: string; to: string; }

function DateRangePicker({ range, onChange, maxDate }: { range: DateRange; onChange: (r: DateRange) => void; maxDate?: string }) {
  const [open, setOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(range.to + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setTempFrom(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      const d = new Date(range.to + "T00:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
      setTempFrom(null);
    }
  }, [open]);

  function handleDayClick(dateStr: string) {
    if (maxDate && dateStr > maxDate) return;
    if (!tempFrom) {
      setTempFrom(dateStr);
    } else {
      const from = dateStr < tempFrom ? dateStr : tempFrom;
      const to = dateStr < tempFrom ? tempFrom : dateStr;
      onChange({ from, to });
      setOpen(false);
      setTempFrom(null);
    }
  }

  function applyPreset(from: string, to: string) {
    onChange({ from, to });
    setOpen(false);
    setTempFrom(null);
  }

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

  const presets = useMemo(() => {
    const t = new Date();
    const todayStr = toLocalDateStr(t);
    const yesterdayStr = addDays(todayStr, -1);
    const dayOfWeek = t.getDay() === 0 ? 6 : t.getDay() - 1;
    const mondayD = new Date(t);
    mondayD.setDate(mondayD.getDate() - dayOfWeek);
    const mondayStr = toLocalDateStr(mondayD);
    const monthStartStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;
    return [
      { label: "Today", from: todayStr, to: todayStr },
      { label: "Yesterday", from: yesterdayStr, to: yesterdayStr },
      { label: "Current Week", from: mondayStr, to: todayStr },
      { label: "Last 7 Days", from: addDays(todayStr, -6), to: todayStr },
      { label: "Last 14 Days", from: addDays(todayStr, -13), to: todayStr },
      { label: "Current Month", from: monthStartStr, to: todayStr },
      { label: "Last 30 Days", from: addDays(todayStr, -29), to: todayStr },
      { label: "Last 90 Days", from: addDays(todayStr, -89), to: todayStr },
    ];
  }, []);

  const displayText = useMemo(() => {
    for (const p of presets) {
      if (range.from === p.from && range.to === p.to) return p.label;
    }
    if (range.from === range.to) {
      const d = new Date(range.from + "T00:00:00");
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    }
    const f = new Date(range.from + "T00:00:00");
    const t = new Date(range.to + "T00:00:00");
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    return `${fmt(f)} – ${fmt(t)}`;
  }, [range, presets]);

  const activePreset = useMemo(() => {
    for (const p of presets) {
      if (range.from === p.from && range.to === p.to) return p.label;
    }
    return null;
  }, [range, presets]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-left">{displayText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex">
          {/* Presets */}
          <div className="border-r border-gray-100 py-2 w-40">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.from, p.to)}
                className={cn(
                  "block w-full text-left px-4 py-2 text-sm transition-colors",
                  activePreset === p.label ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-4 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</span>
              <button type="button" onClick={() => setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const disabled = maxDate ? dateStr > maxDate : false;
                const isFrom = dateStr === (tempFrom || range.from);
                const isTo = !tempFrom && dateStr === range.to;
                const inRange = tempFrom ? false : (dateStr >= range.from && dateStr <= range.to);
                const isSelected = isFrom || isTo;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-8 text-xs rounded transition-colors",
                      !inMonth && "text-gray-300",
                      inMonth && !disabled && !isSelected && !inRange && "text-gray-700 hover:bg-gray-100",
                      disabled && "text-gray-200 cursor-not-allowed",
                      inRange && !isSelected && "bg-brand-50 text-brand-700",
                      isSelected && "bg-gray-900 text-white font-semibold rounded-lg",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-400 text-center">
              {tempFrom ? "Select end date" : "Select start date"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MultiSelect (copied from changelog, single-file component) ──
function MultiSelect({ label, options, selected, onChange, searchable }: {
  label: string; options: { id: string; name: string }[]; selected: string[]; onChange: (ids: string[]) => void; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); } }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayText = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.name || label
    : `${selected.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors">
        <span className="truncate flex-1 text-left">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400" />
            </div>
          )}
          <div className="overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} className="rounded border-gray-300" />
              <span className="text-sm font-medium">All (no filter)</span>
            </label>
            {filteredOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => {
                    if (selected.includes(o.id)) onChange(selected.filter(id => id !== o.id));
                    else onChange([...selected, o.id]);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{o.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── New Analysis Request Form ──────────────────────────────────
function NewAnalysisModal({ models, groups, profiles, onClose, onStarted }: {
  models: any[]; groups: any[]; profiles: any[];
  onClose: () => void;
  onStarted: (payload: any) => void;
}) {
  const today = toLocalDateStr(new Date());
  const weekAgo = addDays(today, -7);

  const [range, setRange] = useState<DateRange>({ from: weekAgo, to: today });
  const dateFrom = range.from;
  const dateTo = range.to;
  const [scope, setScope] = useState<Scope>("global");
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [profileIds, setProfileIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const groupOptions = useMemo(() => {
    if (modelIds.length === 0) return groups.map((g: any) => ({ id: g.id, name: g.name }));
    return groups.filter((g: any) => modelIds.includes(g.model_id)).map((g: any) => ({ id: g.id, name: g.name }));
  }, [groups, modelIds]);

  const profileOptions = useMemo(() => {
    let filtered = profiles;
    if (modelIds.length > 0) filtered = filtered.filter((p: any) => modelIds.includes(p.model_id));
    if (groupIds.length > 0) filtered = filtered.filter((p: any) => groupIds.includes(p.account_group_id));
    return filtered.map((p: any) => ({ id: p.id, name: `@${p.instagram_username}` }));
  }, [profiles, modelIds, groupIds]);

  function handleSubmit() {
    if (!query.trim()) { setError("Please write a question"); return; }
    if (dateFrom > dateTo) { setError("From date must be before To date"); return; }
    onStarted({
      type: "custom_query",
      query: query.trim(),
      scope,
      modelIds: scope === "global" ? [] : modelIds,
      groupIds: scope === "global" ? [] : groupIds,
      profileIds: scope === "global" ? [] : profileIds,
      dateFrom,
      dateTo,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">New Analysis Request</h2>
              <p className="text-sm text-gray-500">Claude Opus will analyze the raw data</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date Range</label>
            <DateRangePicker range={range} onChange={setRange} maxDate={today} />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Target className="w-3.5 h-3.5 inline mr-1" />
              Scope
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["global", "model", "group", "profile"] as Scope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize",
                    scope === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Affected selectors */}
          {scope !== "global" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Models</label>
                <MultiSelect label="Models" options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))} selected={modelIds} onChange={setModelIds} />
              </div>
              {(scope === "group" || scope === "profile") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Groups</label>
                  <MultiSelect label="Groups" options={groupOptions} selected={groupIds} onChange={setGroupIds} />
                </div>
              )}
              {scope === "profile" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Profiles</label>
                  <MultiSelect label="Profiles" options={profileOptions} selected={profileIds} onChange={setProfileIds} searchable />
                </div>
              )}
            </div>
          )}

          {/* Query */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Question</label>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={4}
              placeholder="e.g. 'I feel engagement dropped last week — why?' or 'Which accounts are trending up? What do they have in common?'"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Run Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────
export function AIAssistantClient({ models, groups, profiles, analyses: initialAnalyses }: {
  models: any[]; groups: any[]; profiles: any[]; analyses: any[];
}) {
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState("");
  const [viewerResult, setViewerResult] = useState("");
  const [viewerMeta, setViewerMeta] = useState<any>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  async function runAnalysis(payload: any) {
    setNewModalOpen(false);
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerError("");
    setViewerResult("");
    setCurrentId(null);

    const language = typeof window !== "undefined" ? (localStorage.getItem("ai_analysis_language") || "en") : "en";

    setViewerMeta({
      title: "New Analysis",
      scope: payload.scope,
      date_from: payload.dateFrom,
      date_to: payload.dateTo,
      query: payload.query,
      created_at: new Date().toISOString(),
    });

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, language }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");
      setViewerResult(data.result);
      setCurrentId(data.id);
      setViewerMeta((prev: any) => ({
        ...prev,
        title: data.title,
        model_used: data.model_used,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
      }));
      // Add to list
      setAnalyses(prev => [{
        id: data.id,
        title: data.title,
        query: payload.query,
        date_from: payload.dateFrom,
        date_to: payload.dateTo,
        scope: payload.scope,
        model_ids: payload.modelIds,
        group_ids: payload.groupIds,
        profile_ids: payload.profileIds,
        created_at: new Date().toISOString(),
        model_used: data.model_used,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
      }, ...prev]);
    } catch (e: any) {
      setViewerError(e.message || "Analysis failed");
    } finally {
      setViewerLoading(false);
    }
  }

  async function openSaved(id: string) {
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerError("");
    setViewerResult("");
    setCurrentId(id);

    try {
      const a = await getAnalysis(id);
      if (!a) throw new Error("Not found");
      setViewerResult(a.result_markdown || "");
      setViewerMeta({
        title: a.title,
        scope: a.scope,
        date_from: a.date_from,
        date_to: a.date_to,
        query: a.query,
        created_at: a.created_at,
        model_used: a.model_used,
        input_tokens: a.input_tokens,
        output_tokens: a.output_tokens,
      });
    } catch (e: any) {
      setViewerError(e.message || "Failed to load");
    } finally {
      setViewerLoading(false);
    }
  }

  async function handleDelete() {
    if (!currentId) return;
    if (!confirm("Delete this analysis?")) return;
    const result = await deleteAnalysis(currentId);
    if (result.success) {
      setAnalyses(prev => prev.filter(a => a.id !== currentId));
      setViewerOpen(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Analysis Assistant</h1>
            <p className="text-gray-500 text-sm">Ask Claude to analyze your data</p>
          </div>
        </div>
        <button
          onClick={() => setNewModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Analysis
        </button>
      </div>

      {/* List */}
      {analyses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No analyses yet</p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Start your first analysis →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {analyses.map(a => (
            <button
              key={a.id}
              onClick={() => openSaved(a.id)}
              className="w-full text-left bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{a.title || "Untitled"}</h3>
                  {a.query && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.query}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">{a.scope}</span>
                <span className="text-gray-500">{a.date_from} → {a.date_to}</span>
                {a.model_used && <span className="text-gray-400">· {a.model_used}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      {newModalOpen && (
        <NewAnalysisModal
          models={models}
          groups={groups}
          profiles={profiles}
          onClose={() => setNewModalOpen(false)}
          onStarted={runAnalysis}
        />
      )}

      {viewerOpen && (
        <AnalysisViewer
          result={viewerResult}
          meta={viewerMeta}
          loading={viewerLoading}
          error={viewerError}
          onClose={() => setViewerOpen(false)}
          onDelete={currentId && !viewerLoading ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
