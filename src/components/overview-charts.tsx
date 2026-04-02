"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber, formatDateShort } from "@/lib/utils";

interface ChartData {
  date: string;
  followers: number;
  views: number;
  count: number;
}

export function OverviewCharts({ chartData }: { chartData: ChartData[] }) {
  const formatted = chartData.map(d => ({
    ...d,
    dateLabel: formatDateShort(d.date),
  }));

  // Last 5 days for the views bar chart
  const last5 = formatted.slice(-5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Follower History — all available data */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Follower History</h3>
        {formatted.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatNumber(value as number), "Followers"]} />
              <Line type="monotone" dataKey="followers" stroke="#C9A227" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Reel Views — last 5 days */}
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
              <Bar dataKey="views" fill="#C9A227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
