"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, X, ExternalLink } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";

// Color palette for profiles
const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#a855f7", "#eab308", "#22c55e", "#e11d48", "#0ea5e9",
  "#d946ef", "#64748b", "#fb923c", "#2dd4bf", "#facc15",
  "#c084fc", "#4ade80", "#f43f5e", "#38bdf8", "#a3e635",
  "#e879f9", "#34d399", "#fb7185", "#7dd3fc", "#bef264",
  "#f0abfc", "#6ee7b7", "#fda4af", "#93c5fd", "#d9f99d",
  "#f5d0fe", "#a7f3d0", "#fecdd3", "#bfdbfe", "#ecfccb",
];

interface AnalyticsClientProps {
  profiles: any[];
  snapshots: any[];
  models: any[];
  groups: any[];
  tags: any[];
}

// Multi-select dropdown component
function MultiSelect({
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

  const allSelected = selected.length === 0;
  const displayText = allSelected
    ? `All ${label}`
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
              checked={allSelected}
              onChange={() => onChange([])}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span className="text-sm font-medium">Select All</span>
          </label>
          {options.map(o => (
            <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => {
                  if (selected.includes(o.id)) {
                    onChange(selected.filter(id => id !== o.id));
                  } else {
                    onChange([...selected, o.id]);
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
  const top3 = data.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-4">
        <div className="w-28 h-28 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length > 0 ? data : [{ name: "empty", value: 1, color: "#e5e7eb" }]}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
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
          <div className="text-center -mt-[72px]">
            <div className="text-lg font-bold text-gray-900">{total}</div>
            <div className="text-[10px] text-gray-500">{title}</div>
          </div>
        </div>
        <div className="flex-1 space-y-2 ml-2 mt-6">
          {top3.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
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
              <span className="font-medium text-gray-900 ml-2 text-xs">{formatNumber(d.value)}</span>
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
  profileKeys,
  colorMap,
}: {
  title: string;
  data: any[];
  profileKeys: string[];
  colorMap: Record<string, string>;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v)} />
          <Tooltip
            formatter={(value: number) => formatNumber(value)}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          {profileKeys.map(key => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={colorMap[key] || "#6366f1"}
              radius={profileKeys.indexOf(key) === profileKeys.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsClient({ profiles, snapshots, models, groups, tags }: AnalyticsClientProps) {
  // Filters
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to yesterday (local time, not UTC)
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Build profile color map
  const profileColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p, i) => {
      map[p.instagram_username] = COLORS[i % COLORS.length];
    });
    return map;
  }, [profiles]);

  // Filter profiles based on selections
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (selectedModels.length > 0 && !selectedModels.includes(p.models?.id)) return false;
      if (selectedProfiles.length > 0 && !selectedProfiles.includes(p.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = p.tags || [];
        const tagNames = tags.filter(t => selectedTags.includes(t.id)).map(t => t.name);
        if (!tagNames.some(tn => profileTags.includes(tn))) return false;
      }
      return true;
    });
  }, [profiles, selectedModels, selectedProfiles, selectedTags, tags]);

  const filteredProfileIds = useMemo(() => new Set(filteredProfiles.map(p => p.id)), [filteredProfiles]);

  // Build profile id->username map
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

  // Get sorted available dates
  const availableDates = useMemo(() => {
    return Object.keys(snapshotsByDateProfile).sort();
  }, [snapshotsByDateProfile]);

  // Auto-fallback: if selectedDate has no data, jump to latest available date
  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[availableDates.length - 1]);
    }
  }, [availableDates, selectedDate]);

  // Navigate date
  function prevDate() {
    const idx = availableDates.indexOf(selectedDate);
    if (idx > 0) setSelectedDate(availableDates[idx - 1]);
  }
  function nextDate() {
    const idx = availableDates.indexOf(selectedDate);
    if (idx < availableDates.length - 1) setSelectedDate(availableDates[idx + 1]);
  }

  // Get previous date for delta calculation
  const prevDateStr = useMemo(() => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx > 0) return availableDates[idx - 1];
    return null;
  }, [availableDates, selectedDate]);

  // Calculate stats for selected date
  const stats = useMemo(() => {
    const todaySnaps = snapshotsByDateProfile[selectedDate] || {};
    const yesterdaySnaps = prevDateStr ? (snapshotsByDateProfile[prevDateStr] || {}) : {};

    let totalFollowers = 0, totalPosts = 0, totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;
    let deltaFollowers = 0, deltaPosts = 0, deltaViews = 0, deltaLikes = 0, deltaComments = 0, deltaShares = 0;
    let profileCount = 0;

    // Per-profile deltas for donut charts
    const perProfile: Record<string, {
      name: string; followers: number; posts: number; views: number;
      likes: number; comments: number; shares: number; interactions: number;
    }> = {};

    for (const profileId of Array.from(filteredProfileIds)) {
      const today = todaySnaps[profileId];
      if (!today) continue;

      const yesterday = yesterdaySnaps[profileId];
      const name = profileNameMap[profileId] || "unknown";
      profileCount++;

      totalFollowers += today.followers || 0;
      totalPosts += today.media_count || 0;
      totalViews += today.total_reel_views || 0;
      totalLikes += today.total_reel_likes || 0;
      totalComments += today.total_reel_comments || 0;
      totalShares += today.total_reel_shares || 0;

      // If no previous day exists, show absolute values instead of 0
      const dF = yesterday ? Math.max(0, (today.followers || 0) - (yesterday.followers || 0)) : (today.followers || 0);
      const dP = yesterday ? Math.max(0, (today.media_count || 0) - (yesterday.media_count || 0)) : (today.media_count || 0);
      const dV = yesterday ? Math.max(0, (today.total_reel_views || 0) - (yesterday.total_reel_views || 0)) : (today.total_reel_views || 0);
      const dL = yesterday ? Math.max(0, (today.total_reel_likes || 0) - (yesterday.total_reel_likes || 0)) : (today.total_reel_likes || 0);
      const dC = yesterday ? Math.max(0, (today.total_reel_comments || 0) - (yesterday.total_reel_comments || 0)) : (today.total_reel_comments || 0);
      const dS = yesterday ? Math.max(0, (today.total_reel_shares || 0) - (yesterday.total_reel_shares || 0)) : (today.total_reel_shares || 0);

      deltaFollowers += dF;
      deltaPosts += dP;
      deltaViews += dV;
      deltaLikes += dL;
      deltaComments += dC;
      deltaShares += dS;

      perProfile[profileId] = {
        name,
        followers: dF,
        posts: dP,
        views: dV,
        likes: dL,
        comments: dC,
        shares: dS,
        interactions: dL + dC + dS,
      };
    }

    const totalInteractions = deltaLikes + deltaComments + deltaShares;
    const avgViews = profileCount > 0 && totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;
    const engagementPerPost = totalPosts > 0 ? Math.round(totalInteractions / totalPosts) : 0;
    const viralityRatio = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(2) : "0.00";

    const hasPrevDay = !!prevDateStr;

    return {
      totalFollowers, totalPosts, totalViews, totalLikes, totalComments, totalShares,
      deltaFollowers, deltaPosts, deltaViews, deltaLikes, deltaComments, deltaShares,
      totalInteractions, avgViews, engagementPerPost, viralityRatio,
      perProfile, profileCount, hasPrevDay,
    };
  }, [snapshotsByDateProfile, selectedDate, prevDateStr, filteredProfileIds, profileNameMap]);

  // Donut chart data
  const donutData = useMemo(() => {
    const entries = Object.entries(stats.perProfile);

    function buildDonut(field: string) {
      return entries
        .map(([id, d]) => ({
          name: d.name,
          value: (d as any)[field] as number,
          color: profileColorMap[d.name] || "#6366f1",
          profileId: id,
        }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    return {
      followers: buildDonut("followers"),
      posts: buildDonut("posts"),
      views: buildDonut("views"),
      interactions: buildDonut("interactions"),
    };
  }, [stats.perProfile, profileColorMap]);

  // Bar chart data (last 30 days)
  const barChartData = useMemo(() => {
    // Get last 30 available dates up to selected date
    const endIdx = availableDates.indexOf(selectedDate);
    const startIdx = Math.max(0, endIdx - 29);
    const dates = endIdx >= 0 ? availableDates.slice(startIdx, endIdx + 1) : [];

    const activeUsernames = filteredProfiles.map(p => p.instagram_username);
    const activeIds = Array.from(filteredProfileIds);

    // Build daily data with per-profile breakdown
    const charts: { views: any[]; likes: any[]; comments: any[]; shares: any[]; followers: any[]; posts: any[] } = {
      views: [], likes: [], comments: [], shares: [], followers: [], posts: [],
    };

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const prevDay = i > 0 ? dates[i - 1] : (startIdx > 0 ? availableDates[startIdx - 1] : null);
      const todaySnaps = snapshotsByDateProfile[date] || {};
      const prevSnaps = prevDay ? (snapshotsByDateProfile[prevDay] || {}) : {};

      const shortDate = new Date(date + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

      const viewRow: any = { date: shortDate };
      const likeRow: any = { date: shortDate };
      const commentRow: any = { date: shortDate };
      const shareRow: any = { date: shortDate };
      const followerRow: any = { date: shortDate };
      const postRow: any = { date: shortDate };

      for (const pid of activeIds) {
        const today = todaySnaps[pid];
        const prev = prevSnaps[pid];
        const uname = profileNameMap[pid];
        if (!today || !uname) continue;

        // If no previous day exists, show absolute values instead of 0
        viewRow[uname] = prev ? Math.max(0, (today.total_reel_views || 0) - (prev.total_reel_views || 0)) : (today.total_reel_views || 0);
        likeRow[uname] = prev ? Math.max(0, (today.total_reel_likes || 0) - (prev.total_reel_likes || 0)) : (today.total_reel_likes || 0);
        commentRow[uname] = prev ? Math.max(0, (today.total_reel_comments || 0) - (prev.total_reel_comments || 0)) : (today.total_reel_comments || 0);
        shareRow[uname] = prev ? Math.max(0, (today.total_reel_shares || 0) - (prev.total_reel_shares || 0)) : (today.total_reel_shares || 0);
        followerRow[uname] = prev ? Math.max(0, (today.followers || 0) - (prev.followers || 0)) : (today.followers || 0);
        postRow[uname] = prev ? Math.max(0, (today.media_count || 0) - (prev.media_count || 0)) : (today.media_count || 0);
      }

      charts.views.push(viewRow);
      charts.likes.push(likeRow);
      charts.comments.push(commentRow);
      charts.shares.push(shareRow);
      charts.followers.push(followerRow);
      charts.posts.push(postRow);
    }

    return { charts, profileKeys: activeUsernames };
  }, [availableDates, selectedDate, snapshotsByDateProfile, filteredProfiles, filteredProfileIds, profileNameMap]);

  // Format selected date display
  const dateDisplay = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sel = new Date(selectedDate + "T00:00:00");
    sel.setHours(0, 0, 0, 0);

    if (sel.getTime() === today.getTime()) return "Today";
    if (sel.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }, [selectedDate]);

  // Profile options for multi-select
  const profileOptions = useMemo(() => {
    let opts = profiles.map(p => ({ id: p.id, name: `@${p.instagram_username}` }));
    // Filter by selected models if any
    if (selectedModels.length > 0) {
      const modelFilteredIds = new Set(profiles.filter(p => selectedModels.includes(p.models?.id)).map(p => p.id));
      opts = opts.filter(o => modelFilteredIds.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels]);

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
        />

        {/* Date Picker */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={prevDate}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium cursor-pointer hover:border-gray-300">
              <Calendar className="w-4 h-4 text-gray-400" />
              {dateDisplay}
            </div>
          </div>
          <button
            onClick={nextDate}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Row 1 - Totals */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-3 lg:grid-cols-6 divide-x divide-gray-200">
          <StatCard label="Followers" value={formatNumber(stats.totalFollowers)} />
          <StatCard label="Posts" value={formatNumber(stats.totalPosts)} />
          <StatCard label="Views" value={formatNumber(stats.totalViews)} />
          <StatCard label="Likes" value={formatNumber(stats.totalLikes)} />
          <StatCard label="Comments" value={formatNumber(stats.totalComments)} />
          <StatCard label="Shares" value={formatNumber(stats.totalShares)} />
        </div>
      </div>

      {/* Stats Row 2 - Daily / Derived */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-3 lg:grid-cols-6 divide-x divide-gray-200">
          <StatCard label="Daily Followers" value={formatNumber(stats.deltaFollowers)} sub />
          <StatCard label="Post Frequency" value={String(stats.deltaPosts)} sub />
          <StatCard label="Average Views" value={formatNumber(stats.avgViews)} sub />
          <StatCard label="Total Interactions" value={formatNumber(stats.totalInteractions)} sub />
          <StatCard label="Engagement/Post" value={String(stats.engagementPerPost)} sub />
          <StatCard label="Virality Ratio" value={`${stats.viralityRatio}%`} sub />
        </div>
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <DonutCard
          title={stats.hasPrevDay ? "New Followers" : "Followers"}
          total={formatNumber(stats.deltaFollowers)}
          data={donutData.followers}
        />
        <DonutCard
          title={stats.hasPrevDay ? "New Posts" : "Posts"}
          total={String(stats.deltaPosts)}
          data={donutData.posts}
        />
        <DonutCard
          title={stats.hasPrevDay ? "New Views" : "Views"}
          total={formatNumber(stats.deltaViews)}
          data={donutData.views}
        />
        <DonutCard
          title={stats.hasPrevDay ? "New Interactions" : "Interactions"}
          total={formatNumber(stats.totalInteractions)}
          data={donutData.interactions}
        />
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricBarChart
          title="Views"
          data={barChartData.charts.views}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
        <MetricBarChart
          title="Likes"
          data={barChartData.charts.likes}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
        <MetricBarChart
          title="Comments"
          data={barChartData.charts.comments}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
        <MetricBarChart
          title="Shares"
          data={barChartData.charts.shares}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
        <MetricBarChart
          title="Followers"
          data={barChartData.charts.followers}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
        <MetricBarChart
          title="Posts"
          data={barChartData.charts.posts}
          profileKeys={barChartData.profileKeys}
          colorMap={profileColorMap}
        />
      </div>
    </div>
  );
}
