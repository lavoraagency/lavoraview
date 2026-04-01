"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TagBadge } from "@/components/tag-badge";
import { formatNumber } from "@/lib/utils";
import { AddProfileDialog } from "@/components/add-profile-dialog";
import { cn } from "@/lib/utils";

interface ProfilesClientProps {
  initialProfiles: any[];
  models: any[];
  groups: any[];
}

export function ProfilesClient({ initialProfiles, models, groups }: ProfilesClientProps) {
  const [search, setSearch] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [profiles, setProfiles] = useState(initialProfiles);

  const filtered = profiles.filter(p => {
    if (search && !p.instagram_username.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterModel && p.models?.id !== filterModel) return false;
    if (filterGroup && p.account_groups?.id !== filterGroup) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 text-sm mt-1">{profiles.length} Profile insgesamt</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Profile
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Username suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={filterModel}
          onChange={e => setFilterModel(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alle Models</option>
          {models.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alle Gruppen</option>
          {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">Alle Status</option>
          <option value="working">Working</option>
          <option value="suspended">Suspended</option>
          <option value="48h_waiting">48h Waiting</option>
          <option value="account_status_problem">Status Problem</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gruppe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Followers</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr
                  key={p.id}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    !p.is_active && "opacity-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/profiles/${p.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      @{p.instagram_username}
                    </Link>
                    {p.va_name && <div className="text-xs text-gray-400">VA: {p.va_name}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.models?.name || "-"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.account_groups?.name || "-"}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">
                    {p.latestFollowers != null ? formatNumber(p.latestFollowers) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {p.latestViews != null ? formatNumber(p.latestViews) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags || []).slice(0, 3).map((tag: string) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                      {(p.tags || []).length > 3 && (
                        <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Keine Profile gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} von {profiles.length} Profilen
        </div>
      </div>

      {showAddDialog && (
        <AddProfileDialog
          models={models}
          groups={groups}
          onClose={() => setShowAddDialog(false)}
          onAdded={(newProfile) => {
            setProfiles(prev => [...prev, newProfile]);
            setShowAddDialog(false);
          }}
        />
      )}
    </div>
  );
}
