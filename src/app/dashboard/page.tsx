export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { OverviewCharts } from "@/components/overview-charts";

function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const supabase = createClient();

  const yesterday = getLocalDateStr(-1);

  // Total active profiles
  const { count: totalProfiles } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Snapshots for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: snapshotHistory } = await supabase
    .from("profile_snapshots")
    .select("profile_id, followers, total_reel_views, scraped_at")
    .gte("scraped_at", thirtyDaysAgo.toISOString())
    .order("scraped_at", { ascending: true });

  // Yesterday's snapshots for KPIs (computed after dailyDeltaData below)

  // Aggregate daily data for charts
  const dailyData: Record<string, { date: string; followers: number; views: number; count: number }> = {};
  for (const snap of snapshotHistory || []) {
    const date = snap.scraped_at.split("T")[0];
    if (!dailyData[date]) dailyData[date] = { date, followers: 0, views: 0, count: 0 };
    dailyData[date].followers += snap.followers || 0;
    dailyData[date].views += snap.total_reel_views || 0;
    dailyData[date].count += 1;
  }

  // Top 10 accounts by views in last 5 available days
  const availableDates = Object.keys(dailyData).sort();
  const last5Dates = availableDates.slice(-5);
  const dateBeforeLast5 = availableDates.length > 5 ? availableDates[availableDates.length - 6] : null;

  // Group snapshots by date+profile
  const snapByDateProfile: Record<string, Record<string, any>> = {};
  for (const snap of snapshotHistory || []) {
    const date = snap.scraped_at.split("T")[0];
    if (!snapByDateProfile[date]) snapByDateProfile[date] = {};
    snapByDateProfile[date][snap.profile_id] = snap;
  }

  // Compute per-profile daily deltas with lookback for missing days
  const sortedDates = availableDates;
  const dailyDeltaData: Record<string, { followerDelta: number; viewDelta: number }> = {};
  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const prevDate = i > 0 ? sortedDates[i - 1] : null;
    let followerDelta = 0;
    let viewDelta = 0;
    const todaySnaps = snapByDateProfile[date] || {};
    const prevSnaps = prevDate ? (snapByDateProfile[prevDate] || {}) : {};
    for (const profileId of Object.keys(todaySnaps)) {
      const today = todaySnaps[profileId];
      let prev = prevSnaps[profileId];
      // If no prev on standard previous date, look further back for this profile
      if (!prev) {
        for (let j = i - 2; j >= 0; j--) {
          const candidate = snapByDateProfile[sortedDates[j]]?.[profileId];
          if (candidate) { prev = candidate; break; }
        }
      }
      if (prev) {
        followerDelta += Math.max(0, (today.followers || 0) - (prev.followers || 0));
        viewDelta += Math.max(0, (today.total_reel_views || 0) - (prev.total_reel_views || 0));
      }
    }
    dailyDeltaData[date] = { followerDelta, viewDelta };
  }

  // KPIs: always use yesterday
  const yesterdayDeltas = dailyDeltaData[yesterday] || { followerDelta: 0, viewDelta: 0 };
  const newFollowers = yesterdayDeltas.followerDelta;
  const totalViewsYesterday = yesterdayDeltas.viewDelta;
  const lastDataDate = availableDates.length > 0 ? availableDates[availableDates.length - 1] : null;

  const chartData = Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, followerDelta: dailyDeltaData[d.date]?.followerDelta || 0, viewDelta: dailyDeltaData[d.date]?.viewDelta || 0 }));

  // Fetch profiles for display info
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, instagram_username, models(name, nickname), account_groups(name)")
    .eq("is_active", true);

  // Calculate total view delta for each profile over last 5 days
  const profileViewMap: Record<string, number> = {};
  const profileFollowerMap: Record<string, number> = {};

  for (const profile of allProfiles || []) {
    const lastSnap = snapByDateProfile[last5Dates[last5Dates.length - 1]]?.[profile.id];
    const firstSnap = dateBeforeLast5
      ? snapByDateProfile[dateBeforeLast5]?.[profile.id]
      : snapByDateProfile[last5Dates[0]]?.[profile.id];

    if (lastSnap && firstSnap) {
      profileViewMap[profile.id] = Math.max(0, (lastSnap.total_reel_views || 0) - (firstSnap.total_reel_views || 0));
    } else if (lastSnap) {
      profileViewMap[profile.id] = lastSnap.total_reel_views || 0;
    }
    profileFollowerMap[profile.id] = lastSnap?.followers || 0;
  }

  const top10ByViews = (allProfiles || [])
    .map(p => ({
      ...p,
      viewsLast5: profileViewMap[p.id] || 0,
      followers: profileFollowerMap[p.id] || 0,
    }))
    .sort((a, b) => b.viewsLast5 - a.viewsLast5)
    .slice(0, 10);

  const dayCount = last5Dates.length;
  const displayDays = Math.min(availableDates.length, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Data from yesterday · {yesterday}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Active Profiles" value={totalProfiles ?? 0} icon="👤" color="blue" />
        <KpiCard title="New Followers" value={newFollowers} icon="❤️" color="pink" />
        <KpiCard title="Views Yesterday" value={totalViewsYesterday} icon="👁️" color="purple" />
        <KpiCard title="Data from" value={0} valueOverride={lastDataDate ? `Last data: ${lastDataDate}` : "No data"} icon="📅" color="green" />
      </div>

      {/* Charts */}
      <OverviewCharts chartData={chartData} lastDataDate={lastDataDate} />

      {/* Top 10 by Views */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top 10 Accounts by Views</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ranked by total reel views gained in the last {dayCount} days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Followers</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views (last {dayCount}d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {top10ByViews.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-6 py-3">
                    <a href={`/dashboard/profiles/${p.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                      @{p.instagram_username}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{(p.models as any)?.nickname || (p.models as any)?.name || "-"}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{formatNumber(p.followers)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatNumber(p.viewsLast5)}</td>
                </tr>
              ))}
              {top10ByViews.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, color, suffix, valueOverride }: {
  title: string; value: number; icon: string; color: string; suffix?: string; valueOverride?: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    pink: "bg-pink-50 text-pink-600",
    purple: "bg-purple-50 text-purple-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <span className={`text-xl p-2 rounded-lg ${colors[color]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {valueOverride ?? (value >= 1000 ? formatNumber(value) : value.toLocaleString("en-US"))}
      </div>
      {suffix && <div className="text-xs text-gray-400 mt-1">{suffix}</div>}
    </div>
  );
}
