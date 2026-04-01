import { createServiceClient as createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { OverviewCharts } from "@/components/overview-charts";

export default async function DashboardPage() {
  const supabase = createClient();

  // Total active profiles
  const { count: totalProfiles } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Latest snapshots aggregated
  const { data: latestSnapshots } = await supabase
    .from("profile_snapshots")
    .select("followers, total_reel_views, scraped_at")
    .order("scraped_at", { ascending: false })
    .limit(1000);

  // Get today's total views and followers
  const today = new Date().toISOString().split("T")[0];
  const todaysSnaps = latestSnapshots?.filter(s =>
    s.scraped_at.startsWith(today)
  ) || [];
  const totalFollowers = todaysSnaps.reduce((sum, s) => sum + (s.followers || 0), 0);
  const totalViewsToday = todaysSnaps.reduce((sum, s) => sum + (s.total_reel_views || 0), 0);

  // Historical data for charts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: snapshotHistory } = await supabase
    .from("profile_snapshots")
    .select("profile_id, followers, total_reel_views, scraped_at")
    .gte("scraped_at", thirtyDaysAgo.toISOString())
    .order("scraped_at", { ascending: true });

  // Top accounts by follower growth
  const { data: topProfiles } = await supabase
    .from("profiles")
    .select(`
      id, instagram_username, status, is_active,
      models(name),
      account_groups(name),
      profile_snapshots(followers, total_reel_views, scraped_at)
    `)
    .eq("is_active", true)
    .limit(50);

  // Build top 10 by growth
  const profilesWithGrowth = (topProfiles || []).map(p => {
    const snaps = (p.profile_snapshots || []).sort((a: any, b: any) =>
      new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
    );
    const latest = snaps[0];
    const prev = snaps[1];
    const growth = latest && prev
      ? (latest.followers || 0) - (prev.followers || 0)
      : 0;
    return { ...p, latestFollowers: latest?.followers || 0, growth, latestViews: latest?.total_reel_views || 0 };
  }).sort((a, b) => b.growth - a.growth).slice(0, 10);

  // Aggregate daily data for charts
  const dailyData: Record<string, { date: string; followers: number; views: number; count: number }> = {};
  for (const snap of snapshotHistory || []) {
    const date = snap.scraped_at.split("T")[0];
    if (!dailyData[date]) dailyData[date] = { date, followers: 0, views: 0, count: 0 };
    dailyData[date].followers += snap.followers || 0;
    dailyData[date].views += snap.total_reel_views || 0;
    dailyData[date].count += 1;
  }
  const chartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Creator Analytics Dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Aktive Profile" value={totalProfiles ?? 0} icon="👤" color="blue" />
        <KpiCard title="Total Followers" value={totalFollowers} icon="❤️" color="pink" />
        <KpiCard title="Views Heute" value={totalViewsToday} icon="👁️" color="purple" />
        <KpiCard title="Tracking Tage" value={30} suffix="Tage" icon="📅" color="green" />
      </div>

      {/* Charts */}
      <OverviewCharts chartData={chartData} />

      {/* Top Accounts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Top 10 Accounts nach Wachstum</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Followers</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wachstum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profilesWithGrowth.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3">
                    <a href={`/dashboard/profiles/${p.id}`} className="font-medium text-brand-600 hover:underline">
                      @{p.instagram_username}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{(p.models as any)?.name || "-"}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatNumber(p.latestFollowers)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={p.growth >= 0 ? "text-green-600" : "text-red-600"}>
                      {p.growth >= 0 ? "+" : ""}{formatNumber(p.growth)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-500">{formatNumber(p.latestViews)}</td>
                </tr>
              ))}
              {profilesWithGrowth.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Noch keine Daten vorhanden. Führe den Instagram-Scraping-Workflow aus.
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

function KpiCard({ title, value, icon, color, suffix }: {
  title: string; value: number; icon: string; color: string; suffix?: string;
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
        {typeof value === "number" ? (
          suffix ? `${value} ${suffix}` : value >= 1000 ? formatNumber(value) : value.toLocaleString("de-DE")
        ) : value}
      </div>
    </div>
  );
}
