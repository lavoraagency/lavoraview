"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Search, Sparkles, X, Loader2, Calendar } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

type SortField = "views" | "posted_at" | "username" | "music" | "speaking" | "text_goal" | "location" | "outfit" | "acting" | "camera" | "scroll_stopper" | "reward_ending" | "caption_type" | "other";
type SortDir = "asc" | "desc";

// ── MultiSelect (same pattern as other tabs) ──────────────────
function MultiSelect({
  label, options, selected, onChange, noneLabel, searchable,
}: {
  label: string; options: { id: string; name: string }[]; selected: string[] | null;
  onChange: (ids: string[] | null) => void; noneLabel?: string; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); } }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50); if (!open) setSearch(""); }, [open, searchable]);

  const isAll = noneLabel ? (selected as string[]).length === 0 : selected === null;
  const sel = selected ?? [];
  const filteredOptions = searchable && search.trim() ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())) : options;
  const displayText = isAll ? (noneLabel ? noneLabel : `All ${label}`) : sel.length === 1 ? options.find(o => o.id === sel[0])?.name || label : `${sel.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors min-w-[140px]">
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px]">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100">
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400 placeholder-gray-400" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {!search && (
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <input type="checkbox" checked={isAll} onChange={() => { if (noneLabel) onChange(isAll ? options.map(o => o.id) : []); else onChange(isAll ? [] : null); }} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm font-medium">{noneLabel ? "No Tags" : "Select All"}</span>
              </label>
            )}
            {filteredOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={isAll || sel.includes(o.id)} onChange={() => {
                  if (isAll && !noneLabel) onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                  else if (sel.includes(o.id)) { const next = sel.filter(id => id !== o.id); onChange(noneLabel ? next : (next.length === 0 ? [] : next)); }
                  else { const next = [...sel, o.id]; if (!noneLabel && next.length === options.length) onChange(null); else onChange(next); }
                }} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm">{o.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  if (!text) return null;
  return <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap", color || "bg-gray-100 text-gray-700")}>{text}</span>;
}

function YesNoBadge({ value }: { value: boolean }) {
  return value
    ? <Badge text="Yes" color="bg-green-50 text-green-700" />
    : <Badge text="No" color="bg-gray-50 text-gray-400" />;
}

// ── Expanded Row Detail ────────────────────────────────────────

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

// ── DatePicker with "All Time" support ─────────────────────────
function DatePicker({
  value,
  onChange,
  maxDate,
}: {
  value: string; // empty string = All Time
  onChange: (date: string) => void;
  maxDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = value ? new Date(value + "T00:00:00") : new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      const base = value ? new Date(value + "T00:00:00") : new Date();
      setViewMonth({ year: base.getFullYear(), month: base.getMonth() });
    }
  }, [open]);

  function handleDayClick(dateStr: string) { if (dateStr > maxDate) return; onChange(dateStr); setOpen(false); }

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
    const t = new Date();
    const todayStr = toLocalDateStr(t);
    return [
      { label: "All Time", date: "" },
      { label: "Yesterday", date: addDays(todayStr, -1) },
      { label: "2 Days Ago", date: addDays(todayStr, -2) },
      { label: "3 Days Ago", date: addDays(todayStr, -3) },
      { label: "1 Week Ago", date: addDays(todayStr, -7) },
    ];
  }, []);

  const displayText = useMemo(() => {
    if (!value) return "All Time";
    for (const p of presets) { if (value === p.date && p.date) return p.label; }
    const d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  }, [value, presets]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-300 transition-colors">
        <Calendar className="w-4 h-4 text-gray-400" />
        {displayText}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 flex">
          <div className="border-r border-gray-100 py-2 w-36">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => { onChange(p.date); setOpen(false); }}
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
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const disabled = dateStr > maxDate;
                const isSelected = dateStr === value;
                return (
                  <button
                    key={i} disabled={disabled} onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-8 text-xs rounded transition-colors",
                      !inMonth && "text-gray-300",
                      inMonth && !disabled && !isSelected && "text-gray-700 hover:bg-gray-100",
                      disabled && "text-gray-200 cursor-not-allowed",
                      isSelected && "bg-gray-900 text-white font-semibold rounded-lg",
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

// ── Markdown Analysis Renderer ─────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  // Handle **bold** and numbers in bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, j) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      const inner = p.slice(2, -2);
      // Special: highlight fraction like "8 out of 11" or "8 von 11"
      const isFraction = /\d+\s*(out of|von|\/)\s*\d+/i.test(inner);
      if (isFraction) {
        return <span key={j} className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-700 font-bold text-sm rounded">{inner}</span>;
      }
      return <strong key={j} className="font-bold text-gray-900">{inner}</strong>;
    }
    return <span key={j}>{p}</span>;
  });
}

function AnalysisRenderer({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const sections: Array<{ heading: string | null; items: React.ReactNode[] }> = [];
  let current: { heading: string | null; items: React.ReactNode[] } = { heading: null, items: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // H2 / H1 heading
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (current.heading !== null || current.items.length > 0) sections.push(current);
      current = { heading: trimmed.replace(/^#+\s*/, ""), items: [] };
      continue;
    }

    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      current.items.push(
        <li key={`li-${i}`} className="flex gap-2 mb-1.5">
          <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
          <span className="flex-1">{renderInline(trimmed.slice(2))}</span>
        </li>
      );
      continue;
    }

    // Regular paragraph
    current.items.push(
      <p key={`p-${i}`} className="mb-2 leading-relaxed">{renderInline(trimmed)}</p>
    );
  }
  if (current.heading !== null || current.items.length > 0) sections.push(current);

  return (
    <div className="space-y-5">
      {sections.map((s, idx) => {
        // Extract leading emoji (anything before the first space, if non-ASCII)
        let emoji: string | null = null;
        let headingText: string | null = s.heading;
        if (s.heading) {
          const firstSpace = s.heading.indexOf(" ");
          if (firstSpace > 0) {
            const prefix = s.heading.slice(0, firstSpace);
            // Check if prefix is non-ASCII (likely an emoji)
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
            <div className="text-sm text-gray-700">
              {/* Wrap bullet items in ul, keep paragraphs as-is */}
              {groupItems(s.items)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Group consecutive <li> elements into <ul>
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
    // Check if it's an <li> by inspecting props (rough check)
    const el = item as any;
    if (el?.type === "li" || (el?.props && typeof el.props === "object" && el.key?.toString().startsWith("li-"))) {
      buffer.push(item);
    } else {
      flush();
      out.push(item);
    }
  }
  flush();
  return out;
}

// ── Main Component ─────────────────────────────────────────────
interface PatternAnalysisClientProps {
  reels: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  tags: any[];
}

export function PatternAnalysisClient({ reels, models, groups, profiles, tags }: PatternAnalysisClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(""); // empty = All Time
  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // AI Analysis state
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisColumn, setAnalysisColumn] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<string>("");
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisError, setAnalysisError] = useState<string>("");

  // Group options
  const groupOptions = useMemo(() => {
    let opts = groups.map((g: any) => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) opts = opts.filter(g => selectedModels.includes(g.model_id));
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  const profileOptions = useMemo(() => {
    let opts = profiles.map((p: any) => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels !== null && selectedModels.length > 0) {
      const ids = new Set(profiles.filter((p: any) => selectedModels.includes(p.model_id)).map((p: any) => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    if (selectedGroups !== null && selectedGroups.length > 0) {
      const ids = new Set(profiles.filter((p: any) => selectedGroups.includes(p.account_group_id)).map((p: any) => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  // Sort helper
  function getSortValue(r: any, field: SortField): string | number {
    const a = r.video_analysis || {};
    switch (field) {
      case "views": return r.current_views || 0;
      case "posted_at": return r.posted_at ? new Date(r.posted_at).getTime() : 0;
      case "username": return r.profiles?.instagram_username || "";
      case "music": return a.sound_music?.genre || "";
      case "speaking": return a.sound_speaking?.speaking_purpose || "";
      case "text_goal": return a.text_overlay?.text_goal || a.text_overlay?.text_type || "";
      case "location": return a.background_location || "";
      case "outfit": return a.outfit || "";
      case "acting": return a.acting || "";
      case "camera": return a.camera_setup || "";
      case "scroll_stopper": return a.scroll_stopper?.has_scroll_stopper ? 1 : 0;
      case "reward_ending": return a.reward_ending?.has_reward ? 1 : 0;
      case "caption_type": return a.caption_type?.type || "";
      case "other": return a.other_notable || "";
      default: return 0;
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />;
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let result = reels.filter(r => {
      const profile = r.profiles as any;
      if (!profile) return false;
      if (selectedModels !== null && !selectedModels.includes(profile.models?.id)) return false;
      if (selectedGroups !== null && !selectedGroups.includes(profile.account_groups?.id)) return false;
      if (selectedProfiles !== null && !selectedProfiles.includes(profile.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = profile.tags || [];
        const tagNames = tags.filter((t: any) => selectedTags.includes(t.id)).map((t: any) => t.name);
        if (!tagNames.some((tn: string) => profileTags.includes(tn))) return false;
      }
      // Date filter: only reels analyzed on selected day
      if (selectedDate) {
        const analyzedAt = r.video_analysis?.analyzed_at;
        if (!analyzedAt) return false;
        const date = analyzedAt.split("T")[0];
        if (date !== selectedDate) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const a = r.video_analysis || {};
        const searchIn = [
          profile.instagram_username, a.outfit, a.acting, a.background_location, a.camera_setup,
          a.sound_music?.genre, a.sound_speaking?.summary, a.text_overlay?.text_content,
          a.caption_type?.type, a.other_notable, r.caption
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchIn.includes(q)) return false;
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      const cmp = typeof va === "number" ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [reels, selectedModels, selectedGroups, selectedProfiles, selectedTags, searchText, tags, sortField, sortDir, selectedDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  useEffect(() => { setPage(0); }, [selectedModels, selectedGroups, selectedProfiles, selectedTags, searchText, sortField, sortDir, rowsPerPage, selectedDate]);

  // Extract the string value of a column for a given reel (for AI analysis)
  function getColumnValue(r: any, col: string): string {
    const a = r.video_analysis || {};
    switch (col) {
      case "music":
        if (!a.sound_music?.has_music) return "No music";
        return `${a.sound_music.genre || "?"}, ${a.sound_music.volume || "?"} volume. ${a.sound_music.description || ""}`.trim();
      case "speaking":
        if (!a.sound_speaking?.has_speaking) return "No speaking";
        return `[${a.sound_speaking.speaking_purpose || "?"}] ${a.sound_speaking.summary || ""}`.trim();
      case "text_goal":
        if (!a.text_overlay?.has_text) return "No text overlay";
        return `[${a.text_overlay.text_goal || a.text_overlay.text_type || "?"}] "${a.text_overlay.text_content || ""}" — ${a.text_overlay.text_description || a.text_overlay.text_purpose || ""}`.trim();
      case "location": return a.background_location || "";
      case "outfit": return a.outfit || "";
      case "acting": return a.acting || "";
      case "camera": return a.camera_setup || "";
      case "scroll_stopper":
        return a.scroll_stopper?.has_scroll_stopper
          ? `Yes — ${a.scroll_stopper.description || ""}`
          : "No scroll stopper";
      case "reward_ending":
        return a.reward_ending?.has_reward
          ? `Yes — ${a.reward_ending.description || ""}`
          : "No reward ending";
      case "caption_type":
        return `[${a.caption_type?.type || "?"}] ${a.caption_type?.purpose || ""}`.trim();
      case "other": return a.other_notable || "";
      default: return "";
    }
  }

  async function runAnalysis(column: string, columnLabel: string) {
    setAnalysisOpen(true);
    setAnalysisLoading(true);
    setAnalysisColumn(columnLabel);
    setAnalysisResult("");
    setAnalysisError("");

    try {
      // Build payload: sorted by views DESC, include views + extracted column value
      const payload = filtered
        .map((r: any) => ({
          shortcode: r.shortcode,
          views: r.current_views || 0,
          value: getColumnValue(r, column),
        }))
        .sort((a: any, b: any) => b.views - a.views);

      setAnalysisCount(payload.length);

      // Read language preference from localStorage
      const language = typeof window !== "undefined" ? localStorage.getItem("ai_analysis_language") || "en" : "en";

      const resp = await fetch("/api/analyze-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column, reels: payload, language }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed");

      setAnalysisResult(data.analysis);
    } catch (e: any) {
      setAnalysisError(e.message || "Something went wrong");
    } finally {
      setAnalysisLoading(false);
    }
  }

  const columns: { field: SortField; label: string; minWidth: string }[] = [
    { field: "views", label: "Views", minWidth: "min-w-[80px]" },
    { field: "music", label: "Music", minWidth: "min-w-[200px]" },
    { field: "speaking", label: "Speaking", minWidth: "min-w-[200px]" },
    { field: "text_goal", label: "Text", minWidth: "min-w-[240px]" },
    { field: "location", label: "Location", minWidth: "min-w-[160px]" },
    { field: "outfit", label: "Outfit", minWidth: "min-w-[240px]" },
    { field: "acting", label: "Acting", minWidth: "min-w-[240px]" },
    { field: "camera", label: "Camera", minWidth: "min-w-[220px]" },
    { field: "scroll_stopper", label: "Scroll Stop", minWidth: "min-w-[200px]" },
    { field: "reward_ending", label: "Reward End", minWidth: "min-w-[200px]" },
    { field: "caption_type", label: "Caption", minWidth: "min-w-[220px]" },
    { field: "other", label: "Other", minWidth: "min-w-[220px]" },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MultiSelect label="Creators" options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))} selected={selectedModels} onChange={v => { setSelectedModels(v); setSelectedGroups(null); setSelectedProfiles(null); }} />
        <MultiSelect label="Groups" options={groupOptions} selected={selectedGroups} onChange={setSelectedGroups} />
        <MultiSelect label="Profiles" options={profileOptions} selected={selectedProfiles} onChange={setSelectedProfiles} searchable />
        <MultiSelect label="Tags" options={tags.map((t: any) => ({ id: t.id, name: t.name }))} selected={selectedTags} onChange={(ids) => setSelectedTags((ids ?? []) as string[])} noneLabel="No Tags" />

        <div className="ml-auto flex items-center gap-2">
          {/* Date Navigator (same style as Top Reels) */}
          <button
            onClick={() => { if (selectedDate) setSelectedDate(addDays(selectedDate, -1)); }}
            disabled={!selectedDate}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <DatePicker value={selectedDate} onChange={setSelectedDate} maxDate={toLocalDateStr(new Date())} />
          <button
            onClick={() => {
              if (!selectedDate) return;
              const today = toLocalDateStr(new Date());
              const next = addDays(selectedDate, 1);
              if (next <= today) setSelectedDate(next);
            }}
            disabled={!selectedDate || selectedDate >= toLocalDateStr(new Date())}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search patterns..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 w-48"
            />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} reels</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ minWidth: "100%" }}>
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]"></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  <button onClick={() => toggleSort("username")} className="flex items-center gap-1">Account <SortIcon field="username" /></button>
                </th>
                {columns.map(col => {
                  const canAnalyze = col.field !== "views";
                  return (
                    <th key={col.field} className={cn("px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", col.minWidth)}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleSort(col.field)} className="flex items-center gap-1 hover:text-gray-700">{col.label} <SortIcon field={col.field} /></button>
                        {canAnalyze && (
                          <button
                            onClick={() => runAnalysis(col.field, col.label)}
                            disabled={filtered.length === 0}
                            title={`AI pattern analysis for ${col.label}`}
                            className="p-0.5 rounded hover:bg-purple-100 text-purple-500 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(r => {
                const profile = r.profiles as any;
                const a = r.video_analysis || {};
                const isExpanded = expandedId === r.id;

                const trunc = (s: string | null | undefined, n: number) => !s ? "" : (s.length > n ? s.substring(0, n) + "…" : s);
                const Cell = ({ children, minWidth }: { children: React.ReactNode; minWidth: string }) => (
                  <td className={cn("px-3 py-2 align-top text-xs", minWidth)}>{children}</td>
                );

                return (
                  <tr key={r.id} className={cn("hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50", isExpanded && "bg-gray-50/30")} onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                    {/* Thumbnail */}
                    <td className="px-3 py-2 align-top">
                      <a href={r.reel_url || `https://www.instagram.com/reel/${r.shortcode}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        {r.thumbnail_url ? (
                          <img src={r.thumbnail_url} alt="" className="w-10 h-[60px] object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-10 h-[60px] bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">▶</div>
                        )}
                      </a>
                    </td>
                    {/* Account */}
                    <td className="px-3 py-2 align-top min-w-[140px]">
                      <Link href={`/dashboard/profiles/${profile?.id}`} onClick={e => e.stopPropagation()} className="text-xs font-medium text-gray-700 hover:text-brand-600">
                        @{profile?.instagram_username}
                      </Link>
                      <div className="text-[10px] text-gray-400">{r.posted_at ? new Date(r.posted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) : "?"}</div>
                    </td>
                    {/* Views */}
                    <Cell minWidth="min-w-[80px]"><span className="font-semibold text-gray-900">{formatNumber(r.current_views)}</span></Cell>
                    {/* Music */}
                    <Cell minWidth="min-w-[200px]">
                      {a.sound_music?.has_music ? (
                        <div className="space-y-1">
                          <div className="flex gap-1"><Badge text={a.sound_music.genre || "?"} /><Badge text={a.sound_music.volume || "?"} /></div>
                          {a.sound_music.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.sound_music.description : trunc(a.sound_music.description, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Speaking */}
                    <Cell minWidth="min-w-[200px]">
                      {a.sound_speaking?.has_speaking ? (
                        <div className="space-y-1">
                          <Badge text={a.sound_speaking.speaking_purpose || "?"} color="bg-blue-50 text-blue-700" />
                          {a.sound_speaking.summary && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.sound_speaking.summary : trunc(a.sound_speaking.summary, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Text */}
                    <Cell minWidth="min-w-[240px]">
                      {a.text_overlay?.has_text ? (
                        <div className="space-y-1">
                          <Badge text={a.text_overlay.text_goal || a.text_overlay.text_type || "?"} />
                          {a.text_overlay.text_content && <p className="text-[11px] text-gray-700 italic leading-snug">&ldquo;{isExpanded ? a.text_overlay.text_content : trunc(a.text_overlay.text_content, 70)}&rdquo;</p>}
                          {(a.text_overlay.text_description || a.text_overlay.text_purpose) && <p className="text-[11px] text-gray-500 leading-snug">{isExpanded ? (a.text_overlay.text_description || a.text_overlay.text_purpose) : trunc(a.text_overlay.text_description || a.text_overlay.text_purpose, 70)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Location */}
                    <Cell minWidth="min-w-[160px]">{a.background_location ? (isExpanded ? a.background_location : trunc(a.background_location, 40)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Outfit */}
                    <Cell minWidth="min-w-[240px]">{a.outfit ? (isExpanded ? a.outfit : trunc(a.outfit, 70)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Acting */}
                    <Cell minWidth="min-w-[240px]">{a.acting ? (isExpanded ? a.acting : trunc(a.acting, 70)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Camera */}
                    <Cell minWidth="min-w-[220px]">{a.camera_setup ? (isExpanded ? a.camera_setup : trunc(a.camera_setup, 60)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Scroll Stop */}
                    <Cell minWidth="min-w-[200px]">
                      <div className="space-y-1">
                        <YesNoBadge value={a.scroll_stopper?.has_scroll_stopper} />
                        {a.scroll_stopper?.has_scroll_stopper && a.scroll_stopper?.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.scroll_stopper.description : trunc(a.scroll_stopper.description, 60)}</p>}
                      </div>
                    </Cell>
                    {/* Reward End */}
                    <Cell minWidth="min-w-[200px]">
                      <div className="space-y-1">
                        <YesNoBadge value={a.reward_ending?.has_reward} />
                        {a.reward_ending?.has_reward && a.reward_ending?.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.reward_ending.description : trunc(a.reward_ending.description, 60)}</p>}
                      </div>
                    </Cell>
                    {/* Caption */}
                    <Cell minWidth="min-w-[220px]">
                      {a.caption_type?.type ? (
                        <div className="space-y-1">
                          <Badge text={a.caption_type.type} />
                          {a.caption_type.purpose && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.caption_type.purpose : trunc(a.caption_type.purpose, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Other */}
                    <Cell minWidth="min-w-[220px]">{a.other_notable ? (isExpanded ? a.other_notable : trunc(a.other_notable, 60)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Expand arrow */}
                    <td className="px-3 py-2 align-top">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No reels with pattern analysis found</div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows:</span>
              <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Modal */}
      {analysisOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAnalysisOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Pattern Analysis: {analysisColumn}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{analysisCount} reels · AI-generated insights</p>
                </div>
              </div>
              <button onClick={() => setAnalysisOpen(false)} className="text-gray-400 hover:text-gray-600 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {analysisLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  <p className="text-sm text-gray-500">Analyzing {analysisCount} reels…</p>
                </div>
              )}
              {analysisError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  <strong>Error:</strong> {analysisError}
                </div>
              )}
              {!analysisLoading && !analysisError && analysisResult && (
                <AnalysisRenderer markdown={analysisResult} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
