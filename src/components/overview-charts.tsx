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
  // Last 5 days that have actual data
  const last5Days = chartData
    .slice(-5)
    .map(d => ({
      ...d,
      dateLabel: formatDateShort(d.date),
    }));

  const dayCount = last5Days.length;
  const label = dayCount > 0 ? `last ${dayCount} days` : "no data";

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
