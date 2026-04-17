"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, Calendar, ChevronDown, ChevronLeft, ChevronRight, X, Edit, Tag as TagIcon, Target, Lightbulb, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { createChange, deleteChange, updateChange, type ChangeScope, type NewChange } from "@/app/dashboard/changelog/actions";
import { AnalysisViewer } from "@/components/analysis-viewer";
import { getAnalysis, deleteAnalysis } from "@/lib/ai-analyses";

const CATEGORIES = [
  { value: "tracking_link", label: "Tracking Link", color: "bg-blue-100 text-blue-700" },
  { value: "content_strategy", label: "Content Strategy", color: "bg-purple-100 text-purple-700" },
  { value: "posting_time", label: "Posting Time", color: "bg-green-100 text-green-700" },
  { value: "scraper", label: "Scraper / Tech", color: "bg-amber-100 text-amber-700" },
  { value: "account_setup", label: "Account Setup", color: "bg-pink-100 text-pink-700" },
  { value: "caption_style", label: "Caption Style", color: "bg-indigo-100 text-indigo-700" },
  { value: "video_style", label: "Video Style", color: "bg-cyan-100 text-cyan-700" },
  { value: "audio", label: "Audio / Music", color: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700" },
];

function getCategoryInfo(value: string) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];
}

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

// ── DatePicker (Analytics-style, supports past + future) ──────
function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      const d = new Date(value + "T00:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open]);

  function handleDayClick(dateStr: string) { onChange(dateStr); setOpen(false); }

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

  function prevMonth() { setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }); }
  function nextMonth() { setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }); }

  const presets = useMemo(() => {
    const today = toLocalDateStr(new Date());
    return [
      { label: "Yesterday", date: addDays(today, -1) },
      { label: "Today", date: today },
      { label: "Tomorrow", date: addDays(today, 1) },
      { label: "In 1 Week", date: addDays(today, 7) },
      { label: "1 Week Ago", date: addDays(today, -7) },
    ];
  }, []);

  const displayText = useMemo(() => {
    for (const p of presets) { if (value === p.date) return p.label; }
    const d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }, [value, presets]);

  const today = toLocalDateStr(new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-300 transition-colors"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-left">{displayText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex">
          <div className="border-r border-gray-100 py-2 w-36">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleDayClick(p.date)}
                className={cn(
                  "block w-full text-left px-4 py-2 text-sm transition-colors",
                  value === p.date ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-4 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</span>
              <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const isSelected = dateStr === value;
                const isToday = dateStr === today;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-8 text-xs rounded transition-colors relative",
                      !inMonth && "text-gray-300",
                      inMonth && !isSelected && "text-gray-700 hover:bg-gray-100",
                      isSelected && "bg-gray-900 text-white font-semibold rounded-lg",
                      isToday && !isSelected && "ring-1 ring-brand-400 ring-inset",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MultiSelect (same pattern as other tabs) ────────────────────
function MultiSelect({
  label, options, selected, onChange, searchable,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchable?: boolean;
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
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors"
      >
        <span className="truncate flex-1 text-left">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[300px] overflow-hidden flex flex-col">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400"
              />
            </div>
          )}
          <div className="overflow-y-auto">
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input
                type="checkbox"
                checked={selected.length === 0}
                onChange={() => onChange([])}
                className="rounded border-gray-300"
              />
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

// ── Change Form Modal ──────────────────────────────────────────
function ChangeFormModal({
  existing, models, groups, profiles, onClose, onSaved,
}: {
  existing?: any;
  models: any[];
  groups: any[];
  profiles: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [changeDate, setChangeDate] = useState(existing?.change_date || new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState(existing?.category || "other");
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [hypothesis, setHypothesis] = useState(existing?.hypothesis || "");
  const [scope, setScope] = useState<ChangeScope>(existing?.scope || "global");
  const [modelIds, setModelIds] = useState<string[]>(existing?.affected_model_ids || []);
  const [groupIds, setGroupIds] = useState<string[]>(existing?.affected_group_ids || []);
  const [profileIds, setProfileIds] = useState<string[]>(existing?.affected_profile_ids || []);
  const [tags, setTags] = useState<string>((existing?.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filter groups/profiles by selected models
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

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload: NewChange = {
      change_date: changeDate,
      category,
      title: title.trim(),
      description: description.trim() || undefined,
      hypothesis: hypothesis.trim() || undefined,
      scope,
      affected_model_ids: scope === "global" ? [] : modelIds,
      affected_group_ids: scope === "global" ? [] : groupIds,
      affected_profile_ids: scope === "global" ? [] : profileIds,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    const result = existing
      ? await updateChange(existing.id, payload)
      : await createChange(payload);

    if (!result.success) {
      setError(result.error || "Failed to save");
      setSaving(false);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{existing ? "Edit Change" : "Log System Change"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Date + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date <span className="text-gray-400 font-normal">(past or future)</span>
              </label>
              <DatePicker value={changeDate} onChange={setChangeDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Changed tracking link structure to short.io"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What exactly did you change? Be specific so future AI analysis can use this context."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
              Hypothesis <span className="text-gray-400 font-normal">(what do you expect to happen?)</span>
            </label>
            <textarea
              value={hypothesis}
              onChange={e => setHypothesis(e.target.value)}
              rows={2}
              placeholder="e.g. I expect link clicks to increase by 20% and subscribers to grow faster"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Target className="w-3.5 h-3.5 inline mr-1" />
              Scope
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["global", "model", "group", "profile"] as ChangeScope[]).map(s => (
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

          {/* Affected selectors based on scope */}
          {scope !== "global" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Affected Models</label>
                <MultiSelect
                  label="Models"
                  options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))}
                  selected={modelIds}
                  onChange={setModelIds}
                />
              </div>
              {(scope === "group" || scope === "profile") && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Affected Groups</label>
                  <MultiSelect label="Groups" options={groupOptions} selected={groupIds} onChange={setGroupIds} />
                </div>
              )}
              {scope === "profile" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Affected Profiles</label>
                  <MultiSelect label="Profiles" options={profileOptions} selected={profileIds} onChange={setProfileIds} searchable />
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <TagIcon className="w-3.5 h-3.5 inline mr-1" />
              Tags <span className="text-gray-400 font-normal">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. test, urgent, experiment"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : (existing ? "Update" : "Create")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
interface ChangelogClientProps {
  changes: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  analyses?: any[];
}

export function ChangelogClient({ changes: initialChanges, models, groups, profiles, analyses: initialAnalyses = [] }: ChangelogClientProps) {
  const [changes, setChanges] = useState(initialChanges);
  const [analyses, setAnalyses] = useState(initialAnalyses);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterModels, setFilterModels] = useState<string[]>([]);

  // AI Analysis state
  const [analyzingChangeId, setAnalyzingChangeId] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [analysisMeta, setAnalysisMeta] = useState<any>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  // Group analyses by change_id for display
  const analysesByChange = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const a of analyses) {
      if (!a.change_id) continue;
      if (!map[a.change_id]) map[a.change_id] = [];
      map[a.change_id].push(a);
    }
    return map;
  }, [analyses]);

  async function runImpactAnalysis(change: any) {
    setAnalyzingChangeId(change.id);
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResult("");
    setCurrentAnalysisId(null);

    // Date range: 7 days before change, to today
    const changeDate = new Date(change.change_date + "T00:00:00");
    const from = new Date(changeDate);
    from.setDate(from.getDate() - 7);
    const today = new Date();
    const fromStr = from.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];

    const language = typeof window !== "undefined" ? (localStorage.getItem("ai_analysis_language") || "en") : "en";

    setAnalysisMeta({
      title: `Impact: ${change.title}`,
      scope: change.scope,
      date_from: fromStr,
      date_to: toStr,
      created_at: new Date().toISOString(),
    });

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "change_impact",
          changeId: change.id,
          scope: change.scope,
          modelIds: change.affected_model_ids || [],
          groupIds: change.affected_group_ids || [],
          profileIds: change.affected_profile_ids || [],
          dateFrom: fromStr,
          dateTo: toStr,
          language,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");
      setAnalysisResult(data.result);
      setCurrentAnalysisId(data.id);
      setAnalysisMeta((prev: any) => ({
        ...prev,
        title: data.title,
        model_used: data.model_used,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
      }));
      // Add to local analyses list so it shows up under the change
      setAnalyses(prev => [{
        id: data.id,
        change_id: change.id,
        title: data.title,
        date_from: fromStr,
        date_to: toStr,
        created_at: new Date().toISOString(),
        model_used: data.model_used,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
      }, ...prev]);
    } catch (e: any) {
      setAnalysisError(e.message || "Analysis failed");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function viewAnalysis(analysisId: string) {
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysisResult("");
    setCurrentAnalysisId(analysisId);

    try {
      const a = await getAnalysis(analysisId);
      if (!a) throw new Error("Analysis not found");
      setAnalysisResult(a.result_markdown || "");
      setAnalysisMeta({
        title: a.title,
        scope: a.scope,
        date_from: a.date_from,
        date_to: a.date_to,
        created_at: a.created_at,
        model_used: a.model_used,
        input_tokens: a.input_tokens,
        output_tokens: a.output_tokens,
      });
    } catch (e: any) {
      setAnalysisError(e.message || "Failed to load");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleDeleteAnalysis() {
    if (!currentAnalysisId) return;
    if (!confirm("Delete this analysis?")) return;
    const result = await deleteAnalysis(currentAnalysisId);
    if (result.success) {
      setAnalyses(prev => prev.filter(a => a.id !== currentAnalysisId));
      setAnalysisOpen(false);
    }
  }

  // Build lookup maps for quick display
  const modelMap = useMemo(() => Object.fromEntries(models.map((m: any) => [m.id, m.nickname || m.name])), [models]);
  const groupMap = useMemo(() => Object.fromEntries(groups.map((g: any) => [g.id, g.name])), [groups]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p: any) => [p.id, p.instagram_username])), [profiles]);

  // Filter changes
  const filtered = useMemo(() => {
    return changes.filter(c => {
      if (filterCategory !== "all" && c.category !== filterCategory) return false;
      if (filterModels.length > 0) {
        // Match if change affects any of the selected models OR if it's global
        if (c.scope === "global") return true;
        const affectedModels = c.affected_model_ids || [];
        if (!affectedModels.some((id: string) => filterModels.includes(id))) {
          // Also check via group/profile -> model mapping
          const affectedGroups = c.affected_group_ids || [];
          const affectedProfiles = c.affected_profile_ids || [];
          const groupModels = groups.filter((g: any) => affectedGroups.includes(g.id)).map((g: any) => g.model_id);
          const profileModels = profiles.filter((p: any) => affectedProfiles.includes(p.id)).map((p: any) => p.model_id);
          const allModels = new Set([...affectedModels, ...groupModels, ...profileModels]);
          if (!filterModels.some(m => allModels.has(m))) return false;
        }
      }
      return true;
    });
  }, [changes, filterCategory, filterModels, groups, profiles]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this change entry?")) return;
    const result = await deleteChange(id);
    if (result.success) {
      setChanges(prev => prev.filter(c => c.id !== id));
    } else {
      alert("Failed to delete: " + result.error);
    }
  }

  async function handleSaved() {
    // Refetch from server by reloading the page data
    // Simpler: just close modal and let revalidatePath refresh next time
    // For immediate UX, we reload
    window.location.reload();
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Changelog</h1>
          <p className="text-gray-500 text-sm mt-1">Track system changes for impact analysis</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Change
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Category:</span>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-300"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="w-[200px]">
          <MultiSelect
            label="Models"
            options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))}
            selected={filterModels}
            onChange={setFilterModels}
          />
        </div>

        <span className="ml-auto text-sm text-gray-500">{filtered.length} changes</span>
      </div>

      {/* Changes list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No changes logged yet</p>
            <button
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              Log your first change →
            </button>
          </div>
        )}

        {filtered.map(change => {
          const catInfo = getCategoryInfo(change.category);
          const affectedModels = (change.affected_model_ids || []).map((id: string) => modelMap[id]).filter(Boolean);
          const affectedGroups = (change.affected_group_ids || []).map((id: string) => groupMap[id]).filter(Boolean);
          const affectedProfiles = (change.affected_profile_ids || []).map((id: string) => profileMap[id]).filter(Boolean);

          return (
            <div key={change.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(change.change_date)}
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded", catInfo.color)}>
                    {catInfo.label}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">Scope: {change.scope}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(() => {
                    // Require at least 3 full days of data after the change
                    const changeDate = new Date(change.change_date + "T00:00:00");
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const daysSince = Math.floor((today.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24));
                    const needsWait = daysSince < 3;
                    const daysRemaining = 3 - daysSince;
                    return (
                      <button
                        onClick={() => runImpactAnalysis(change)}
                        disabled={analyzingChangeId === change.id || needsWait}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors",
                          needsWait
                            ? "text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed"
                            : "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200 disabled:opacity-50"
                        )}
                        title={needsWait
                          ? `Needs at least 3 days of data after the change (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} to go)`
                          : "Analyze Impact with Claude"}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {needsWait ? `Wait ${daysRemaining}d` : "Analyze Impact"}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => { setEditing(change); setModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(change.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-gray-900 mb-1">{change.title}</h3>

              {/* Description */}
              {change.description && (
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{change.description}</p>
              )}

              {/* Hypothesis */}
              {change.hypothesis && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Hypothesis</div>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap">{change.hypothesis}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Affected */}
              {(affectedModels.length > 0 || affectedGroups.length > 0 || affectedProfiles.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {affectedModels.map((name: string, i: number) => (
                    <span key={`m-${i}`} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">👤 {name}</span>
                  ))}
                  {affectedGroups.map((name: string, i: number) => (
                    <span key={`g-${i}`} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">🗂 {name}</span>
                  ))}
                  {affectedProfiles.map((name: string, i: number) => (
                    <span key={`p-${i}`} className="text-xs bg-pink-50 text-pink-700 px-2 py-0.5 rounded">@{name}</span>
                  ))}
                </div>
              )}

              {/* Tags */}
              {change.tags && change.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {change.tags.map((t: string, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
              )}

              {/* Saved Analyses */}
              {analysesByChange[change.id] && analysesByChange[change.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Past Analyses ({analysesByChange[change.id].length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {analysesByChange[change.id].map((a: any) => (
                      <button
                        key={a.id}
                        onClick={() => viewAnalysis(a.id)}
                        className="flex items-center justify-between w-full text-left px-3 py-2 bg-purple-50/50 hover:bg-purple-50 border border-purple-100 rounded-lg transition-colors"
                      >
                        <span className="text-xs text-gray-700 truncate flex-1">{a.title || "Impact Analysis"}</span>
                        <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">
                          {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ChangeFormModal
          existing={editing}
          models={models}
          groups={groups}
          profiles={profiles}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* AI Analysis Viewer */}
      {analysisOpen && (
        <AnalysisViewer
          result={analysisResult}
          meta={analysisMeta}
          loading={analysisLoading}
          error={analysisError}
          onClose={() => { setAnalysisOpen(false); setAnalyzingChangeId(null); }}
          onDelete={currentAnalysisId && !analysisLoading ? handleDeleteAnalysis : undefined}
        />
      )}
    </div>
  );
}
