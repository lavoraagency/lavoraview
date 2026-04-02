"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, ExternalLink, ChevronLeft, ChevronRight, Sparkles, Plus, X, Check } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TagBadge } from "@/components/tag-badge";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProfilesClientProps {
  initialProfiles: any[];
  models: any[];
  groups: any[];
  tags: any[];
}

function getHealthBadge(profiles: any[]) {
  if (profiles.length === 0) return { label: "No Data", pct: 0, className: "bg-gray-100 text-gray-600 border-gray-200" };
  const relevant = profiles.filter(p => p.status === "working" || p.status === "account_status_problem");
  if (relevant.length === 0) return { label: "No Data", pct: 0, className: "bg-gray-100 text-gray-600 border-gray-200" };
  const working = relevant.filter(p => p.status === "working").length;
  const pct = Math.round((working / relevant.length) * 100);
  if (pct === 100) return { label: "Excellent", pct, className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (pct >= 75) return { label: "Good", pct, className: "bg-green-50 text-green-700 border-green-200" };
  if (pct >= 50) return { label: "Fair", pct, className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return { label: "Poor", pct, className: "bg-red-50 text-red-700 border-red-200" };
}

function formatUpdatedAt(date: string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day}. ${month}, ${hours}:${mins}`;
}

// Tag editor dropdown for a single profile
function TagEditor({
  profileId,
  currentTags,
  allTags,
  tagColorMap,
  onUpdate,
}: {
  profileId: string;
  currentTags: string[];
  allTags: { id: string; name: string; color: string | null }[];
  tagColorMap: Record<string, string>;
  onUpdate: (profileId: string, newTags: string[], allTags?: any[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function toggleTag(tagName: string) {
    setSaving(true);
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, tags: newTags }),
    });
    const data = await res.json();
    onUpdate(profileId, newTags, data.allTags);
    setSaving(false);
  }

  async function addNewTag() {
    const name = newTagName.trim();
    if (!name) return;
    setSaving(true);

    const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    const newTags = [...currentTags, existing?.name || name];

    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        tags: newTags,
        newTag: existing ? null : { name },
      }),
    });
    const data = await res.json();
    onUpdate(profileId, newTags, data.allTags);
    setNewTagName("");
    setSaving(false);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap gap-1 items-center">
        {currentTags.map(tag => (
          <TagBadge
            key={tag}
            tag={tag}
            color={tagColorMap[tag]}
            onRemove={() => toggleTag(tag)}
          />
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          title="Tags bearbeiten"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px] py-1">
          {/* Existing tags to toggle */}
          <div className="max-h-48 overflow-y-auto">
            {allTags.map(t => {
              const isActive = currentTags.includes(t.name);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.name)}
                  disabled={saving}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                    style={{
                      backgroundColor: isActive ? (t.color || "#6366f1") : "transparent",
                      borderColor: t.color || "#6366f1",
                    }}
                  />
                  <span className="text-sm text-gray-700 flex-1">{t.name}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-brand-500" />}
                </button>
              );
            })}
          </div>

          {/* Create new tag */}
          <div className="border-t border-gray-100 px-3 py-2">
            <form
              onSubmit={e => { e.preventDefault(); addNewTag(); }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="New tag..."
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!newTagName.trim() || saving}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupTable({
  groupName,
  profiles,
  tags,
  onTagUpdate,
}: {
  groupName: string;
  profiles: any[];
  tags: any[];
  onTagUpdate: (profileId: string, newTags: string[], allTags?: any[]) => void;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const health = getHealthBadge(profiles);
  const totalPages = Math.max(1, Math.ceil(profiles.length / rowsPerPage));
  const paged = profiles.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Build tag color map
  const tagColorMap: Record<string, string> = {};
  for (const t of tags) {
    tagColorMap[t.name] = t.color;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Group Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {profiles.length} {profiles.length === 1 ? "Profile" : "Profiles"}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{groupName}</h2>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            health.className
          )}>
            <Sparkles className="w-3 h-3" />
            {health.label} | {health.pct}%
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Followers</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Posts</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.map(p => (
              <tr
                key={p.id}
                className={cn(
                  "hover:bg-gray-50/50 transition-colors",
                  !p.is_active && "opacity-50"
                )}
              >
                <td className="px-5 py-3.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/profiles/${p.id}`}
                      className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                    >
                      @{p.instagram_username}
                    </Link>
                    <a
                      href={`https://www.instagram.com/${p.instagram_username}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-brand-500 transition-colors"
                      title="Auf Instagram öffnen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right font-medium text-gray-700">
                  {p.latestFollowers != null ? formatNumber(p.latestFollowers) : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-5 py-3.5 text-right text-gray-500">
                  {p.latestPosts != null ? p.latestPosts : <span className="text-gray-300">-</span>}
                </td>
                <td className="px-5 py-3.5">
                  <TagEditor
                    profileId={p.id}
                    currentTags={p.tags || []}
                    allTags={tags}
                    tagColorMap={tagColorMap}
                    onUpdate={onTagUpdate}
                  />
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {formatUpdatedAt(p.latestScrapedAt)}
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                  Keine Profile in dieser Gruppe
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
        <div className="text-xs text-gray-400">
          {profiles.length} {profiles.length === 1 ? "profile" : "profiles"} total
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
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
    </div>
  );
}

export function ProfilesClient({ initialProfiles, models, groups, tags }: ProfilesClientProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [profilesState, setProfilesState] = useState(initialProfiles);
  const [tagsState, setTagsState] = useState(tags);

  // Handle tag updates from TagEditor
  function handleTagUpdate(profileId: string, newTags: string[], allTags?: any[]) {
    setProfilesState(prev =>
      prev.map(p => p.id === profileId ? { ...p, tags: newTags } : p)
    );
    // Refresh full tags list from API response if provided
    if (allTags) {
      setTagsState(allTags);
    }
  }

  // Apply global filters
  const filtered = useMemo(() => {
    return profilesState.filter(p => {
      if (search && !p.instagram_username.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [profilesState, search, filterStatus]);

  // Group by account_groups
  const grouped = useMemo(() => {
    const map = new Map<string, { group: any; profiles: any[] }>();

    // Initialize all groups
    for (const g of groups) {
      map.set(g.id, { group: g, profiles: [] });
    }

    const unassigned: any[] = [];

    for (const p of filtered) {
      const groupId = p.account_groups?.id;
      if (groupId && map.has(groupId)) {
        map.get(groupId)!.profiles.push(p);
      } else {
        unassigned.push(p);
      }
    }

    // Sort profiles within each group by followers descending
    const allGroups = Array.from(map.values());
    for (const g of allGroups) {
      g.profiles.sort((a: any, b: any) => (b.latestFollowers || 0) - (a.latestFollowers || 0));
    }
    unassigned.sort((a: any, b: any) => (b.latestFollowers || 0) - (a.latestFollowers || 0));

    const result = allGroups.filter(g => g.profiles.length > 0);

    if (unassigned.length > 0) {
      result.push({ group: { id: "unassigned", name: "Unassigned" }, profiles: unassigned });
    }

    return result;
  }, [filtered, groups]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profiles</h1>
        <p className="text-gray-500 text-sm mt-1">{profilesState.length} profiles across {groups.length} groups</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          <option value="working">Working</option>
          <option value="suspended">Suspended</option>
          <option value="48h_waiting">48h Waiting</option>
          <option value="account_status_problem">Status Problem</option>
        </select>
      </div>

      {/* Account Groups */}
      <div className="space-y-6">
        {grouped.map(g => (
          <GroupTable
            key={g.group.id}
            groupName={g.group.name}
            profiles={g.profiles}
            tags={tagsState}
            onTagUpdate={handleTagUpdate}
          />
        ))}
        {grouped.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Keine Profile gefunden
          </div>
        )}
      </div>
    </div>
  );
}
