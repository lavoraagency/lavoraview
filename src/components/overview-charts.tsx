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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Follower-Verlauf (30 Tage)</h3>
        {formatted.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Noch keine Daten
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatNumber(value as number), "Followers"]} />
              <Line type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Tägliche Reel-Views</h3>
        {formatted.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            Noch keine Daten
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatNumber(value as number), "Views"]} />
              <Bar dataKey="views" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
