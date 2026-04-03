"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ExternalLink, Download } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = [
  "#111F39",
  "#13223F",
  "#162748",
  "#17294D",
  "#1A2E57",
];

const SHOW_OPTIONS = [5, 15, 30, 50, 0] as const;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Helper: local date string YYYY-MM-DD
function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localToday() {
  return toLocalDateStr(new Date());
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}

interface AnalyticsClientProps {
  profiles: any[];
  snapshots: any[];
  conversions: any[];
  ofStats: any[];
  models: any[];
  groups: any[];
  tags: any[];
}

// ── Date Range Picker ──────────────────────────────────────────────
interface DateRange { from: string; to: string }

function DateRangePicker({
  range,
  onChange,
  minDate,
  maxDate,
}: {
  range: DateRange;
  onChange: (r: DateRange) => void;
  minDate: string;
  maxDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"from" | "to" | null>(null);
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
        setSelecting(null);
        setTempFrom(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset view month when opening
  useEffect(() => {
    if (open) {
      const d = new Date(range.to + "T00:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
      setSelecting("from");
      setTempFrom(null);
    }
  }, [open]);

  function applyPreset(from: string, to: string) {
    // Clamp to min/max
    const clampedFrom = from < minDate ? minDate : from;
    const clampedTo = to > maxDate ? maxDate : to;
    onChange({ from: clampedFrom, to: clampedTo });
    setOpen(false);
    setSelecting(null);
    setTempFrom(null);
  }

  function handleDayClick(dateStr: string) {
    if (dateStr < minDate || dateStr > maxDate) return;

    if (!tempFrom) {
      // First click — set start
      setTempFrom(dateStr);
      setSelecting("to");
    } else {
      // Second click — set end
      const from = dateStr < tempFrom ? dateStr : tempFrom;
      const to = dateStr < tempFrom ? tempFrom : dateStr;
      onChange({ from, to });
      setOpen(false);
      setSelecting(null);
      setTempFrom(null);
    }
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = viewMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6;

    const days: { dateStr: string; day: number; inMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({ dateStr: toLocalDateStr(date), day: d, inMonth: true });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateStr: toLocalDateStr(d), day: d.getDate(), inMonth: false });
    }

    return days;
  }, [viewMonth]);

  function prevMonth() {
    setViewMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }
  function nextMonth() {
    setViewMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  const today = localToday();

  // Presets
  const presets = useMemo(() => {
    const t = new Date();
    const todayStr = toLocalDateStr(t);

    const yesterdayD = new Date(t);
    yesterdayD.setDate(yesterdayD.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterdayD);

    // Current week (Monday to today)
    const dayOfWeek = t.getDay() === 0 ? 6 : t.getDay() - 1;
    const mondayD = new Date(t);
    mondayD.setDate(mondayD.getDate() - dayOfWeek);
    const mondayStr = toLocalDateStr(mondayD);

    // Current month
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

  // Display text
  const displayText = useMemo(() => {
    // Check if matches a preset
    for (const p of presets) {
      const clampedFrom = p.from < minDate ? minDate : p.from;
      const clampedTo = p.to > maxDate ? maxDate : p.to;
      if (range.from === clampedFrom && range.to === clampedTo) return p.label;
    }
    if (range.from === range.to) {
      if (range.from === today) return "Today";
      const d = new Date(range.from + "T00:00:00");
      return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    }
    const f = new Date(range.from + "T00:00:00");
    const t = new Date(range.to + "T00:00:00");
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    return `${fmt(f)} - ${fmt(t)}`;
  }, [range, presets, today, minDate, maxDate]);

  // Active preset
  const activePreset = useMemo(() => {
    for (const p of presets) {
      const clampedFrom = p.from < minDate ? minDate : p.from;
      const clampedTo = p.to > maxDate ? maxDate : p.to;
      if (range.from === clampedFrom && range.to === clampedTo) return p.label;
    }
    return null;
  }, [range, presets, minDate, maxDate]);

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
          <div className="border-r border-gray-100 py-2 w-40">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.from, p.to)}
                className={cn(
                  "block w-full text-left px-4 py-2 text-sm transition-colors",
                  activePreset === p.label
                    ? "bg-brand-50 text-brand-600 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4 w-[280px]">
            {/* Header */}
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

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map(({ dateStr, day, inMonth }, i) => {
                const disabled = dateStr < minDate || dateStr > maxDate;
                const isRangeStart = dateStr === (tempFrom || range.from);
                const isRangeEnd = tempFrom ? null : dateStr === range.to;
                const inRange = tempFrom
                  ? dateStr >= tempFrom && dateStr <= tempFrom // single selection so far
                  : dateStr >= range.from && dateStr <= range.to;
                const isSelected = isRangeStart || isRangeEnd;

                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => handleDayClick(dateStr)}
                    className={cn(
                      "h-8 text-xs rounded transition-colors relative",
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

            {/* Selection hint */}
            <div className="mt-3 text-xs text-gray-400 text-center">
              {tempFrom
                ? "Select end date"
                : "Select start date"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────
// For non-noneLabel filters: selected=null means "all", selected=[] means "none"
// For noneLabel filters (Tags): selected=[] means "no tag filter" (original behavior)
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  noneLabel,
  searchable,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[] | null;
  onChange: (ids: string[] | null) => void;
  noneLabel?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    if (!open) setSearch("");
  }, [open, searchable]);

  // For noneLabel: "all" = empty array. For normal: "all" = null
  const isAll = noneLabel ? (selected as string[]).length === 0 : selected === null;
  const sel = selected ?? [];

  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayText = isAll
    ? (noneLabel ? noneLabel : `All ${label}`)
    : sel.length === 1
    ? options.find(o => o.id === sel[0])?.name || label
    : sel.length === 0
    ? `No ${label}`
    : `${sel.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors min-w-[160px]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px]">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search profile..."
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400 placeholder-gray-400"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {!search && (
              <>
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={isAll}
                    onChange={() => {
                      // Toggle: all → none, none/partial → all
                      if (noneLabel) {
                        onChange(isAll ? options.map(o => o.id) : []);
                      } else {
                        onChange(isAll ? [] : null);
                      }
                    }}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium">{noneLabel ? "No Tags" : "Select All"}</span>
                </label>
                {noneLabel && (
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={sel.length === options.length}
                      onChange={() => onChange(sel.length === options.length ? [] : options.map(o => o.id))}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                )}
              </>
            )}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No results</div>
            )}
            {filteredOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAll || sel.includes(o.id)}
                  onChange={() => {
                    if (isAll && !noneLabel) {
                      // null → remove this one item
                      onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                    } else if (sel.includes(o.id)) {
                      const next = sel.filter(id => id !== o.id);
                      onChange(noneLabel ? next : (next.length === 0 ? [] : next));
                    } else {
                      const next = [...sel, o.id];
                      if (!noneLabel && next.length === options.length) {
                        onChange(null); // back to "all"
                      } else {
                        onChange(next);
                      }
                    }
                  }}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3 border-r border-gray-200 last:border-r-0",
      sub && "bg-gray-50/50"
    )}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 ml-3">{value}</span>
    </div>
  );
}

function DonutCard({
  title,
  total,
  data,
}: {
  title: string;
  total: string;
  data: { name: string; value: number; color: string; profileId?: string }[];
}) {
  const top5 = data.slice(0, 5);

  // Group small slices into "Rest"
  const maxSlices = 10;
  const chartData = useMemo(() => {
    if (data.length <= maxSlices) return data;
    const visible = data.slice(0, maxSlices);
    const rest = data.slice(maxSlices);
    const restValue = rest.reduce((sum, d) => sum + d.value, 0);
    if (restValue > 0) {
      visible.push({ name: "Rest", value: restValue, color: "#94a3b8" });
    }
    return visible;
  }, [data]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="flex items-start gap-5">
        <div className="w-36 h-36 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.length > 0 ? chartData : [{ name: "empty", value: 1, color: "#e5e7eb" }]}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {(chartData.length > 0 ? chartData : [{ color: "#e5e7eb" }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name: string, props: any) => [formatNumber(value), props.payload.name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                wrapperStyle={{ zIndex: 50 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-xl font-bold text-gray-900">{total}</div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 pt-1">
          {top5.map((d, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-gray-600 truncate text-xs">{d.name}</span>
                {d.profileId && (
                  <a
                    href={`https://www.instagram.com/${d.name}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-brand-500 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <span className="font-semibold text-gray-900 ml-2 text-xs tabular-nums">{formatNumber(d.value)}</span>
            </div>
          ))}
          {data.length === 0 && <div className="text-xs text-gray-400">No data</div>}
        </div>
      </div>
    </div>
  );
}

function MetricRankList({
  title,
  data,
  showCount,
  suffix,
}: {
  title: string;
  data: { name: string; value: number }[];
  showCount: number;
  suffix?: string;
}) {
  const visibleData = showCount === 0 ? data : data.slice(0, showCount);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {visibleData.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No data</div>
      ) : (
        <div className="space-y-2">
          {visibleData.map((d, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">{i + 1}.</span>
                <span className="text-sm text-gray-700 truncate">{d.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 ml-3 tabular-nums flex-shrink-0">{d.value}{suffix || ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricBarChart({
  title,
  data,
  showCount,
}: {
  title: string;
  data: { name: string; value: number; fill: string }[];
  showCount: number;
}) {
  const visibleData = showCount === 0 ? data : data.slice(0, showCount);
  const barHeight = 32;
  const chartHeight = Math.max(150, visibleData.length * (barHeight + 8) + 40);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {visibleData.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={visibleData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
            <Tooltip formatter={(value: number) => formatNumber(value)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={barHeight}>
              {visibleData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function AnalyticsClient({ profiles, snapshots, conversions, ofStats, models, groups, tags }: AnalyticsClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCount, setShowCount] = useState(5);

  // Build profile color map
  const profileColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p, i) => {
      map[p.instagram_username] = COLORS[i % COLORS.length];
    });
    return map;
  }, [profiles]);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (selectedModels !== null && !selectedModels.includes(p.models?.id)) return false;
      if (selectedGroups !== null && !selectedGroups.includes(p.account_groups?.id)) return false;
      if (selectedProfiles !== null && !selectedProfiles.includes(p.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = p.tags || [];
        const tagNames = tags.filter(t => selectedTags.includes(t.id)).map(t => t.name);
        if (!tagNames.some(tn => profileTags.includes(tn))) return false;
      }
      return true;
    });
  }, [profiles, selectedModels, selectedGroups, selectedProfiles, selectedTags, tags]);

  const filteredProfileIds = useMemo(() => new Set(filteredProfiles.map(p => p.id)), [filteredProfiles]);

  const profileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach(p => { map[p.id] = p.instagram_username; });
    return map;
  }, [profiles]);

  // Group snapshots by date and profile (use UTC date from scraped_at)
  const snapshotsByDateProfile = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const s of snapshots) {
      const date = s.scraped_at.split("T")[0];
      if (!map[date]) map[date] = {};
      map[date][s.profile_id] = s;
    }
    return map;
  }, [snapshots]);

  // Group conversions by date and profile
  const conversionsByDateProfile = useMemo(() => {
    const map: Record<string, Record<string, { link_clicks: number; new_subs: number }>> = {};
    for (const c of conversions) {
      const date = c.date;
      if (!map[date]) map[date] = {};
      map[date][c.profile_id] = { link_clicks: c.link_clicks || 0, new_subs: c.new_subs || 0 };
    }
    return map;
  }, [conversions]);

  // Sorted available dates
  const availableDates = useMemo(() => {
    return Object.keys(snapshotsByDateProfile).sort();
  }, [snapshotsByDateProfile]);

  const minDate = availableDates[0] || localToday();
  const maxDate = localToday();

  // Date range state — default to yesterday
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const yesterday = addDays(localToday(), -1);
    return { from: yesterday, to: yesterday };
  });

  // Auto-clamp to available dates on mount
  useEffect(() => {
    if (availableDates.length > 0) {
      const first = availableDates[0];
      const last = availableDates[availableDates.length - 1];
      // If entire range is outside available data, snap to last available
      if (dateRange.from > last || dateRange.to < first) {
        setDateRange({ from: last, to: last });
      }
    }
  }, [availableDates]);

  // Get dates in range that have data
  const datesInRange = useMemo(() => {
    return availableDates.filter(d => d >= dateRange.from && d <= dateRange.to);
  }, [availableDates, dateRange]);

  // The date BEFORE the range start, for delta calculation of first day
  const dateBeforeRange = useMemo(() => {
    const idx = availableDates.indexOf(datesInRange[0]);
    if (idx > 0) return availableDates[idx - 1];
    return null;
  }, [availableDates, datesInRange]);

  // Calculate aggregated stats across the date range
  const stats = useMemo(() => {
    // For each profile, sum up daily deltas across all days in range
    const perProfile: Record<string, {
      name: string; followers: number; views: number;
      likes: number; comments: number; interactions: number;
      linkClicks: number; newSubs: number; estimatedTotalSubs: number;
    }> = {};

    let totalFollowers = 0, totalViews = 0, totalLikes = 0, totalComments = 0;
    let deltaFollowers = 0, deltaViews = 0, deltaLikes = 0, deltaComments = 0;
    let totalLinkClicks = 0, totalNewSubs = 0;
    let profileCount = 0;

    // Get the latest snapshot in range for absolute totals
    const lastDateInRange = datesInRange[datesInRange.length - 1];
    const lastDaySnaps = lastDateInRange ? (snapshotsByDateProfile[lastDateInRange] || {}) : {};

    // Absolute totals from last day in range
    for (const profileId of Array.from(filteredProfileIds)) {
      const snap = lastDaySnaps[profileId];
      if (!snap) continue;
      totalFollowers += snap.followers || 0;
      totalViews += snap.total_reel_views || 0;
      totalLikes += snap.total_reel_likes || 0;
      totalComments += snap.total_reel_comments || 0;
      profileCount++;
    }

    // Build ofStats lookup: date -> model_id -> total_new_subs
    const ofStatsByDateModel: Record<string, Record<string, number>> = {};
    for (const s of ofStats) {
      if (!ofStatsByDateModel[s.date]) ofStatsByDateModel[s.date] = {};
      ofStatsByDateModel[s.date][s.model_id] = s.total_new_subs || 0;
    }

    // Build profile -> model_id lookup
    const profileModelMap: Record<string, string> = {};
    for (const p of profiles) {
      if (p.model_id) profileModelMap[p.id] = p.model_id;
    }

    // Calculate deltas: sum daily changes across the range
    const allDatesForDelta = [...datesInRange];
    for (let i = 0; i < allDatesForDelta.length; i++) {
      const date = allDatesForDelta[i];
      const prevDate = i === 0 ? dateBeforeRange : allDatesForDelta[i - 1];
      const todaySnaps = snapshotsByDateProfile[date] || {};
      const prevSnaps = prevDate ? (snapshotsByDateProfile[prevDate] || {}) : {};

      const convSnaps = conversionsByDateProfile[date] || {};

      for (const profileId of Array.from(filteredProfileIds)) {
        const today = todaySnaps[profileId];
        if (!today) continue;
        let prev = prevSnaps[profileId];

        // If no prev on standard previous date, look further back for this profile
        if (!prev) {
          const dateIdx = availableDates.indexOf(date);
          for (let j = dateIdx - 1; j >= 0; j--) {
            const candidate = snapshotsByDateProfile[availableDates[j]]?.[profileId];
            if (candidate) { prev = candidate; break; }
          }
        }

        const name = profileNameMap[profileId] || "unknown";

        const dF = prev ? Math.max(0, (today.followers || 0) - (prev.followers || 0)) : 0;
        const dV = prev ? Math.max(0, (today.total_reel_views || 0) - (prev.total_reel_views || 0)) : 0;
        const dL = prev ? Math.max(0, (today.total_reel_likes || 0) - (prev.total_reel_likes || 0)) : 0;
        const dC = prev ? Math.max(0, (today.total_reel_comments || 0) - (prev.total_reel_comments || 0)) : 0;

        const conv = convSnaps[profileId];
        const lc = conv?.link_clicks || 0;
        const ns = conv?.new_subs || 0;

        deltaFollowers += dF;
        deltaViews += dV;
        deltaLikes += dL;
        deltaComments += dC;
        totalLinkClicks += lc;
        totalNewSubs += ns;

        if (!perProfile[profileId]) {
          perProfile[profileId] = { name, followers: 0, views: 0, likes: 0, comments: 0, interactions: 0, linkClicks: 0, newSubs: 0, estimatedTotalSubs: 0 };
        }
        perProfile[profileId].followers += dF;
        perProfile[profileId].views += dV;
        perProfile[profileId].likes += dL;
        perProfile[profileId].comments += dC;
        perProfile[profileId].interactions += dL + dC;
        perProfile[profileId].linkClicks += lc;
        perProfile[profileId].newSubs += ns;
      }

      // Proportionally distribute OF total subs to profiles per model for this day
      // Use ALL profiles (not just filtered) as denominator for correct proportions
      const modelTrackedAll: Record<string, number> = {};
      for (const p of profiles) {
        if (!p.model_id) continue;
        const conv = convSnaps[p.id];
        const ns = conv?.new_subs || 0;
        modelTrackedAll[p.model_id] = (modelTrackedAll[p.model_id] || 0) + ns;
      }

      // Distribute OF total subs proportionally to filtered profiles
      const dayOfStats = ofStatsByDateModel[date] || {};
      for (const profileId of Array.from(filteredProfileIds)) {
        const modelId = profileModelMap[profileId];
        if (!modelId) continue;
        const ofTotal = dayOfStats[modelId];
        const modelTotal = modelTrackedAll[modelId];
        if (!ofTotal || !modelTotal) continue;
        const conv = convSnaps[profileId];
        const ns = conv?.new_subs || 0;
        if (ns > 0 && perProfile[profileId]) {
          perProfile[profileId].estimatedTotalSubs += Math.round((ns / modelTotal) * ofTotal);
        }
      }
    }

    const totalInteractions = deltaLikes + deltaComments;
    const totalPosts = Array.from(filteredProfileIds).reduce((sum, pid) => {
      const snap = lastDaySnaps[pid];
      return sum + (snap?.media_count || 0);
    }, 0);
    const avgViews = profileCount > 0 && totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
    const viralityRatio = deltaViews > 0 ? ((totalInteractions / deltaViews) * 100).toFixed(2) : "0.00";

    // Sum of proportionally distributed total subs across filtered profiles
    const totalEstimatedSubs = Object.values(perProfile).reduce((sum, p) => sum + p.estimatedTotalSubs, 0);

    return {
      totalFollowers, totalViews, totalLikes, totalComments,
      deltaFollowers, deltaViews, deltaLikes, deltaComments,
      totalLinkClicks, totalNewSubs,
      totalInteractions, avgViews, viralityRatio,
      perProfile, profileCount, totalEstimatedSubs,
    };
  }, [snapshotsByDateProfile, conversionsByDateProfile, datesInRange, dateBeforeRange, filteredProfileIds, profileNameMap, ofStats, profiles]);

  // Total New Subs per model (aggregated from proportional per-profile data)
  const ofTotalNewSubsPerModel = useMemo(() => {
    const perModel: Record<string, { name: string; value: number }> = {};
    for (const [pid, pData] of Object.entries(stats.perProfile)) {
      const p = profiles.find((pr: any) => pr.id === pid);
      if (!p?.model_id || pData.estimatedTotalSubs <= 0) continue;
      if (!perModel[p.model_id]) {
        const m = models.find((mm: any) => mm.id === p.model_id);
        perModel[p.model_id] = { name: m?.nickname || m?.name || "unknown", value: 0 };
      }
      perModel[p.model_id].value += pData.estimatedTotalSubs;
    }
    return Object.values(perModel).sort((a, b) => b.value - a.value);
  }, [stats.perProfile, profiles, models]);

  // Donut data
  const donutData = useMemo(() => {
    const entries = Object.entries(stats.perProfile);
    function buildDonut(field: string) {
      return entries
        .map(([id, d]) => ({
          name: d.name,
          value: (d as any)[field] as number,
          color: profileColorMap[d.name] || "#C9A227",
          profileId: id,
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    return {
      followers: buildDonut("followers"),
      views: buildDonut("views"),
      interactions: buildDonut("interactions"),
      linkClicks: buildDonut("linkClicks"),
      newSubs: buildDonut("newSubs"),
    };
  }, [stats.perProfile, profileColorMap]);

  // Bar data
  const barData = useMemo(() => {
    const entries = Object.entries(stats.perProfile);
    function buildBars(field: string) {
      return entries
        .map(([_id, d]) => ({
          name: d.name,
          value: (d as any)[field] as number,
          fill: profileColorMap[d.name] || "#C9A227",
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    const clickRate = entries
      .filter(([_, d]) => d.views > 0 && d.linkClicks > 0)
      .map(([_id, d]) => ({ name: d.name, value: parseFloat(((d.linkClicks / d.views) * 100).toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    const conversionRate = entries
      .filter(([_, d]) => d.linkClicks > 0)
      .map(([_id, d]) => ({ name: d.name, value: parseFloat(((d.newSubs / d.linkClicks) * 100).toFixed(1)) }))
      .sort((a, b) => b.value - a.value);

    const trackedSubsPer100k = entries
      .filter(([_, d]) => d.views > 0 && d.newSubs > 0)
      .map(([_id, d]) => ({ name: d.name, value: Math.round(d.newSubs / (d.views / 100000)) }))
      .sort((a, b) => b.value - a.value);

    const totalSubsPer100k = entries
      .filter(([_, d]) => d.views > 0 && d.estimatedTotalSubs > 0)
      .map(([_id, d]) => ({ name: d.name, value: Math.round(d.estimatedTotalSubs / (d.views / 100000)) }))
      .sort((a, b) => b.value - a.value);

    const followersPer100k = entries
      .filter(([_, d]) => d.views > 0 && d.followers > 0)
      .map(([_id, d]) => ({ name: d.name, value: Math.round(d.followers / (d.views / 100000)) }))
      .sort((a, b) => b.value - a.value);

    return {
      views: buildBars("views"),
      likes: buildBars("likes"),
      comments: buildBars("comments"),
      followers: buildBars("followers"),
      linkClicks: buildBars("linkClicks"),
      newSubs: buildBars("newSubs"),
      estimatedTotalSubs: buildBars("estimatedTotalSubs"),
      clickRate,
      conversionRate,
      trackedSubsPer100k,
      totalSubsPer100k,
      followersPer100k,
    };
  }, [stats.perProfile, profileColorMap]);

  // Group options filtered by selected creators
  const groupOptions = useMemo(() => {
    let opts = groups.map(g => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) {
      opts = opts.filter(g => selectedModels.includes(g.model_id));
    }
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  // Profile options for multi-select
  const profileOptions = useMemo(() => {
    let opts = profiles.map(p => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels !== null && selectedModels.length > 0) {
      const modelFilteredIds = new Set(profiles.filter(p => selectedModels.includes(p.models?.id)).map(p => p.id));
      opts = opts.filter(o => modelFilteredIds.has(o.id));
    }
    if (selectedGroups !== null && selectedGroups.length > 0) {
      const groupFilteredIds = new Set(profiles.filter(p => selectedGroups.includes(p.account_groups?.id)).map(p => p.id));
      opts = opts.filter(o => groupFilteredIds.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  const isMultiDay = dateRange.from !== dateRange.to;

  // CSV Export
  const handleExportCSV = useCallback(() => {
    const entries = Object.entries(stats.perProfile);
    if (entries.length === 0) return;

    const headers = [
      "Profile", "New Followers", "New Views", "New Likes", "New Comments",
      "Interactions", "Link Clicks", "Tracked New Subs", "Est. Total Subs",
      "Views to Click Rate (%)", "Conversion Rate (%)",
      "Total Subs / 100K Views", "Tracked Subs / 100K Views", "Followers / 100K Views",
    ];

    const rows = entries
      .sort((a, b) => (b[1] as any).views - (a[1] as any).views)
      .map(([_, d]: [string, any]) => {
        const clickRate = d.views > 0 && d.linkClicks > 0 ? ((d.linkClicks / d.views) * 100).toFixed(2) : "";
        const convRate = d.linkClicks > 0 ? ((d.newSubs / d.linkClicks) * 100).toFixed(1) : "";
        const totalSubs100k = d.views > 0 && d.estimatedTotalSubs > 0 ? Math.round(d.estimatedTotalSubs / (d.views / 100000)) : "";
        const trackedSubs100k = d.views > 0 && d.newSubs > 0 ? Math.round(d.newSubs / (d.views / 100000)) : "";
        const followers100k = d.views > 0 && d.followers > 0 ? Math.round(d.followers / (d.views / 100000)) : "";
        return [
          d.name, d.followers, d.views, d.likes, d.comments,
          d.interactions, d.linkClicks, d.newSubs, d.estimatedTotalSubs,
          clickRate, convRate, totalSubs100k, trackedSubs100k, followers100k,
        ].join(",");
      });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${dateRange.from}_to_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats.perProfile, dateRange]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Performance overview across all profiles</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <MultiSelect
          label="Creators"
          options={models.map(m => ({ id: m.id, name: m.nickname || m.name }))}
          selected={selectedModels}
          onChange={setSelectedModels}
        />
        <MultiSelect
          label="Groups"
          options={groupOptions}
          selected={selectedGroups}
          onChange={setSelectedGroups}
        />
        <MultiSelect
          label="Profiles"
          options={profileOptions}
          selected={selectedProfiles}
          onChange={setSelectedProfiles}
          searchable
        />
        <MultiSelect
          label="Tags"
          options={tags.map(t => ({ id: t.id, name: t.name }))}
          selected={selectedTags}
          onChange={(ids) => setSelectedTags((ids ?? []) as string[])}
          noneLabel="No Tags"
        />

        {/* Show count selector */}
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white overflow-hidden">
          {SHOW_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setShowCount(opt)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors",
                showCount === opt
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {opt === 0 ? "All" : `Top ${opt}`}
            </button>
          ))}
        </div>

        {/* CSV Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors text-xs font-medium"
          title="Export as CSV"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>

        {/* Date Navigation */}
        <div className="ml-auto flex items-center gap-2">

          <button
            onClick={() => {
              const from = new Date(dateRange.from + "T00:00:00");
              const to = new Date(dateRange.to + "T00:00:00");
              const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const newTo = addDays(dateRange.from, -1);
              const newFrom = addDays(dateRange.from, -days);
              if (newFrom >= minDate) {
                setDateRange({ from: newFrom, to: newTo });
              }
            }}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <DateRangePicker
            range={dateRange}
            onChange={setDateRange}
            minDate={minDate}
            maxDate={maxDate}
          />

          <button
            onClick={() => {
              const from = new Date(dateRange.from + "T00:00:00");
              const to = new Date(dateRange.to + "T00:00:00");
              const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              const newFrom = addDays(dateRange.to, 1);
              const newTo = addDays(dateRange.to, days);
              if (newTo <= maxDate) {
                setDateRange({ from: newFrom, to: newTo });
              }
            }}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row 1 - Derived */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
          <StatCard label="Average Views" value={formatNumber(stats.avgViews)} sub />
          <StatCard label="New Likes" value={formatNumber(stats.deltaLikes)} sub />
          <StatCard label="New Comments" value={formatNumber(stats.deltaComments)} sub />
          <StatCard label="Engagement Rate" value={`${stats.viralityRatio}%`} sub />
        </div>
      </div>

      {/* Stats Row 3 - Conversions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-4 divide-x divide-gray-200">
          <StatCard label="Total New Subs" value={formatNumber(stats.totalEstimatedSubs)} sub />
          <StatCard label="Link Clicks" value={formatNumber(stats.totalLinkClicks)} sub />
          <StatCard label="Conversion Rate (Total)" value={stats.totalLinkClicks > 0 && stats.totalEstimatedSubs > 0 ? `${((stats.totalEstimatedSubs / stats.totalLinkClicks) * 100).toFixed(1)}%` : "—"} sub />
          <StatCard label="Total Subs / 100K Views" value={stats.deltaViews > 0 && stats.totalEstimatedSubs > 0 ? `${Math.round(stats.totalEstimatedSubs / (stats.deltaViews / 100000))}` : "—"} sub />
        </div>
        <div className="grid grid-cols-4 divide-x divide-gray-200 border-t border-gray-200">
          <StatCard label="Tracked New Subs" value={formatNumber(stats.totalNewSubs)} sub />
          <StatCard label="Views to Click Rate" value={stats.deltaViews > 0 ? `${((stats.totalLinkClicks / stats.deltaViews) * 100).toFixed(2)}%` : "—"} sub />
          <StatCard label="Conversion Rate (Tracked)" value={stats.totalLinkClicks > 0 ? `${((stats.totalNewSubs / stats.totalLinkClicks) * 100).toFixed(1)}%` : "—"} sub />
          <StatCard label="Tracked Subs / 100K Views" value={stats.deltaViews > 0 && stats.totalNewSubs > 0 ? `${Math.round(stats.totalNewSubs / (stats.deltaViews / 100000))}` : "—"} sub />
        </div>
      </div>


      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DonutCard title="New Followers" total={formatNumber(stats.deltaFollowers)} data={donutData.followers} />
        <DonutCard title="New Views" total={formatNumber(stats.deltaViews)} data={donutData.views} />
        <DonutCard title="Interactions" total={formatNumber(stats.totalInteractions)} data={donutData.interactions} />
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricBarChart title="Views" data={barData.views} showCount={showCount} />
        <MetricBarChart title="New Followers" data={barData.followers} showCount={showCount} />
        <MetricBarChart title="Likes" data={barData.likes} showCount={showCount} />
        <MetricBarChart title="Comments" data={barData.comments} showCount={showCount} />
      </div>

      {/* Conversion Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Conversions</h2>
        <p className="text-gray-500 text-sm mt-1">Link clicks &amp; subscriber tracking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutCard title="Link Clicks" total={formatNumber(stats.totalLinkClicks)} data={donutData.linkClicks} />
        <DonutCard title="Tracked New Subs" total={formatNumber(stats.totalNewSubs)} data={donutData.newSubs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MetricRankList title="Total New Subs (per Model)" data={ofTotalNewSubsPerModel} showCount={showCount} />
        <MetricRankList title="Est. Total Subs (per Account)" data={barData.estimatedTotalSubs.map(d => ({ name: d.name, value: d.value }))} showCount={showCount} />
        <MetricRankList title="Tracked New Subs" data={barData.newSubs.map(d => ({ name: d.name, value: d.value }))} showCount={showCount} />
        <MetricRankList title="Link Clicks" data={barData.linkClicks.map(d => ({ name: d.name, value: d.value }))} showCount={showCount} />
        <MetricRankList title="Views to Click Rate" data={barData.clickRate} showCount={showCount} suffix="%" />
        <MetricRankList title="Conversion Rate" data={barData.conversionRate} showCount={showCount} suffix="%" />
        <MetricRankList title="Total Subs / 100K Views" data={barData.totalSubsPer100k} showCount={showCount} />
        <MetricRankList title="Tracked Subs / 100K Views" data={barData.trackedSubsPer100k} showCount={showCount} />
        <MetricRankList title="Followers / 100K Views" data={barData.followersPer100k} showCount={showCount} />
      </div>
    </div>
  );
}
