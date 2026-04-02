"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ExternalLink, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
  const working = profiles.filter(p => p.status === "working" && p.is_active).length;
  const pct = Math.round((working / profiles.length) * 100);
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

function GroupTable({
  groupName,
  profiles,
  tags,
}: {
  groupName: string;
  profiles: any[];
  tags: any[];
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {(p.tags || []).slice(0, 3).map((tag: string) => (
                      <TagBadge key={tag} tag={tag} color={tagColorMap[tag]} />
                    ))}
                    {(p.tags || []).length > 3 && (
                      <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs">
                  {formatUpdatedAt(p.latestScrapedAt)}
                </td>
              </tr>
            ))}
            {profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
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
  const profiles = initialProfiles;

  // Apply global filters
  const filtered = useMemo(() => {
    return profiles.filter(p => {
      if (search && !p.instagram_username.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [profiles, search, filterStatus]);

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
        <p className="text-gray-500 text-sm mt-1">{profiles.length} profiles across {groups.length} groups</p>
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
            tags={tags}
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
