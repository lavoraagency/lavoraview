"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, Search } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

type SortField = "views" | "posted_at" | "username" | "music" | "speaking" | "text_goal" | "location" | "outfit" | "acting" | "camera" | "scroll_stopper" | "reward_ending" | "caption_type" | "other";
type SortDir = "asc" | "desc";

// ── MultiSelect (same pattern as other tabs) ──────────────────
function MultiSelect({
  label, options, selected, onChange, noneLabel, searchable,
}: {
  label: string; options: { id: string; name: string }[]; selected: string[] | null;
  onChange: (ids: string[] | null) => void; noneLabel?: string; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); } }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50); if (!open) setSearch(""); }, [open, searchable]);

  const isAll = noneLabel ? (selected as string[]).length === 0 : selected === null;
  const sel = selected ?? [];
  const filteredOptions = searchable && search.trim() ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase())) : options;
  const displayText = isAll ? (noneLabel ? noneLabel : `All ${label}`) : sel.length === 1 ? options.find(o => o.id === sel[0])?.name || label : `${sel.length} ${label}`;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-gray-300 transition-colors min-w-[140px]">
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px]">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100">
              <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:border-brand-400 placeholder-gray-400" />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {!search && (
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                <input type="checkbox" checked={isAll} onChange={() => { if (noneLabel) onChange(isAll ? options.map(o => o.id) : []); else onChange(isAll ? [] : null); }} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm font-medium">{noneLabel ? "No Tags" : "Select All"}</span>
              </label>
            )}
            {filteredOptions.map(o => (
              <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={isAll || sel.includes(o.id)} onChange={() => {
                  if (isAll && !noneLabel) onChange(options.filter(opt => opt.id !== o.id).map(opt => opt.id));
                  else if (sel.includes(o.id)) { const next = sel.filter(id => id !== o.id); onChange(noneLabel ? next : (next.length === 0 ? [] : next)); }
                  else { const next = [...sel, o.id]; if (!noneLabel && next.length === options.length) onChange(null); else onChange(next); }
                }} className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                <span className="text-sm">{o.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ text, color }: { text: string; color?: string }) {
  if (!text) return null;
  return <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap", color || "bg-gray-100 text-gray-700")}>{text}</span>;
}

function YesNoBadge({ value }: { value: boolean }) {
  return value
    ? <Badge text="Yes" color="bg-green-50 text-green-700" />
    : <Badge text="No" color="bg-gray-50 text-gray-400" />;
}

// ── Expanded Row Detail ────────────────────────────────────────

// ── Main Component ─────────────────────────────────────────────
interface PatternAnalysisClientProps {
  reels: any[];
  models: any[];
  groups: any[];
  profiles: any[];
  tags: any[];
}

export function PatternAnalysisClient({ reels, models, groups, profiles, tags }: PatternAnalysisClientProps) {
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[] | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[] | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortField, setSortField] = useState<SortField>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group options
  const groupOptions = useMemo(() => {
    let opts = groups.map((g: any) => ({ id: g.id, name: g.name, model_id: g.model_id }));
    if (selectedModels !== null && selectedModels.length > 0) opts = opts.filter(g => selectedModels.includes(g.model_id));
    return opts.map(g => ({ id: g.id, name: g.name }));
  }, [groups, selectedModels]);

  const profileOptions = useMemo(() => {
    let opts = profiles.map((p: any) => ({ id: p.id, name: `@${p.instagram_username}` }));
    if (selectedModels !== null && selectedModels.length > 0) {
      const ids = new Set(profiles.filter((p: any) => selectedModels.includes(p.model_id)).map((p: any) => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    if (selectedGroups !== null && selectedGroups.length > 0) {
      const ids = new Set(profiles.filter((p: any) => selectedGroups.includes(p.account_group_id)).map((p: any) => p.id));
      opts = opts.filter(o => ids.has(o.id));
    }
    return opts;
  }, [profiles, selectedModels, selectedGroups]);

  // Sort helper
  function getSortValue(r: any, field: SortField): string | number {
    const a = r.video_analysis || {};
    switch (field) {
      case "views": return r.current_views || 0;
      case "posted_at": return r.posted_at ? new Date(r.posted_at).getTime() : 0;
      case "username": return r.profiles?.instagram_username || "";
      case "music": return a.sound_music?.genre || "";
      case "speaking": return a.sound_speaking?.speaking_purpose || "";
      case "text_goal": return a.text_overlay?.text_goal || a.text_overlay?.text_type || "";
      case "location": return a.background_location || "";
      case "outfit": return a.outfit || "";
      case "acting": return a.acting || "";
      case "camera": return a.camera_setup || "";
      case "scroll_stopper": return a.scroll_stopper?.has_scroll_stopper ? 1 : 0;
      case "reward_ending": return a.reward_ending?.has_reward ? 1 : 0;
      case "caption_type": return a.caption_type?.type || "";
      case "other": return a.other_notable || "";
      default: return 0;
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />;
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let result = reels.filter(r => {
      const profile = r.profiles as any;
      if (!profile) return false;
      if (selectedModels !== null && !selectedModels.includes(profile.models?.id)) return false;
      if (selectedGroups !== null && !selectedGroups.includes(profile.account_groups?.id)) return false;
      if (selectedProfiles !== null && !selectedProfiles.includes(profile.id)) return false;
      if (selectedTags.length > 0) {
        const profileTags = profile.tags || [];
        const tagNames = tags.filter((t: any) => selectedTags.includes(t.id)).map((t: any) => t.name);
        if (!tagNames.some((tn: string) => profileTags.includes(tn))) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const a = r.video_analysis || {};
        const searchIn = [
          profile.instagram_username, a.outfit, a.acting, a.background_location, a.camera_setup,
          a.sound_music?.genre, a.sound_speaking?.summary, a.text_overlay?.text_content,
          a.caption_type?.type, a.other_notable, r.caption
        ].filter(Boolean).join(" ").toLowerCase();
        if (!searchIn.includes(q)) return false;
      }
      return true;
    });

    result.sort((a: any, b: any) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      const cmp = typeof va === "number" ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [reels, selectedModels, selectedGroups, selectedProfiles, selectedTags, searchText, tags, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  useEffect(() => { setPage(0); }, [selectedModels, selectedGroups, selectedProfiles, selectedTags, searchText, sortField, sortDir, rowsPerPage]);

  const columns: { field: SortField; label: string; minWidth: string }[] = [
    { field: "views", label: "Views", minWidth: "min-w-[80px]" },
    { field: "music", label: "Music", minWidth: "min-w-[200px]" },
    { field: "speaking", label: "Speaking", minWidth: "min-w-[200px]" },
    { field: "text_goal", label: "Text", minWidth: "min-w-[240px]" },
    { field: "location", label: "Location", minWidth: "min-w-[160px]" },
    { field: "outfit", label: "Outfit", minWidth: "min-w-[240px]" },
    { field: "acting", label: "Acting", minWidth: "min-w-[240px]" },
    { field: "camera", label: "Camera", minWidth: "min-w-[220px]" },
    { field: "scroll_stopper", label: "Scroll Stop", minWidth: "min-w-[200px]" },
    { field: "reward_ending", label: "Reward End", minWidth: "min-w-[200px]" },
    { field: "caption_type", label: "Caption", minWidth: "min-w-[220px]" },
    { field: "other", label: "Other", minWidth: "min-w-[220px]" },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <MultiSelect label="Creators" options={models.map((m: any) => ({ id: m.id, name: m.nickname || m.name }))} selected={selectedModels} onChange={v => { setSelectedModels(v); setSelectedGroups(null); setSelectedProfiles(null); }} />
        <MultiSelect label="Groups" options={groupOptions} selected={selectedGroups} onChange={setSelectedGroups} />
        <MultiSelect label="Profiles" options={profileOptions} selected={selectedProfiles} onChange={setSelectedProfiles} searchable />
        <MultiSelect label="Tags" options={tags.map((t: any) => ({ id: t.id, name: t.name }))} selected={selectedTags} onChange={(ids) => setSelectedTags((ids ?? []) as string[])} noneLabel="No Tags" />

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search patterns..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 w-48"
            />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} reels</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm" style={{ minWidth: "100%" }}>
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[70px]"></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  <button onClick={() => toggleSort("username")} className="flex items-center gap-1">Account <SortIcon field="username" /></button>
                </th>
                {columns.map(col => (
                  <th key={col.field} className={cn("px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", col.minWidth)}>
                    <button onClick={() => toggleSort(col.field)} className="flex items-center gap-1">{col.label} <SortIcon field={col.field} /></button>
                  </th>
                ))}
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map(r => {
                const profile = r.profiles as any;
                const a = r.video_analysis || {};
                const isExpanded = expandedId === r.id;

                const trunc = (s: string | null | undefined, n: number) => !s ? "" : (s.length > n ? s.substring(0, n) + "…" : s);
                const Cell = ({ children, minWidth }: { children: React.ReactNode; minWidth: string }) => (
                  <td className={cn("px-3 py-2 align-top text-xs", minWidth)}>{children}</td>
                );

                return (
                  <tr key={r.id} className={cn("hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50", isExpanded && "bg-gray-50/30")} onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                    {/* Thumbnail */}
                    <td className="px-3 py-2 align-top">
                      <a href={r.reel_url || `https://www.instagram.com/reel/${r.shortcode}/`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        {r.thumbnail_url ? (
                          <img src={r.thumbnail_url} alt="" className="w-10 h-[60px] object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-10 h-[60px] bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">▶</div>
                        )}
                      </a>
                    </td>
                    {/* Account */}
                    <td className="px-3 py-2 align-top min-w-[140px]">
                      <Link href={`/dashboard/profiles/${profile?.id}`} onClick={e => e.stopPropagation()} className="text-xs font-medium text-gray-700 hover:text-brand-600">
                        @{profile?.instagram_username}
                      </Link>
                      <div className="text-[10px] text-gray-400">{r.posted_at ? new Date(r.posted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" }) : "?"}</div>
                    </td>
                    {/* Views */}
                    <Cell minWidth="min-w-[80px]"><span className="font-semibold text-gray-900">{formatNumber(r.current_views)}</span></Cell>
                    {/* Music */}
                    <Cell minWidth="min-w-[200px]">
                      {a.sound_music?.has_music ? (
                        <div className="space-y-1">
                          <div className="flex gap-1"><Badge text={a.sound_music.genre || "?"} /><Badge text={a.sound_music.volume || "?"} /></div>
                          {a.sound_music.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.sound_music.description : trunc(a.sound_music.description, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Speaking */}
                    <Cell minWidth="min-w-[200px]">
                      {a.sound_speaking?.has_speaking ? (
                        <div className="space-y-1">
                          <Badge text={a.sound_speaking.speaking_purpose || "?"} color="bg-blue-50 text-blue-700" />
                          {a.sound_speaking.summary && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.sound_speaking.summary : trunc(a.sound_speaking.summary, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Text */}
                    <Cell minWidth="min-w-[240px]">
                      {a.text_overlay?.has_text ? (
                        <div className="space-y-1">
                          <Badge text={a.text_overlay.text_goal || a.text_overlay.text_type || "?"} />
                          {a.text_overlay.text_content && <p className="text-[11px] text-gray-700 italic leading-snug">&ldquo;{isExpanded ? a.text_overlay.text_content : trunc(a.text_overlay.text_content, 70)}&rdquo;</p>}
                          {(a.text_overlay.text_description || a.text_overlay.text_purpose) && <p className="text-[11px] text-gray-500 leading-snug">{isExpanded ? (a.text_overlay.text_description || a.text_overlay.text_purpose) : trunc(a.text_overlay.text_description || a.text_overlay.text_purpose, 70)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Location */}
                    <Cell minWidth="min-w-[160px]">{a.background_location ? (isExpanded ? a.background_location : trunc(a.background_location, 40)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Outfit */}
                    <Cell minWidth="min-w-[240px]">{a.outfit ? (isExpanded ? a.outfit : trunc(a.outfit, 70)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Acting */}
                    <Cell minWidth="min-w-[240px]">{a.acting ? (isExpanded ? a.acting : trunc(a.acting, 70)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Camera */}
                    <Cell minWidth="min-w-[220px]">{a.camera_setup ? (isExpanded ? a.camera_setup : trunc(a.camera_setup, 60)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Scroll Stop */}
                    <Cell minWidth="min-w-[200px]">
                      <div className="space-y-1">
                        <YesNoBadge value={a.scroll_stopper?.has_scroll_stopper} />
                        {a.scroll_stopper?.has_scroll_stopper && a.scroll_stopper?.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.scroll_stopper.description : trunc(a.scroll_stopper.description, 60)}</p>}
                      </div>
                    </Cell>
                    {/* Reward End */}
                    <Cell minWidth="min-w-[200px]">
                      <div className="space-y-1">
                        <YesNoBadge value={a.reward_ending?.has_reward} />
                        {a.reward_ending?.has_reward && a.reward_ending?.description && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.reward_ending.description : trunc(a.reward_ending.description, 60)}</p>}
                      </div>
                    </Cell>
                    {/* Caption */}
                    <Cell minWidth="min-w-[220px]">
                      {a.caption_type?.type ? (
                        <div className="space-y-1">
                          <Badge text={a.caption_type.type} />
                          {a.caption_type.purpose && <p className="text-[11px] text-gray-600 leading-snug">{isExpanded ? a.caption_type.purpose : trunc(a.caption_type.purpose, 60)}</p>}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </Cell>
                    {/* Other */}
                    <Cell minWidth="min-w-[220px]">{a.other_notable ? (isExpanded ? a.other_notable : trunc(a.other_notable, 60)) : <span className="text-gray-300">—</span>}</Cell>
                    {/* Expand arrow */}
                    <td className="px-3 py-2 align-top">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No reels with pattern analysis found</div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows:</span>
              <select value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                {ROWS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
