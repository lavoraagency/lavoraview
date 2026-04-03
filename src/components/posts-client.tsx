"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Heart, MessageCircle, Share2, ChevronDown, Filter, Flame } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const REELS_PER_PAGE = 12;

function formatPostDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) + ", " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  noneLabel,
  searchable,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[] | null;
  onChange: (ids: string[] | null) => void;
  noneLabel?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
    if (!open) setSearch("");
  }, [open, searchable]);

  const isAll = noneLabel ? (selected as string[]).length === 0 : selected === null;
  const sel = selected ?? [];

  const filteredOptions = searchable && search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const displayText = isAll
    ? (noneLabel ? noneLabel : `All ${label}`)
    : sel.length === 1
    ? options.find(o => o.id === sel[0])?.name || label
    : `${sel.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors min-w-[160px]"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px]">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search profile..."
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400 placeholder-gray-400"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {!search && (
              <>
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="checkbox"
                    checked={isAll}
                    onChange={() => {
                      if (noneLabel) onChange(isAll ? options.map(o => o.id) : []);
                      else onChange(isAll ? [] : null);
                    }}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium">{noneLabel ? "No Tags" : "Select All"}</span>
                </label>
                {noneLabel && (
                  <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={sel.length === options.length}
                      onChange={() => onChange(sel.length === options.length ? [] : options.map(o => o.id))}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </label>
                )}
              </>
            )}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No results</div>
            )}
            {filteredOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAll || sel.includes(o.id)}
                  onChange={() => {
                    if (isAll && !noneLabel) {
                      onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                    } else if (sel.includes(o.id)) {
                      const next = sel.filter(id => id !== o.id);
                      onChange(noneLabel ? next : (next.length === 0 ? [] : next));
                    } else {
                      const next = [...sel, o.id];
                      if (!noneLabel && next.length === options.length) onChange(null);
                      else onChange(next);
                    }
                  }}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm">{o.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PostsClientProps {
  reels: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  tags: any[];
}

export function PostsClient({ reels, models, groups, profiles, tags }: PostsClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  // Group options filtered by selected models
  const groupOptions = useMemo(() => {
    let opts = groups.map(g => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) {
      opts = opts.filter(g => selectedModels.includes(g.model_id));
    }
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  // Profile options filtered by selected models/groups
  const profileOptions = useMemo(() => {
    let opts = profiles.map(p => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels !== null && selectedModels.length > 0) {
      const ids = new Set(profiles.filter(p => selectedModels.includes(p.model_id)).map(p => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    if (selectedGroups !== null && selectedGroups.length > 0) {
      const ids = new Set(profiles.filter(p => selectedGroups.includes(p.account_group_id)).map(p => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  const filtered = useMemo(() => {
    return reels.filter(r => {
      const profile = r.profiles as any;
      if (!profile) return false;
      if (selectedModels !== null && !selectedModels.includes(profile.models?.id)) return false;
      if (selectedGroups !== null && !selectedGroups.includes(profile.account_groups?.id)) return false;
      if (selectedProfiles !== null && !selectedProfiles.includes(profile.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = profile.tags || [];
        const tagNames = tags.filter(t => selectedTags.includes(t.id)).map(t => t.name);
        if (!tagNames.some((tn: string) => profileTags.includes(tn))) return false;
      }
      return true;
    });
  }, [reels, selectedModels, selectedGroups, selectedProfiles, selectedTags, tags]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REELS_PER_PAGE));
  const paged = filtered.slice(page * REELS_PER_PAGE, (page + 1) * REELS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedModels, selectedGroups, selectedProfiles, selectedTags]);

  // Pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 2) pages.push("...");
      for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
      if (page < totalPages - 3) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="px-[15%] py-6 space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MultiSelect
          label="Creators"
          options={models.map(m => ({ id: m.id, name: m.nickname || m.name }))}
          selected={selectedModels}
          onChange={v => { setSelectedModels(v); setSelectedGroups(null); setSelectedProfiles(null); }}
        />
        <MultiSelect
          label="Groups"
          options={groupOptions}
          selected={selectedGroups}
          onChange={setSelectedGroups}
        />
        <MultiSelect
          label="Profiles"
          options={profileOptions}
          selected={selectedProfiles}
          onChange={setSelectedProfiles}
          searchable
        />
        <MultiSelect
          label="Tags"
          options={tags.map(t => ({ id: t.id, name: t.name }))}
          selected={selectedTags}
          onChange={(ids) => setSelectedTags((ids ?? []) as string[])}
          noneLabel="No Tags"
        />

        <div className="ml-auto">
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors text-gray-600">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {paged.map(r => {
          const profile = r.profiles as any;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-[3/4] bg-gray-100">
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
                    <Flame className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="px-2 pt-2 pb-1 space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-gray-400" />
                    {r.last_daily_views > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                        +{formatNumber(r.last_daily_views)}
                      </span>
                    )}
                    <span className="font-medium">{formatNumber(r.current_views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_likes)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_comments)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="w-3 h-3 text-gray-400" />
                    <span className="font-medium">{formatNumber(r.current_shares)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-2 pb-2 pt-0.5 border-t border-gray-100 mt-1">
                <div className="flex items-center gap-1 min-w-0">
                  <Link
                    href={`/dashboard/profiles/${profile?.id}`}
                    className="text-[11px] font-medium text-gray-700 hover:text-brand-600 truncate"
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
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {formatPostDate(r.posted_at)}
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
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-2 py-1.5 text-sm text-gray-400">...</span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={cn(
                  "px-3 py-1.5 text-sm border rounded-lg transition-colors",
                  page === p
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                )}
              >
                {(p as number) + 1}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="text-center text-xs text-gray-400">
          Page {page + 1}/{totalPages} · {filtered.length} reels total
        </div>
      )}
    </div>
  );
}
