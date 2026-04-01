"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, ArrowUpDown } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SortKey = "current_views" | "current_likes" | "current_comments" | "current_shares" | "last_daily_views" | "posted_at";

export function PostsClient({ reels, models }: { reels: any[]; models: any[] }) {
  const [sortBy, setSortBy] = useState<SortKey>("current_views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterModel, setFilterModel] = useState("");
  const [search, setSearch] = useState("");

  function handleSort(key: SortKey) {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  }

  const filtered = reels
    .filter(r => {
      const profile = r.profiles as any;
      if (filterModel && profile?.models?.id !== filterModel) return false;
      if (search && !(profile?.instagram_username || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

  const viralReels = filtered.filter(r => r.is_viral_tracked);

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center justify-end gap-1">
          {label}
          <ArrowUpDown className={cn("w-3 h-3", sortBy === field ? "text-brand-500" : "text-gray-300")} />
        </span>
      </th>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Post Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">{reels.length} Reels getrackt · {viralReels.length} viral</p>
      </div>

      {/* Viral Reels highlight */}
      {viralReels.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-orange-800">Viral Reels ({viralReels.length})</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {viralReels.slice(0, 10).map(r => (
              <div key={r.id} className="flex-shrink-0 w-20">
                <div className="relative w-20 aspect-[9/16] rounded-lg overflow-hidden bg-gray-200 mb-1">
                  {r.thumbnail_url && <Image src={r.thumbnail_url} alt="" fill className="object-cover" unoptimized />}
                  <div className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-0.5">
                    <Flame className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="text-xs text-orange-700 font-medium text-center">{formatNumber(r.current_views)}</div>
                <div className="text-xs text-orange-600 text-center">+{formatNumber(r.last_daily_views)}/day</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={filterModel}
          onChange={e => setFilterModel(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alle Models</option>
          {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <SortHeader label="Views" field="current_views" />
                <SortHeader label="Likes" field="current_likes" />
                <SortHeader label="Comments" field="current_comments" />
                <SortHeader label="Shares" field="current_shares" />
                <SortHeader label="Views/Day" field="last_daily_views" />
                <SortHeader label="Gepostet" field="posted_at" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const profile = r.profiles as any;
                return (
                  <tr key={r.id} className={cn("hover:bg-gray-50 transition-colors", r.is_viral_tracked && "bg-orange-50/30")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          {r.thumbnail_url ? (
                            <Image src={r.thumbnail_url} alt="" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">▶</div>
                          )}
                          {r.is_viral_tracked && (
                            <div className="absolute top-0.5 right-0.5 text-orange-500"><Flame className="w-3 h-3" /></div>
                          )}
                        </div>
                        <div className="max-w-[180px]">
                          {r.caption ? (
                            <p className="text-xs text-gray-600 line-clamp-2">{r.caption}</p>
                          ) : (
                            <span className="text-xs text-gray-400">Kein Caption</span>
                          )}
                          {r.reel_url && (
                            <a href={r.reel_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline">
                              Instagram →
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/profiles/${profile?.id}`} className="text-brand-600 hover:underline text-sm">
                        @{profile?.instagram_username}
                      </Link>
                      <div className="text-xs text-gray-400">{(profile?.models as any)?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(r.current_views)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.current_likes)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.current_comments)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.current_shares)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-medium", r.is_viral_tracked ? "text-orange-600" : "text-gray-600")}>
                        +{formatNumber(r.last_daily_views)}
                        {r.is_viral_tracked && " 🔥"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {r.posted_at ? formatDate(r.posted_at) : "-"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Reels getrackt
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
