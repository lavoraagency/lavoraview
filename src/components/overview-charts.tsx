"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber, formatDateShort } from "@/lib/utils";

interface ChartData {
  date: string;
  followers: number;
  views: number;
  count: number;
  followerDelta: number;
  viewDelta: number;
}

export function OverviewCharts({ chartData }: { chartData: ChartData[] }) {
  const formatted = chartData.map(d => ({
    ...d,
    dateLabel: formatDateShort(d.date),
  }));

  // Last 5 days for both charts
  const last5 = formatted.slice(-5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Follower Growth — last 5 days, per-profile delta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Follower Growth <span className="text-gray-400 font-normal text-xs">(last 5 days)</span></h3>
        {last5.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last5}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatNumber(value as number), "New Followers"]} />
              <Bar dataKey="followerDelta" fill="#C9A227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Reel Views — last 5 days, per-profile delta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Reel Views <span className="text-gray-400 font-normal text-xs">(last 5 days)</span></h3>
        {last5.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last5}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatNumber(value as number), "Views"]} />
              <Bar dataKey="viewDelta" fill="#C9A227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
