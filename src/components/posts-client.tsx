"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Flame, ExternalLink, Eye, Heart, MessageCircle, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function PostsClient({ reels, models }: { reels: any[]; models: any[] }) {
  const [filterModel, setFilterModel] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("current_views");
  const [page, setPage] = useState(0);
  const rowsPerPage = 20;

  const filtered = useMemo(() => {
    return reels
      .filter(r => {
        const profile = r.profiles as any;
        if (filterModel && profile?.models?.id !== filterModel) return false;
        if (search && !(profile?.instagram_username || "").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  }, [reels, filterModel, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const viralCount = reels.filter(r => r.is_viral_tracked).length;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <p className="text-gray-500 text-sm mt-1">{reels.length} Reels tracked · {viralCount} viral</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search username..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={filterModel}
          onChange={e => { setFilterModel(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Models</option>
          {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="current_views">Most Views</option>
          <option value="current_likes">Most Likes</option>
          <option value="last_daily_views">Trending (Views/Day)</option>
          <option value="posted_at">Newest</option>
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {paged.map(r => {
          const profile = r.profiles as any;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] bg-gray-100">
                {r.thumbnail_url ? (
                  <img
                    src={r.thumbnail_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-2xl">▶</div>
                )}
                {r.is_viral_tracked && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                )}
                {/* Hover overlay with stats */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <div className="grid grid-cols-2 gap-2 text-white text-xs">
                    <div className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(r.current_views)}</div>
                    <div className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(r.current_likes)}</div>
                    <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{formatNumber(r.current_comments)}</div>
                    <div className="flex items-center gap-1"><Share2 className="w-3 h-3" />{formatNumber(r.current_shares)}</div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      href={`/dashboard/profiles/${profile?.id}`}
                      className="text-xs font-medium text-gray-700 hover:text-brand-600 truncate"
                    >
                      @{profile?.instagram_username}
                    </Link>
                    <a
                      href={r.reel_url || `https://www.instagram.com/reel/${r.shortcode}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-brand-500 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatNumber(r.current_views)}
                  </span>
                  <span>{r.posted_at ? formatDate(r.posted_at) : "-"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No reels found
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
          <div className="text-xs text-gray-400">
            {filtered.length} reels total
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
