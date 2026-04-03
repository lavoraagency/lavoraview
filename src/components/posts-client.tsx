"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Heart, MessageCircle, Share2, ChevronDown, ChevronLeft, ChevronRight, Filter, Flame, X, Calendar } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const REELS_PER_PAGE = 12;
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type SortOption = "most_viewed" | "least_viewed" | "most_liked" | "least_liked" | "newest" | "oldest";
type DatePreset = "yesterday" | "week" | "7days" | "14days" | "month" | "30days" | "90days" | "all" | "custom";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most_viewed", label: "Most Viewed" },
  { value: "least_viewed", label: "Least Viewed" },
  { value: "most_liked", label: "Most Liked" },
  { value: "least_liked", label: "Least Liked" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Current Week" },
  { value: "7days", label: "Last 7 Days" },
  { value: "14days", label: "Last 14 Days" },
  { value: "month", label: "Current Month" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
  { value: "all", label: "All" },
];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const today = toLocalDateStr(now);
  switch (preset) {
    case "all":
      return { from: "2020-01-01", to: today };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const ys = toLocalDateStr(y);
      return { from: ys, to: ys };
    }
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now); mon.setDate(mon.getDate() - diff);
      return { from: toLocalDateStr(mon), to: today };
    }
    case "7days": {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: toLocalDateStr(d), to: today };
    }
    case "14days": {
      const d = new Date(now); d.setDate(d.getDate() - 13);
      return { from: toLocalDateStr(d), to: today };
    }
    case "month":
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: today };
    case "30days": {
      const d = new Date(now); d.setDate(d.getDate() - 29);
      return { from: toLocalDateStr(d), to: today };
    }
    case "90days": {
      const d = new Date(now); d.setDate(d.getDate() - 89);
      return { from: toLocalDateStr(d), to: today };
    }
    default:
      return { from: today, to: today };
  }
}

function niceMaxValue(maxViews: number): number {
  if (maxViews <= 0) return 1000;
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxViews)));
  const normalized = maxViews / magnitude;
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  for (const step of steps) {
    if (normalized <= step) return step * magnitude;
  }
  return 10 * magnitude;
}

function formatPostDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) + ", " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

// ── Mini Calendar for Filter Panel ──────────────────────────────
function FilterCalendar({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(to + "T00:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectingEnd, setSelectingEnd] = useState(false);

  const daysInMonth = new Date(viewDate.year, viewDate.month + 1, 0).getDate();
  const firstDow = (new Date(viewDate.year, viewDate.month, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dayStr(day: number) {
    return `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function handleClick(day: number) {
    const ds = dayStr(day);
    if (!selectingEnd) {
      onChange(ds, ds);
      setSelectingEnd(true);
    } else {
      if (ds < from) {
        onChange(ds, from);
      } else {
        onChange(from, ds);
      }
      setSelectingEnd(false);
    }
  }

  function prevMonth() {
    setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{MONTH_NAMES[viewDate.month]} {viewDate.year}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {WEEKDAYS.map(d => <div key={d} className="text-gray-400 font-medium py-1">{d}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />;
          const ds = dayStr(day);
          const isFrom = ds === from;
          const isTo = ds === to;
          const inRange = ds >= from && ds <= to;
          return (
            <button
              key={day}
              onClick={() => handleClick(day)}
              className={cn(
                "py-1 rounded text-sm transition-colors",
                isFrom || isTo ? "bg-gray-900 text-white font-bold" :
                inRange ? "bg-gray-200 text-gray-800" :
                "hover:bg-gray-100 text-gray-700"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 text-center mt-2">
        {formatDateShort(from)} – {formatDateShort(to)}
      </div>
    </div>
  );
}

// ── Dual Range Slider ───────────────────────────────────────────
function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  const left = max > min ? ((valueMin - min) / (max - min)) * 100 : 0;
  const right = max > min ? ((valueMax - min) / (max - min)) * 100 : 100;

  const getValueFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return min;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    // Snap to steps for smoother UX
    const step = max > 10000 ? 1000 : max > 1000 ? 100 : 10;
    return Math.round((min + pct * (max - min)) / step) * step;
  }, [min, max]);

  const handleMouseDown = useCallback((thumb: "min" | "max") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = thumb;

    const onMove = (ev: MouseEvent) => {
      const v = getValueFromEvent(ev);
      if (dragging.current === "min") {
        onChange(Math.min(v, valueMax), valueMax);
      } else {
        onChange(valueMin, Math.max(v, valueMin));
      }
    };

    const onUp = () => {
      dragging.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [getValueFromEvent, onChange, valueMin, valueMax]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const v = getValueFromEvent(e);
    // Move whichever thumb is closer
    const distMin = Math.abs(v - valueMin);
    const distMax = Math.abs(v - valueMax);
    if (distMin <= distMax) {
      onChange(Math.min(v, valueMax), valueMax);
    } else {
      onChange(valueMin, Math.max(v, valueMin));
    }
  }, [getValueFromEvent, onChange, valueMin, valueMax]);

  return (
    <div className="pt-4 pb-1">
      <div
        ref={trackRef}
        className="relative h-1.5 bg-gray-200 rounded-full cursor-pointer"
        onClick={handleTrackClick}
      >
        <div
          className="absolute h-full bg-gray-900 rounded-full pointer-events-none"
          style={{ left: `${left}%`, width: `${right - left}%` }}
        />
        {/* Min thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full cursor-grab active:cursor-grabbing"
          style={{ left: `${left}%`, marginLeft: "-10px", zIndex: 30 }}
          onMouseDown={handleMouseDown("min")}
        />
        {/* Max thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-gray-900 rounded-full cursor-grab active:cursor-grabbing"
          style={{ left: `${right}%`, marginLeft: "-10px", zIndex: 30 }}
          onMouseDown={handleMouseDown("max")}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-3">
        <span>{formatNumber(min)}</span>
        <span>{formatNumber(valueMin)} – {formatNumber(valueMax)}</span>
        <span>{formatNumber(max)}</span>
      </div>
    </div>
  );
}

// ── MultiSelect ─────────────────────────────────────────────────
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
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
    if (!open) setSearch("");
  }, [open, searchable]);

  const isAll = noneLabel ? (selected as string[]).length === 0 : selected === null;
  const sel = selected ?? [];

  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayText = isAll
    ? (noneLabel ? noneLabel : `All ${label}`)
    : sel.length === 1
    ? options.find(o => o.id === sel[0])?.name || label
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
                      if (noneLabel) onChange(isAll ? options.map(o => o.id) : []);
                      else onChange(isAll ? [] : null);
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
                      onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                    } else if (sel.includes(o.id)) {
                      const next = sel.filter(id => id !== o.id);
                      onChange(noneLabel ? next : (next.length === 0 ? [] : next));
                    } else {
                      const next = [...sel, o.id];
                      if (!noneLabel && next.length === options.length) onChange(null);
                      else onChange(next);
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

// ── Main Component ──────────────────────────────────────────────
interface PostsClientProps {
  reels: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  tags: any[];
}

export function PostsClient({ reels, models, groups, profiles, tags }: PostsClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("most_viewed");
  const [datePreset, setDatePreset] = useState<DatePreset>("7days");
  const [dateFrom, setDateFrom] = useState(() => getPresetRange("7days").from);
  const [dateTo, setDateTo] = useState(() => getPresetRange("7days").to);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewsRangeEnabled, setViewsRangeEnabled] = useState(false);
  const [viewsMin, setViewsMin] = useState(0);
  const [viewsMax, setViewsMax] = useState(100000);

  // Group options filtered by selected models
  const groupOptions = useMemo(() => {
    let opts = groups.map(g => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) {
      opts = opts.filter(g => selectedModels.includes(g.model_id));
    }
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  // Profile options filtered by selected models/groups
  const profileOptions = useMemo(() => {
    let opts = profiles.map(p => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels !== null && selectedModels.length > 0) {
      const ids = new Set(profiles.filter(p => selectedModels.includes(p.model_id)).map(p => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    if (selectedGroups !== null && selectedGroups.length > 0) {
      const ids = new Set(profiles.filter(p => selectedGroups.includes(p.account_group_id)).map(p => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  // Pre-filter by profile selections (without date/views/sort)
  const profileFiltered = useMemo(() => {
    return reels.filter(r => {
      const profile = r.profiles as any;
      if (!profile) return false;
      if (selectedModels !== null && !selectedModels.includes(profile.models?.id)) return false;
      if (selectedGroups !== null && !selectedGroups.includes(profile.account_groups?.id)) return false;
      if (selectedProfiles !== null && !selectedProfiles.includes(profile.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = profile.tags || [];
        const tagNames = tags.filter(t => selectedTags.includes(t.id)).map(t => t.name);
        if (!tagNames.some((tn: string) => profileTags.includes(tn))) return false;
      }
      return true;
    });
  }, [reels, selectedModels, selectedGroups, selectedProfiles, selectedTags, tags]);

  // Compute max views for the slider (based on profile-filtered, before date/views filter)
  const computedMaxViews = useMemo(() => {
    const max = profileFiltered.reduce((m, r) => Math.max(m, r.current_views || 0), 0);
    return niceMaxValue(max);
  }, [profileFiltered]);

  // Reset views range when max changes
  useEffect(() => {
    setViewsMax(computedMaxViews);
    setViewsMin(0);
  }, [computedMaxViews]);

  // Full filter + sort
  const filtered = useMemo(() => {
    let result = profileFiltered.filter(r => {
      // Date filter (skip when "all")
      if (datePreset !== "all") {
        if (r.posted_at) {
          const postDate = r.posted_at.split("T")[0];
          if (postDate < dateFrom || postDate > dateTo) return false;
        } else {
          return false;
        }
      }
      // Views range filter
      if (viewsRangeEnabled) {
        const views = r.current_views || 0;
        if (views < viewsMin || views > viewsMax) return false;
      }
      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "most_viewed": return (b.current_views || 0) - (a.current_views || 0);
        case "least_viewed": return (a.current_views || 0) - (b.current_views || 0);
        case "most_liked": return (b.current_likes || 0) - (a.current_likes || 0);
        case "least_liked": return (a.current_likes || 0) - (b.current_likes || 0);
        case "newest": return new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime();
        case "oldest": return new Date(a.posted_at || 0).getTime() - new Date(b.posted_at || 0).getTime();
        default: return 0;
      }
    });

    return result;
  }, [profileFiltered, datePreset, dateFrom, dateTo, viewsRangeEnabled, viewsMin, viewsMax, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REELS_PER_PAGE));
  const paged = filtered.slice(page * REELS_PER_PAGE, (page + 1) * REELS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedModels, selectedGroups, selectedProfiles, selectedTags, dateFrom, dateTo, viewsRangeEnabled, viewsMin, viewsMax, sortBy]);

  // Pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("...");
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
      if (page < totalPages - 3) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  }, [page, totalPages]);

  function handlePreset(preset: DatePreset) {
    setDatePreset(preset);
    const range = getPresetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
    setShowCalendar(false);
  }

  const activePresetLabel = DATE_PRESETS.find(p => p.value === datePreset)?.label || "Custom";

  return (
    <div className="p-6 space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MultiSelect
          label="Creators"
          options={models.map(m => ({ id: m.id, name: m.nickname || m.name }))}
          selected={selectedModels}
          onChange={v => { setSelectedModels(v); setSelectedGroups(null); setSelectedProfiles(null); }}
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

        <div className="ml-auto">
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors text-gray-600"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {paged.map(r => {
          const profile = r.profiles as any;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full">
              {/* Thumbnail */}
              <div className="relative aspect-[3/4] bg-gray-100">
                {r.thumbnail_url ? (
                  <img
                    src={r.thumbnail_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-2xl">▶</div>
                )}
                {r.is_viral_tracked && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1">
                    <Flame className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="px-2 pt-2 pb-1 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-gray-400" />
                    {r.last_daily_views > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                        +{formatNumber(r.last_daily_views)}
                      </span>
                    )}
                    <span className="font-medium">{formatNumber(r.current_views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_likes)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_comments)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_shares)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-2 pb-2 pt-0.5 border-t border-gray-100 mt-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Link
                    href={`/dashboard/profiles/${profile?.id}`}
                    className="text-[11px] font-medium text-gray-700 hover:text-brand-600 truncate"
                  >
                    @{profile?.instagram_username}
                  </Link>
                  <a
                    href={r.reel_url || `https://www.instagram.com/reel/${r.shortcode}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-brand-500 flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {formatPostDate(r.posted_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No reels found
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-2 py-1.5 text-sm text-gray-400">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={cn(
                  "px-3 py-1.5 text-sm border rounded-lg transition-colors",
                  page === p
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                )}
              >
                {(p as number) + 1}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="text-center text-xs text-gray-400">
          Page {page + 1}/{totalPages} · {filtered.length} reels total
        </div>
      )}

      {/* ── Filter Sidebar ──────────────────────────────────────── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setFilterOpen(false)} />
          <div className="relative w-[340px] bg-white h-full shadow-xl overflow-y-auto">
            <div className="p-5 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Post Options</h2>
                  <p className="text-xs text-gray-500">Filter posts by criteria.</p>
                </div>
                <button onClick={() => setFilterOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <hr className="border-gray-200" />

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Upload Date */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Upload Date</label>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {activePresetLabel}
                  </button>
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  {DATE_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => handlePreset(p.value)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                        datePreset === p.value
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Calendar */}
                {showCalendar && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <FilterCalendar
                      from={dateFrom}
                      to={dateTo}
                      onChange={(f, t) => {
                        setDateFrom(f);
                        setDateTo(t);
                        setDatePreset("custom");
                      }}
                    />
                  </div>
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Views Range */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Views Range</label>
                  <button
                    onClick={() => setViewsRangeEnabled(!viewsRangeEnabled)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors",
                      viewsRangeEnabled ? "bg-gray-900" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      viewsRangeEnabled ? "translate-x-5" : "translate-x-0.5"
                    )} />
                  </button>
                </div>

                {viewsRangeEnabled && (
                  <DualRangeSlider
                    min={0}
                    max={computedMaxViews}
                    valueMin={viewsMin}
                    valueMax={viewsMax}
                    onChange={(min, max) => { setViewsMin(min); setViewsMax(max); }}
                  />
                )}
              </div>

              <hr className="border-gray-200" />

              {/* Apply Button */}
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
