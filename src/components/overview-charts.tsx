"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber, formatDateShort } from "@/lib/utils";

const BAR_COLOR = "#162748";

interface ChartData {
  date: string;
  followers: number;
  views: number;
  count: number;
  followerDelta: number;
  viewDelta: number;
}

export function OverviewCharts({ chartData, lastDataDate }: { chartData: ChartData[]; lastDataDate: string | null }) {
  // Build last 5 calendar days (yesterday backward)
  const last5Days: { date: string; dateLabel: string; followerDelta: number; viewDelta: number }[] = [];
  const dataMap = new Map(chartData.map(d => [d.date, d]));

  for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const existing = dataMap.get(ds);
    last5Days.unshift({
      date: ds,
      dateLabel: formatDateShort(ds),
      followerDelta: existing?.followerDelta || 0,
      viewDelta: existing?.viewDelta || 0,
    });
  }

  const label = lastDataDate ? `last data: ${formatDateShort(lastDataDate)}` : "last 5 days";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Follower Growth */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Follower Growth <span className="text-gray-400 font-normal text-xs">({label})</span></h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last5Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => [formatNumber(value as number), "New Followers"]} />
            <Bar dataKey="followerDelta" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Reel Views */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Reel Views <span className="text-gray-400 font-normal text-xs">({label})</span></h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last5Days}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => [formatNumber(value as number), "Views"]} />
            <Bar dataKey="viewDelta" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
