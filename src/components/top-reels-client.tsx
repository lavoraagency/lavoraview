"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Heart, MessageCircle, Share2, ChevronDown, ChevronLeft, ChevronRight, Filter, Flame, X, Calendar, BarChart2, AlignLeft, Clock, TrendingUp, Play } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getReelSnapshots, getTopReelsForDate } from "@/app/dashboard/top-reels/actions";

const REELS_PER_PAGE = 12;
const MIN_MULTIPLIER = 2.0;
type SortOption = "best_performing" | "least_performing" | "most_daily_views" | "most_viewed" | "newest" | "oldest";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best_performing", label: "Best Performing (Multiplier)" },
  { value: "least_performing", label: "Worst Performing (Multiplier)" },
  { value: "most_daily_views", label: "Most Views Yesterday" },
  { value: "most_viewed", label: "Most Viewed (Total)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
];


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

function formatPostDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) + ", " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

// ── Single-Day Date Picker (matches Analytics DateRangePicker style) ──
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
  }, [open]);

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

  const today = toLocalDateStr(new Date());
  const presets = useMemo(() => {
    const t = new Date();
    const todayStr = toLocalDateStr(t);
    const yesterdayStr = addDays(todayStr, -1);
    return [
      { label: "Yesterday", date: yesterdayStr },
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

// ── Performance Tier Helper ────────────────────────────────────
function getPerformanceTier(multiplier: number): { label: string; bgColor: string; textColor: string; flames: number } {
  if (multiplier >= 3) return { label: "Viral", bgColor: "bg-red-500", textColor: "text-red-600", flames: 3 };
  if (multiplier >= 2) return { label: "Strong", bgColor: "bg-orange-500", textColor: "text-orange-600", flames: 2 };
  if (multiplier >= 1.5) return { label: "Good", bgColor: "bg-amber-500", textColor: "text-amber-600", flames: 1 };
  return { label: "", bgColor: "bg-gray-400", textColor: "text-gray-500", flames: 0 };
}

function getDaysSincePosted(postedAt: string | null): number {
  if (!postedAt) return 0;
  const posted = new Date(postedAt);
  const now = new Date();
  return Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Post Insights Modal ─────────────────────────────────────────
// ── AI Analysis Section ─────────────────────────────────────────
function AnalysisRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm text-gray-500 flex-shrink-0 w-24">{label}</span>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

function AnalysisBadge({ text, color }: { text: string; color?: string }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded inline-block", color || "bg-gray-100 text-gray-700")}>{text}</span>
  );
}

function AIAnalysisSection({ analysis: a }: { analysis: any }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Pattern Analysis</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="space-y-2">
        {a.video_length_seconds > 0 && (
          <AnalysisRow label="Length"><span className="font-semibold">{a.video_length_seconds}s</span></AnalysisRow>
        )}

        {a.sound_music && (
          <AnalysisRow label="Music">
            {a.sound_music.has_music ? (
              <span>
                <AnalysisBadge text={a.sound_music.genre || "?"} /> <AnalysisBadge text={a.sound_music.volume || "?"} />
                {a.sound_music.description && <p className="text-xs text-gray-500 mt-0.5">{a.sound_music.description}</p>}
              </span>
            ) : <span className="text-gray-400">Keine Musik</span>}
          </AnalysisRow>
        )}

        {a.sound_speaking && (
          <AnalysisRow label="Speaking">
            {a.sound_speaking.has_speaking ? (
              <span>
                <AnalysisBadge text={a.sound_speaking.speaking_purpose || "?"} color="bg-blue-50 text-blue-700" />
                {a.sound_speaking.summary && <p className="text-xs text-gray-600 mt-0.5">{a.sound_speaking.summary}</p>}
              </span>
            ) : <span className="text-gray-400">Kein Speaking</span>}
          </AnalysisRow>
        )}

        {a.text_overlay && (
          <AnalysisRow label="Text">
            {a.text_overlay.has_text ? (
              <span>
                <AnalysisBadge text={a.text_overlay.text_type || "?"} />
                {a.text_overlay.text_matches_video === false && <> <AnalysisBadge text="passt nicht zum Video" color="bg-amber-50 text-amber-700" /></>}
                {a.text_overlay.text_content && <p className="text-xs text-gray-600 mt-0.5 italic">&ldquo;{a.text_overlay.text_content}&rdquo;</p>}
                {a.text_overlay.text_purpose && <p className="text-xs text-gray-500 mt-0.5">{a.text_overlay.text_purpose}</p>}
              </span>
            ) : <span className="text-gray-400">Kein Text-Overlay</span>}
          </AnalysisRow>
        )}

        {a.background_location && (
          <AnalysisRow label="Location">{a.background_location}</AnalysisRow>
        )}

        {a.outfit && (
          <AnalysisRow label="Outfit">{a.outfit}</AnalysisRow>
        )}

        {a.acting && (
          <AnalysisRow label="Acting">{a.acting}</AnalysisRow>
        )}

        {a.camera_setup && (
          <AnalysisRow label="Camera">{a.camera_setup}</AnalysisRow>
        )}

        {a.scroll_stopper && (
          <AnalysisRow label="Scroll Stop">
            {a.scroll_stopper.has_scroll_stopper ? (
              <span>
                <AnalysisBadge text="Ja" color="bg-green-50 text-green-700" />
                {a.scroll_stopper.description && <p className="text-xs text-gray-600 mt-0.5">{a.scroll_stopper.description}</p>}
              </span>
            ) : <AnalysisBadge text="Nein" color="bg-gray-50 text-gray-500" />}
          </AnalysisRow>
        )}

        {a.reward_ending && (
          <AnalysisRow label="Reward End">
            {a.reward_ending.has_reward ? (
              <span>
                <AnalysisBadge text="Ja" color="bg-green-50 text-green-700" />
                {a.reward_ending.description && <p className="text-xs text-gray-600 mt-0.5">{a.reward_ending.description}</p>}
              </span>
            ) : <AnalysisBadge text="Nein" color="bg-gray-50 text-gray-500" />}
          </AnalysisRow>
        )}

        {a.caption_type && (
          <AnalysisRow label="Caption">
            <AnalysisBadge text={a.caption_type.type || "?"} />
            {a.caption_type.purpose && <p className="text-xs text-gray-500 mt-0.5">{a.caption_type.purpose}</p>}
          </AnalysisRow>
        )}

        {a.other_notable && (
          <AnalysisRow label="Sonstiges"><span className="text-xs text-gray-600">{a.other_notable}</span></AnalysisRow>
        )}
      </div>
    </div>
  );
}

function PostInsightsModal({ reel, profile, onClose }: { reel: any; profile: any; onClose: () => void }) {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReelSnapshots(reel.id).then((data) => {
      setSnapshots(data || []);
      setLoading(false);
    });
  }, [reel.id]);

  const chartData = snapshots.map(s => ({
    date: new Date(s.scraped_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }),
    views: s.views,
    newViews: s.views_delta || 0,
  }));

  const lastSnapshot = snapshots[snapshots.length - 1];
  const reelUrl = reel.reel_url || `https://www.instagram.com/reel/${reel.shortcode}/`;
  const igProfileUrl = `https://www.instagram.com/${profile?.instagram_username}/`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Post Insights</h2>
            <p className="text-sm text-gray-400 mt-0.5">Detailed insights and analytics.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Performance */}
          {reel.multiplier > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Performance</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <span>Multiplier</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-bold", getPerformanceTier(reel.multiplier).textColor)}>
                    {reel.multiplier.toFixed(1)}x
                  </span>
                  <span className="text-xs text-gray-400">
                    vs Ø {reel.avgLevel === "group" ? "Group" : reel.avgLevel === "creator" ? "Creator" : "Account"} {formatNumber(reel.avgViews)} Views
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {reel.video_analysis && !reel.video_analysis.parse_error && (
            <AIAnalysisSection analysis={reel.video_analysis} />
          )}

          {/* Interaction */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Interaction</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <span>Views</span>
                </div>
                <div className="flex items-center gap-2">
                  {reel.last_daily_views > 0 && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      +{formatNumber(reel.last_daily_views)}
                    </span>
                  )}
                  <span className="font-semibold text-gray-900">{formatNumber(reel.current_views)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Heart className="w-4 h-4 text-gray-400" />
                  <span>Likes</span>
                </div>
                <span className="font-semibold text-gray-900">{formatNumber(reel.current_likes)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span>Comments</span>
                </div>
                <span className="font-semibold text-gray-900">{formatNumber(reel.current_comments)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Share2 className="w-4 h-4 text-gray-400" />
                  <span>Shares</span>
                </div>
                <span className="font-semibold text-gray-900">{formatNumber(reel.current_shares)}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          {reel.caption && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="flex items-start justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600 flex-shrink-0">
                  <AlignLeft className="w-4 h-4 text-gray-400" />
                  <span>Caption</span>
                </div>
                <p className="text-sm text-gray-700 text-right ml-4 line-clamp-3">{reel.caption}</p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meta</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Upload Date</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {reel.posted_at ? new Date(reel.posted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
              {lastSnapshot && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Statistics</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(lastSnapshot.scraped_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span>Profile</span>
                </div>
                <a href={igProfileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-500 hover:text-blue-600">
                  @{profile?.instagram_username}
                </a>
              </div>
            </div>
          </div>

          {/* History Chart */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">History Chart</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading…</div>
            ) : chartData.length < 2 ? (
              <div className="h-40 flex items-center justify-center text-sm text-gray-400">Not enough data yet</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Views</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="topReelsViewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45} />
                      <Tooltip formatter={(v) => [formatNumber(v as number), "Total Views"]} />
                      <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} fill="url(#topReelsViewsGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">New Views</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="topReelsNewViewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={45} />
                      <Tooltip formatter={(v) => [formatNumber(v as number), "New Views"]} />
                      <Area type="monotone" dataKey="newViews" stroke="#6366f1" strokeWidth={2} fill="url(#topReelsNewViewsGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
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
interface TopReelsClientProps {
  reels: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  tags: any[];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateStr(d);
}

export function TopReelsClient({ reels, models, groups, profiles, tags }: TopReelsClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [insightsReel, setInsightsReel] = useState<{ reel: any; profile: any } | null>(null);
  const [playingReelId, setPlayingReelId] = useState<string | null>(null);
  const [videoLoadingId, setVideoLoadingId] = useState<string | null>(null);
  const [failedVideoIds, setFailedVideoIds] = useState<Set<string>>(new Set());

  // Date selection for which day to show
  const [selectedDate, setSelectedDate] = useState<string>(getYesterdayStr());
  const [activeReels, setActiveReels] = useState<any[]>(reels);
  const [dateLoading, setDateLoading] = useState(false);

  // Cache: date → enriched reels (persists across date switches within session)
  const dateCache = useRef<Record<string, any[]>>({ [getYesterdayStr()]: reels });

  // Filter panel state
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("best_performing");
  const [minMultiplier, setMinMultiplier] = useState(MIN_MULTIPLIER);

  // Preload last 5 days on mount
  useEffect(() => {
    async function preload() {
      const yesterday = getYesterdayStr();
      const datesToLoad: string[] = [];
      for (let i = 2; i <= 5; i++) {
        const d = addDays(yesterday, -(i - 1));
        if (!dateCache.current[d]) datesToLoad.push(d);
      }
      // Load in parallel
      const results = await Promise.all(
        datesToLoad.map(d => getTopReelsForDate(d).then(data => ({ date: d, data })).catch(() => null))
      );
      for (const r of results) {
        if (r) dateCache.current[r.date] = r.data;
      }
    }
    preload();
  }, []);

  // Load data for a specific date (uses cache if available)
  async function loadDate(dateStr: string) {
    setSelectedDate(dateStr);
    setPage(0);

    // Check cache first
    if (dateCache.current[dateStr]) {
      setActiveReels(dateCache.current[dateStr]);
      return;
    }

    setDateLoading(true);
    try {
      const data = await getTopReelsForDate(dateStr);
      dateCache.current[dateStr] = data;
      setActiveReels(data);
    } catch (e) {
      console.error("Failed to load data for date", dateStr, e);
    } finally {
      setDateLoading(false);
    }
  }

  function shiftDate(days: number) {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + days);
    const newDate = toLocalDateStr(d);
    // Don't go past yesterday (data is always from the day before)
    if (newDate > getYesterdayStr()) return;
    loadDate(newDate);
  }

  // Group options filtered by selected models
  const groupOptions = useMemo(() => {
    let opts = groups.map((g: any) => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) {
      opts = opts.filter(g => selectedModels.includes(g.model_id));
    }
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  // Profile options filtered by selected models/groups
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

  // Full filter + sort
  const filtered = useMemo(() => {
    let result = activeReels.filter(r => {
      const profile = r.profiles as any;
      if (!profile) return false;

      // Must have daily views > 0 for this date
      if ((r.dailyViews || 0) <= 0) return false;

      // Multiplier threshold
      if ((r.multiplier || 0) < minMultiplier) return false;

      // Model filter
      if (selectedModels !== null && !selectedModels.includes(profile.models?.id)) return false;
      // Group filter
      if (selectedGroups !== null && !selectedGroups.includes(profile.account_groups?.id)) return false;
      // Profile filter
      if (selectedProfiles !== null && !selectedProfiles.includes(profile.id)) return false;
      // Tag filter
      if (selectedTags.length > 0) {
        const profileTags = profile.tags || [];
        const tagNames = tags.filter((t: any) => selectedTags.includes(t.id)).map((t: any) => t.name);
        if (!tagNames.some((tn: string) => profileTags.includes(tn))) return false;
      }

      return true;
    });

    // Sort
    result.sort((a: any, b: any) => {
      switch (sortBy) {
        case "best_performing": return (b.multiplier || 0) - (a.multiplier || 0);
        case "least_performing": return (a.multiplier || 0) - (b.multiplier || 0);
        case "most_daily_views": return (b.dailyViews || 0) - (a.dailyViews || 0);
        case "most_viewed": return (b.current_views || 0) - (a.current_views || 0);
        case "newest": return new Date(b.posted_at || 0).getTime() - new Date(a.posted_at || 0).getTime();
        case "oldest": return new Date(a.posted_at || 0).getTime() - new Date(b.posted_at || 0).getTime();
        default: return 0;
      }
    });

    return result;
  }, [activeReels, selectedModels, selectedGroups, selectedProfiles, selectedTags, tags, sortBy, minMultiplier]);

  // Dynamic multiplier slider max (based on actual data, min starts at 2x)
  const maxMultiplier = useMemo(() => {
    const max = activeReels.reduce((m: number, r: any) => Math.max(m, r.multiplier || 0), 0);
    return Math.max(MIN_MULTIPLIER + 1, Math.ceil(max));
  }, [activeReels]);

  const sliderStep = maxMultiplier <= 5 ? 0.1 : maxMultiplier <= 20 ? 0.5 : 1.0;

  // Tier counts
  const tierCounts = useMemo(() => {
    let viral = 0, strong = 0, good = 0;
    for (const r of filtered) {
      if (r.multiplier >= 3) viral++;
      else if (r.multiplier >= 2) strong++;
      else if (r.multiplier >= 1.5) good++;
    }
    return { viral, strong, good, total: filtered.length };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REELS_PER_PAGE));
  const paged = filtered.slice(page * REELS_PER_PAGE, (page + 1) * REELS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedModels, selectedGroups, selectedProfiles, selectedTags, sortBy, minMultiplier]);

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

  return (
    <div className="p-6 space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MultiSelect
          label="Creators"
          options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))}
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
          options={tags.map((t: any) => ({ id: t.id, name: t.name }))}
          selected={selectedTags}
          onChange={(ids) => setSelectedTags((ids ?? []) as string[])}
          noneLabel="No Tags"
        />

        {/* Date Navigation (right-aligned, same as Analytics) */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <DatePicker
            value={selectedDate}
            onChange={loadDate}
            maxDate={getYesterdayStr()}
          />

          <button
            onClick={() => shiftDate(1)}
            disabled={selectedDate >= getYesterdayStr()}
            className="flex items-center px-2 py-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {dateLoading && (
            <span className="text-sm text-gray-400 animate-pulse">Loading…</span>
          )}
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors text-gray-600"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
          <span className="text-gray-500">Total:</span>
          <span className="font-semibold text-gray-900">{tierCounts.total}</span>
        </div>
        {tierCounts.viral > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <Flame className="w-3.5 h-3.5 text-red-500 -ml-2" />
            <Flame className="w-3.5 h-3.5 text-red-500 -ml-2" />
            <span className="font-semibold text-red-700">{tierCounts.viral}</span>
            <span className="text-red-500 text-xs">Viral (3x+)</span>
          </div>
        )}
        {tierCounts.strong > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <Flame className="w-3.5 h-3.5 text-orange-500 -ml-2" />
            <span className="font-semibold text-orange-700">{tierCounts.strong}</span>
            <span className="text-orange-500 text-xs">Strong (2-3x)</span>
          </div>
        )}
        {tierCounts.good > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-amber-700">{tierCounts.good}</span>
            <span className="text-amber-500 text-xs">Good (1.5-2x)</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-[90%] mx-auto">
        {paged.map((r: any) => {
          const profile = r.profiles as any;
          const tier = getPerformanceTier(r.multiplier);
          const daysSince = getDaysSincePosted(r.posted_at);
          const isStillTrending = daysSince > 1;

          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden w-full">
              {/* Top Toolbar */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-100">
                <button
                  onClick={() => setInsightsReel({ reel: r, profile })}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-brand-600 transition-colors"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  Insights
                </button>
                <a
                  href={r.reel_url || `https://www.instagram.com/reel/${r.shortcode}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-brand-500 transition-colors"
                  title="Open on Instagram"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Thumbnail / Video Player */}
              <div className="relative aspect-[9/16] bg-gray-100">
                {playingReelId === r.id && r.video_storage_url ? (
                  /* Video playing */
                  <video
                    src={r.video_storage_url}
                    autoPlay
                    loop
                    playsInline
                    controls
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => {
                      setPlayingReelId(null);
                      setFailedVideoIds(prev => new Set(prev).add(r.id));
                    }}
                  />
                ) : (
                  /* Thumbnail with play button */
                  <>
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

                    {/* Play button overlay (only if video available and not failed) */}
                    {r.video_storage_url && !failedVideoIds.has(r.id) && (
                      <button
                        onClick={() => setPlayingReelId(r.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-colors">
                          <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" />
                        </div>
                      </button>
                    )}
                  </>
                )}

                {/* Multiplier Badge (top-left) */}
                <div className={cn(
                  "absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-white text-xs font-bold flex items-center gap-0.5 shadow-sm z-10",
                  tier.bgColor
                )}>
                  {Array.from({ length: tier.flames }).map((_, i) => (
                    <Flame key={i} className="w-3 h-3" />
                  ))}
                  <span>{r.multiplier.toFixed(1)}x</span>
                </div>

                {/* Still Trending Badge (top-right) */}
                {isStillTrending && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-0.5 shadow-sm z-10">
                    <TrendingUp className="w-3 h-3" />
                    Tag {daysSince}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="px-2 pt-2 pb-1 space-y-1">
                {/* Daily views = primary metric */}
                <div className="flex items-center justify-center gap-1 text-xs">
                  <Eye className="w-3 h-3 text-green-500" />
                  <span className="font-bold text-green-700">+{formatNumber(r.dailyViews)}</span>
                  <span className="text-gray-400">today</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-gray-400" />
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
                {/* Median Baseline with level indicator */}
                <div className="text-[10px] text-gray-400 text-center pt-0.5">
                  Ø {r.avgLevel === "group" ? "Group" : r.avgLevel === "creator" ? "Creator" : "Account"}: {formatNumber(r.avgViews)} Views
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
                    href={`https://www.instagram.com/${profile?.instagram_username}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-pink-500 flex-shrink-0"
                    title="Open Instagram profile"
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
          No top reels found. Try lowering the minimum multiplier.
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
          Page {page + 1}/{totalPages} · {filtered.length} top reels
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
                  <h2 className="text-base font-semibold text-gray-900">Top Reels Options</h2>
                  <p className="text-xs text-gray-500">Filter top performing reels.</p>
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

              {/* Min Multiplier */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Min Performance Multiplier</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={MIN_MULTIPLIER}
                    max={maxMultiplier}
                    step={sliderStep}
                    value={Math.min(minMultiplier, maxMultiplier)}
                    onChange={e => setMinMultiplier(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900"
                  />
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">{minMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{MIN_MULTIPLIER}x</span>
                  <span>{maxMultiplier}x</span>
                </div>
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

      {/* Post Insights Modal */}
      {insightsReel && (
        <PostInsightsModal
          reel={insightsReel.reel}
          profile={insightsReel.profile}
          onClose={() => setInsightsReel(null)}
        />
      )}
    </div>
  );
}
