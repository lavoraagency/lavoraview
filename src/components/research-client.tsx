"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, Heart, Flame, Plus, X, Pause, Play, Trash2, Users, AlertCircle, Calendar, ChevronDown, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ResearchProfile {
  id: string;
  instagram_username: string;
  display_name: string | null;
  followers: number | null;
  profile_pic_url: string | null;
  is_active: boolean;
  last_scraped_at: string | null;
  last_scrape_error: string | null;
  created_at: string;
}

interface TopReelSnapshot {
  id: string;
  research_reel_id: string;
  scraped_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  views_delta: number;
  avg_views: number;
  multiplier: number;
  is_top: boolean;
  research_reels: {
    id: string;
    instagram_reel_id: string;
    shortcode: string | null;
    caption: string | null;
    thumbnail_url: string | null;
    reel_url: string | null;
    video_cdn_url: string | null;
    video_storage_url: string | null;
    video_deleted_at: string | null;
    posted_at: string | null;
    is_pinned: boolean | null;
    research_profile_id: string;
    research_profiles: {
      id: string;
      instagram_username: string;
      display_name: string | null;
      profile_pic_url: string | null;
    } | null;
  } | null;
}

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

export function ResearchClient({
  profiles,
  topReels,
  date,
}: {
  profiles: ResearchProfile[];
  topReels: TopReelSnapshot[];
  date: string;
}) {
  const router = useRouter();
  const [managerOpen, setManagerOpen] = useState(false);

  const activeCount = profiles.filter(p => p.is_active).length;
  // Max selectable date = yesterday (scraping is done for yesterday's data)
  const maxDate = addDays(toLocalDateStr(new Date()), -1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Research</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top reels from tracked external creators (≥3× multiplier)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            value={date}
            maxDate={maxDate}
            onChange={(d) => router.push(`/dashboard/research?date=${d}`)}
          />
          <button
            onClick={() => setManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          >
            <Users className="w-4 h-4" />
            Manage Profiles
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-semibold">{activeCount}</span>
          </button>
        </div>
      </div>

      {/* Top Reels Grid */}
      {topReels.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No top reels for {formatDisplayDate(date)}</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {profiles.length === 0
              ? "Add a profile first — n8n will scrape their reels every night."
              : activeCount === 0
              ? "All profiles are paused. Activate one in the profile manager."
              : "The scraper runs daily at 00:30 London. No top reels yet for this date."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {topReels.map(snap => (
            <ReelCard key={snap.id} snap={snap} />
          ))}
        </div>
      )}

      {managerOpen && (
        <ProfileManagerDrawer
          profiles={profiles}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </div>
  );
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Single-Day Date Picker (matches Top Reels style) ──
function DatePicker({
  value,
  onChange,
  maxDate,
}: {
  value: string;
  onChange: (date: string) => void;
  maxDate: string;
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
  }, [open, value]);

  function handleDayClick(dateStr: string) {
    if (dateStr > maxDate) return;
    onChange(dateStr);
    setOpen(false);
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

  function prevMonth() {
    setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  }
  function nextMonth() {
    setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  }

  const presets = useMemo(() => {
    const todayStr = toLocalDateStr(new Date());
    return [
      { label: "Yesterday", date: addDays(todayStr, -1) },
      { label: "2 Days Ago", date: addDays(todayStr, -2) },
      { label: "3 Days Ago", date: addDays(todayStr, -3) },
      { label: "1 Week Ago", date: addDays(todayStr, -7) },
    ];
  }, []);

  const displayText = useMemo(() => {
    for (const p of presets) {
      if (value === p.date) return p.label;
    }
    const d = new Date(value + "T00:00:00");
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  }, [value, presets]);

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
          <div className="border-r border-gray-100 py-2 w-36">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => handleDayClick(p.date)}
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
                const disabled = dateStr > maxDate;
                const isSelected = dateStr === value;
                return (
                  <button
                    key={i}
                    disabled={disabled}
                    onClick={() => handleDayClick(dateStr)}
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

// ── Reel Card ──
function ReelCard({ snap }: { snap: TopReelSnapshot }) {
  const reel = snap.research_reels;
  if (!reel) return null;
  const profile = reel.research_profiles;
  const videoAvailable = reel.video_storage_url && !reel.video_deleted_at;
  const videoUrl = reel.video_storage_url || reel.reel_url || "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
      <div className="relative aspect-[9/16] bg-gray-100">
        {reel.thumbnail_url ? (
          <img src={reel.thumbnail_url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Flame className="w-8 h-8" />
          </div>
        )}
        {/* Multiplier badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-sm">
          <Flame className="w-3 h-3" />
          {snap.multiplier.toFixed(1)}×
        </div>
        {/* Pinned badge */}
        {reel.is_pinned && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm" title="Pinned on profile">
            <Pin className="w-3 h-3 fill-current" />
            Pinned
          </div>
        )}
        {/* Video link */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
            title={videoAvailable ? "Play video" : "Open on Instagram"}
          >
            <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-3 transition-opacity">
              <Play className="w-5 h-5 text-gray-900 fill-current" />
            </div>
          </a>
        )}
        {/* Deleted video overlay */}
        {reel.video_deleted_at && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-gray-800/80 text-white rounded text-xs">
            Video deleted
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Profile */}
        {profile && (
          <div className="flex items-center gap-2">
            {profile.profile_pic_url ? (
              <img src={profile.profile_pic_url} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200" />
            )}
            <span className="text-xs font-medium text-gray-900 truncate">
              @{profile.instagram_username}
            </span>
          </div>
        )}
        {/* Caption */}
        {reel.caption && (
          <p className="text-xs text-gray-600 line-clamp-2">{reel.caption}</p>
        )}
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-600 pt-1">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(snap.views)}</span>
          <span className="flex items-center gap-1 text-orange-600 font-semibold">
            +{formatNumber(snap.views_delta)}
          </span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(snap.likes)}</span>
          {reel.reel_url && (
            <a
              href={reel.reel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-gray-400 hover:text-gray-700"
              title="Open on Instagram"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Manager Drawer ──
function ProfileManagerDrawer({
  profiles,
  onClose,
}: {
  profiles: ResearchProfile[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/research/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Error");
        setAdding(false);
        return;
      }
      setNewUsername("");
      setAdding(false);
      router.refresh();
    } catch (err: any) {
      setAddError(err.message || "Error");
      setAdding(false);
    }
  }

  async function togglePause(p: ResearchProfile) {
    setBusyId(p.id);
    try {
      await fetch(`/api/research/profiles/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProfile(p: ResearchProfile) {
    if (!confirm(`Really delete @${p.instagram_username}? All their reels and snapshots will be removed too.`)) return;
    setBusyId(p.id);
    try {
      await fetch(`/api/research/profiles/${p.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Manage Profiles</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-1">Add a new profile</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="@username or instagram.com/username"
              disabled={adding}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={adding || !newUsername.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {adding ? "..." : "Add"}
            </button>
          </div>
          {addError && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {addError}
            </div>
          )}
        </form>

        {/* Profile list */}
        <div className="flex-1 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No profiles yet. Add one above.
            </div>
          ) : (
            <ul className="divide-y">
              {profiles.map(p => (
                <li key={p.id} className="p-4 flex items-center gap-3">
                  {p.profile_pic_url ? (
                    <img src={p.profile_pic_url} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                      @
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">@{p.instagram_username}</span>
                      {!p.is_active && (
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">paused</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.followers ? `${formatNumber(p.followers)} followers` : "Not yet scraped"}
                      {p.last_scraped_at && ` • ${new Date(p.last_scraped_at).toLocaleDateString("en-US")}`}
                    </div>
                    {p.last_scrape_error && (
                      <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.last_scrape_error}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePause(p)}
                      disabled={busyId === p.id}
                      title={p.is_active ? "Pause" : "Activate"}
                      className={cn(
                        "p-2 rounded-lg transition-colors disabled:opacity-50",
                        p.is_active
                          ? "text-gray-600 hover:bg-gray-100"
                          : "text-green-600 hover:bg-green-50"
                      )}
                    >
                      {p.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteProfile(p)}
                      disabled={busyId === p.id}
                      title="Delete"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
