"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Eye, MousePointerClick } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber } from "@/lib/utils";
import { publicUrlForSlug, publicDisplayForSlug } from "@/lib/link-pages/config";
import { DateRangePicker, type DateRange, localToday, addDays } from "@/components/date-range-picker";
import type { LinkPage } from "@/lib/link-pages/types";

interface DailyClick { date: string; clicks: number }
interface DailyView { date: string; views: number }

function formatDayLabel(dateStr: string): string {
  // dateStr is a plain YYYY-MM-DD (already bucketed by London day in SQL) —
  // parse as UTC-midnight so it isn't shifted by the browser's own timezone.
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export function LinkPageAnalyticsClient({
  page, dailyClicks, dailyViews, minDate,
}: {
  page: LinkPage;
  dailyClicks: DailyClick[];
  dailyViews: DailyView[];
  /** Earliest date with fetched data — the picker's lower bound. */
  minDate: string;
}) {
  // Same picker as the Analytics tab, same default: last 14 days.
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: addDays(localToday(), -13),
    to: localToday(),
  }));
  const maxDate = localToday();

  const filteredClicks = useMemo(
    () => dailyClicks.filter(d => d.date >= dateRange.from && d.date <= dateRange.to),
    [dailyClicks, dateRange]
  );
  const filteredViews = useMemo(
    () => dailyViews.filter(d => d.date >= dateRange.from && d.date <= dateRange.to),
    [dailyViews, dateRange]
  );

  const totalClicksInRange = useMemo(() => filteredClicks.reduce((sum, d) => sum + (d.clicks || 0), 0), [filteredClicks]);
  const totalViewsInRange = useMemo(() => filteredViews.reduce((sum, d) => sum + (d.views || 0), 0), [filteredViews]);

  // Chart wants oldest -> newest, left to right.
  const clicksChartData = useMemo(
    () => [...filteredClicks].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ day: formatDayLabel(d.date), clicks: d.clicks })),
    [filteredClicks]
  );
  const viewsChartData = useMemo(
    () => [...filteredViews].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ day: formatDayLabel(d.date), views: d.views })),
    [filteredViews]
  );

  // One combined by-day table: every date that has either a view or a click
  // row, most recent first.
  const tableRows = useMemo(() => {
    const byDate: Record<string, { date: string; views: number; clicks: number }> = {};
    for (const v of filteredViews) {
      if (!byDate[v.date]) byDate[v.date] = { date: v.date, views: 0, clicks: 0 };
      byDate[v.date].views = v.views;
    }
    for (const c of filteredClicks) {
      if (!byDate[c.date]) byDate[c.date] = { date: c.date, views: 0, clicks: 0 };
      byDate[c.date].clicks = c.clicks;
    }
    return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredViews, filteredClicks]);

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/links" className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-0.5">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              {page.display_name || page.slug}
            </h1>
            <a
              href={publicUrlForSlug(page.slug, page.domain)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-600 transition-colors flex-shrink-0"
              title="Open public page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-1">{publicDisplayForSlug(page.slug, page.domain)}</p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center justify-end gap-3">
        <DateRangePicker range={dateRange} onChange={setDateRange} minDate={minDate} maxDate={maxDate} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5" /> Total Views (lifetime)
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(page.view_count || 0)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Eye className="w-3.5 h-3.5" /> Views (selected range)
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalViewsInRange)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MousePointerClick className="w-3.5 h-3.5" /> Clicks (selected range)
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(totalClicksInRange)}</div>
        </div>
      </div>

      {/* Daily Views chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Daily Views</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Counted once per real page load in the visitor&apos;s browser — someone opening the page again counts again.
          Cut at midnight, Europe/London.
        </p>
        {viewsChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">No views in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={viewsChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number) => [formatNumber(v), "Views"]} />
              <Bar dataKey="views" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily Clicks chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <MousePointerClick className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Daily Clicks</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Counted once per tap on an outbound link button inside the page (OnlyFans, Fansly, etc.) — page loads alone don&apos;t count.
          Cut at midnight, Europe/London.
        </p>
        {clicksChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-gray-400">No clicks in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={clicksChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip formatter={(v: number) => [formatNumber(v), "Clicks"]} />
              <Bar dataKey="clicks" fill="#111F39" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Combined daily table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">By Day</h2>
          <p className="text-xs text-gray-400 mt-0.5">Views = page loads · Clicks = taps on a link button inside the page</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500">Views</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tableRows.map(row => (
                <tr key={row.date} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-2.5 text-gray-900">{formatDayLabel(row.date)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-900">{formatNumber(row.views)}</td>
                  <td className="px-5 py-2.5 text-right text-gray-900">{formatNumber(row.clicks)}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400 text-sm">No data in this range</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
