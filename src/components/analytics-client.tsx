"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// 15 gradient definitions — each a clean two-stop gradient in its own color family
const GRADIENT_DEFS = [
  { id: "g0",  from: "#8B6914", to: "#F0D060" }, // gold
  { id: "g1",  from: "#1A3A7A", to: "#60A0E8" }, // sapphire
  { id: "g2",  from: "#5B1A8B", to: "#C070F0" }, // violet
  { id: "g3",  from: "#8B2010", to: "#F07050" }, // coral red
  { id: "g4",  from: "#0F5C3A", to: "#50D090" }, // emerald
  { id: "g5",  from: "#6B2A0F", to: "#F0A060" }, // copper
  { id: "g6",  from: "#0F3A5C", to: "#40B0D8" }, // teal blue
  { id: "g7",  from: "#8B1A4A", to: "#F060A0" }, // rose pink
  { id: "g8",  from: "#1A5C1A", to: "#70D040" }, // lime green
  { id: "g9",  from: "#4A1A8B", to: "#90A0F8" }, // indigo
  { id: "g10", from: "#8B4A00", to: "#F8C060" }, // amber
  { id: "g11", from: "#1A4A5C", to: "#40D0C0" }, // cyan teal
  { id: "g12", from: "#5C1A1A", to: "#D06060" }, // dusty red
  { id: "g13", from: "#2A5C0F", to: "#A0D840" }, // yellow-green
  { id: "g14", from: "#3A1A5C", to: "#A060D0" }, // purple
];

// Flat mid-color for contexts that don't support gradients (donut legend etc.)
const GRADIENT_MIDS = GRADIENT_DEFS.map(g => {
  // Blend from/to at 55% for a nice mid-tone
  const hex = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = hex(g.from);
  const [r2,g2,b2] = hex(g.to);
  const blend = (a: number, b: number) => Math.round(a + (b - a) * 0.55).toString(16).padStart(2,"0");
  return `#${blend(r1,r2)}${blend(g1,g2)}${blend(b1,b2)}`;
});

function gradientId(i: number) { return `brand-grad-${GRADIENT_DEFS[i % GRADIENT_DEFS.length].id}`; }
function gradientFill(i: number) { return `url(#${gradientId(i)})`; }
function gradientMid(i: number) { return GRADIENT_MIDS[i % GRADIENT_MIDS.length]; }

// SVG defs component — must be rendered inside each Recharts chart
function ChartGradientDefs() {
  return (
    <defs>
      {GRADIENT_DEFS.map((g, i) => (
        <linearGradient key={g.id} id={`brand-grad-${g.id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </linearGradient>
      ))}
    </defs>
  );
}

// Keep a simple array for index lookups
const COLORS = GRADIENT_MIDS;

const SHOW_OPTIONS = [15, 30, 50, 0] as const;
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
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  noneLabel,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  noneLabel?: string; // if set: empty selection = "no filter" label, checkboxes NOT all-checked
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

  const noneSelected = selected.length === 0;
  const allSelected = !noneLabel && noneSelected; // "all" mode only for non-noneLabel filters

  const displayText = noneSelected
    ? (noneLabel ? noneLabel : `All ${label}`)
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.name || label
    : `${selected.length} ${label}`;

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
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] max-h-64 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <input
              type="checkbox"
              checked={noneSelected}
              onChange={() => onChange([])}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm font-medium">{noneLabel ? "No Tags" : "Select All"}</span>
          </label>
          {noneLabel && (
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={() => onChange(selected.length === options.length ? [] : options.map(o => o.id))}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm font-medium">Select All</span>
            </label>
          )}
          {options.map(o => (
            <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected || selected.includes(o.id)}
                onChange={() => {
                  if (allSelected) {
                    onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                  } else if (selected.includes(o.id)) {
                    const newSelected = selected.filter(id => id !== o.id);
                    onChange(noneLabel ? newSelected : (newSelected.length === 0 ? [] : newSelected));
                  } else {
                    const newSelected = [...selected, o.id];
                    onChange(noneLabel ? newSelected : (newSelected.length === options.length ? [] : newSelected));
                  }
                }}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm">{o.name}</span>
            </label>
          ))}
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="flex items-start gap-5">
        <div className="w-36 h-36 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartGradientDefs />
              <Pie
                data={data.length > 0 ? data : [{ name: "empty", value: 1, color: "#e5e7eb" }]}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                dataKey="value"
                strokeWidth={2}
                stroke="#fff"
              >
                {(data.length > 0 ? data : [{ color: "#e5e7eb" }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
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
            <ChartGradientDefs />
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
export function AnalyticsClient({ profiles, snapshots, models, groups, tags }: AnalyticsClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCount, setShowCount] = useState(15);

  // Build profile color maps — fill (gradient url) and mid (flat color for legends)
  const profileColorMap = useMemo(() => {
    const fill: Record<string, string> = {};
    const mid: Record<string, string> = {};
    profiles.forEach((p, i) => {
      fill[p.instagram_username] = gradientFill(i);
      mid[p.instagram_username] = gradientMid(i);
    });
    return { fill, mid };
  }, [profiles]);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (selectedModels.length > 0 && !selectedModels.includes(p.models?.id)) return false;
      if (selectedGroups.length > 0 && !selectedGroups.includes(p.account_groups?.id)) return false;
      if (selectedProfiles.length > 0 && !selectedProfiles.includes(p.id)) return false;
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

  // Group snapshots by date and profile
  const snapshotsByDateProfile = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    for (const s of snapshots) {
      const date = s.scraped_at.split("T")[0];
      if (!map[date]) map[date] = {};
      map[date][s.profile_id] = s;
    }
    return map;
  }, [snapshots]);

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
    }> = {};

    let totalFollowers = 0, totalViews = 0, totalLikes = 0, totalComments = 0;
    let deltaFollowers = 0, deltaViews = 0, deltaLikes = 0, deltaComments = 0;
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

    // Calculate deltas: sum daily changes across the range
    const allDatesForDelta = [...datesInRange];
    for (let i = 0; i < allDatesForDelta.length; i++) {
      const date = allDatesForDelta[i];
      const prevDate = i === 0 ? dateBeforeRange : allDatesForDelta[i - 1];
      const todaySnaps = snapshotsByDateProfile[date] || {};
      const prevSnaps = prevDate ? (snapshotsByDateProfile[prevDate] || {}) : {};

      for (const profileId of Array.from(filteredProfileIds)) {
        const today = todaySnaps[profileId];
        if (!today) continue;
        const prev = prevSnaps[profileId];
        const name = profileNameMap[profileId] || "unknown";

        const dF = prev ? Math.max(0, (today.followers || 0) - (prev.followers || 0)) : (i === 0 && !dateBeforeRange ? (today.followers || 0) : 0);
        const dV = prev ? Math.max(0, (today.total_reel_views || 0) - (prev.total_reel_views || 0)) : (i === 0 && !dateBeforeRange ? (today.total_reel_views || 0) : 0);
        const dL = prev ? Math.max(0, (today.total_reel_likes || 0) - (prev.total_reel_likes || 0)) : (i === 0 && !dateBeforeRange ? (today.total_reel_likes || 0) : 0);
        const dC = prev ? Math.max(0, (today.total_reel_comments || 0) - (prev.total_reel_comments || 0)) : (i === 0 && !dateBeforeRange ? (today.total_reel_comments || 0) : 0);

        deltaFollowers += dF;
        deltaViews += dV;
        deltaLikes += dL;
        deltaComments += dC;

        if (!perProfile[profileId]) {
          perProfile[profileId] = { name, followers: 0, views: 0, likes: 0, comments: 0, interactions: 0 };
        }
        perProfile[profileId].followers += dF;
        perProfile[profileId].views += dV;
        perProfile[profileId].likes += dL;
        perProfile[profileId].comments += dC;
        perProfile[profileId].interactions += dL + dC;
      }
    }

    const totalInteractions = deltaLikes + deltaComments;
    const totalPosts = Array.from(filteredProfileIds).reduce((sum, pid) => {
      const snap = lastDaySnaps[pid];
      return sum + (snap?.media_count || 0);
    }, 0);
    const avgViews = profileCount > 0 && totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
    const viralityRatio = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(2) : "0.00";

    return {
      totalFollowers, totalViews, totalLikes, totalComments,
      deltaFollowers, deltaViews, deltaLikes, deltaComments,
      totalInteractions, avgViews, viralityRatio,
      perProfile, profileCount,
    };
  }, [snapshotsByDateProfile, datesInRange, dateBeforeRange, filteredProfileIds, profileNameMap]);

  // Donut data
  const donutData = useMemo(() => {
    const entries = Object.entries(stats.perProfile);
    function buildDonut(field: string) {
      return entries
        .map(([id, d]) => ({
          name: d.name,
          value: (d as any)[field] as number,
          color: profileColorMap.mid[d.name] || "#C9A227",
          profileId: id,
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    return {
      followers: buildDonut("followers"),
      views: buildDonut("views"),
      interactions: buildDonut("interactions"),
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
          fill: profileColorMap.fill[d.name] || "url(#brand-grad-g0)",
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    return {
      views: buildBars("views"),
      likes: buildBars("likes"),
      comments: buildBars("comments"),
      followers: buildBars("followers"),
    };
  }, [stats.perProfile, profileColorMap]);

  // Group options filtered by selected creators
  const groupOptions = useMemo(() => {
    let opts = groups.map(g => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels.length > 0) {
      opts = opts.filter(g => selectedModels.includes(g.model_id));
    }
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  // Profile options for multi-select
  const profileOptions = useMemo(() => {
    let opts = profiles.map(p => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels.length > 0) {
      const modelFilteredIds = new Set(profiles.filter(p => selectedModels.includes(p.models?.id)).map(p => p.id));
      opts = opts.filter(o => modelFilteredIds.has(o.id));
    }
    if (selectedGroups.length > 0) {
      const groupFilteredIds = new Set(profiles.filter(p => selectedGroups.includes(p.account_groups?.id)).map(p => p.id));
      opts = opts.filter(o => groupFilteredIds.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  const isMultiDay = dateRange.from !== dateRange.to;

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
          options={models.map(m => ({ id: m.id, name: m.name }))}
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
        />
        <MultiSelect
          label="Tags"
          options={tags.map(t => ({ id: t.id, name: t.name }))}
          selected={selectedTags}
          onChange={setSelectedTags}
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
                  ? "bg-gold-gradient text-white"
                  : "text-gray-500 hover:bg-gray-50"
              )}
            >
              {opt === 0 ? "All" : `Top ${opt}`}
            </button>
          ))}
        </div>

        {/* Date Range Picker */}
        <div className="ml-auto">
          <DateRangePicker
            range={dateRange}
            onChange={setDateRange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      </div>

      {/* Stats Row 1 - Totals */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
          <StatCard label="Followers" value={formatNumber(stats.totalFollowers)} />
          <StatCard label="Views" value={formatNumber(stats.totalViews)} />
          <StatCard label="Likes" value={formatNumber(stats.totalLikes)} />
          <StatCard label="Comments" value={formatNumber(stats.totalComments)} />
        </div>
      </div>

      {/* Stats Row 2 - Deltas / Derived */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-200">
          <StatCard label="New Followers" value={formatNumber(stats.deltaFollowers)} sub />
          <StatCard label="Average Views" value={formatNumber(stats.avgViews)} sub />
          <StatCard label="Total Interactions" value={formatNumber(stats.totalInteractions)} sub />
          <StatCard label="Virality Ratio" value={`${stats.viralityRatio}%`} sub />
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
        <MetricBarChart title="Likes" data={barData.likes} showCount={showCount} />
        <MetricBarChart title="Comments" data={barData.comments} showCount={showCount} />
        <MetricBarChart title="New Followers" data={barData.followers} showCount={showCount} />
      </div>
    </div>
  );
}
