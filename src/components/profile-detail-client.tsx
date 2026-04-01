"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Flame, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatusBadge } from "@/components/status-badge";
import { TagBadge } from "@/components/tag-badge";
import { formatNumber, formatDate, formatDateShort } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ReelDetailModal } from "@/components/reel-detail-modal";

export function ProfileDetailClient({ profile, reels, snapshots, allTags }: {
  profile: any; reels: any[]; snapshots: any[]; allTags: any[];
}) {
  const [tags, setTags] = useState<string[]>(profile.tags || []);
  const [selectedReel, setSelectedReel] = useState<any | null>(null);
  const [tagInput, setTagInput] = useState("");

  const viralThreshold = profile.models?.viral_view_threshold || 500;
  const latestSnap = snapshots[snapshots.length - 1];

  const chartData = snapshots.map(s => ({
    date: formatDateShort(s.scraped_at),
    followers: s.followers,
    views: s.total_reel_views,
  }));

  async function addTag(tagName: string) {
    const newTags = Array.from(new Set([...tags, tagName]));
    setTags(newTags);
    const supabase = createClient();
    await supabase.from("profiles").update({ tags: newTags }).eq("id", profile.id);
  }

  async function removeTag(tagName: string) {
    const newTags = tags.filter(t => t !== tagName);
    setTags(newTags);
    const supabase = createClient();
    await supabase.from("profiles").update({ tags: newTags }).eq("id", profile.id);
  }

  const availableTags = allTags.filter((t: any) => !tags.includes(t.name));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/profiles" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">@{profile.instagram_username}</h1>
            <StatusBadge status={profile.status} />
            <a
              href={`https://www.instagram.com/${profile.instagram_username}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
            {profile.models?.name && <span>Model: <strong>{profile.models.name}</strong></span>}
            {profile.account_groups?.name && <span>Gruppe: <strong>{profile.account_groups.name}</strong></span>}
            {profile.va_name && <span>VA: <strong>{profile.va_name}</strong></span>}
            {profile.editor_name && <span>Editor: <strong>{profile.editor_name}</strong></span>}
            {latestSnap?.followers != null && (
              <span className="font-semibold text-gray-900">{formatNumber(latestSnap.followers)} Followers</span>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {tags.map(tag => {
              const tagObj = allTags.find((t: any) => t.name === tag);
              return <TagBadge key={tag} tag={tag} color={tagObj?.color} onRemove={() => removeTag(tag)} />;
            })}
            {availableTags.length > 0 && (
              <div className="relative">
                <select
                  value=""
                  onChange={e => { if (e.target.value) addTag(e.target.value); }}
                  className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full text-gray-400 hover:border-brand-400 focus:outline-none bg-white cursor-pointer"
                >
                  <option value="">+ Tag hinzufügen</option>
                  {availableTags.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Follower-Verlauf</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [formatNumber(v as number), "Followers"]} />
                <Line type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Reel Views-Verlauf</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [formatNumber(v as number), "Views"]} />
                <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Reels Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Reels ({reels.length})</h2>
          <span className="text-xs text-gray-400">Klicke auf ein Reel für Details</span>
        </div>
        {reels.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            Noch keine Reels getrackt. Führe den Instagram-Scraping-Workflow aus.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
            {reels.map(reel => (
              <button
                key={reel.id}
                onClick={() => setSelectedReel(reel)}
                className="group relative aspect-[9/16] bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-brand-400 transition-all"
              >
                {reel.thumbnail_url ? (
                  <Image
                    src={reel.thumbnail_url}
                    alt={reel.caption || "Reel"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882V15.12a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                    </svg>
                  </div>
                )}
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Viral badge */}
                {reel.is_viral_tracked && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1">
                    <Flame className="w-3 h-3" />
                  </div>
                )}
                {/* Stats */}
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-white text-xs font-bold">{formatNumber(reel.current_views)} views</div>
                  <div className="text-white/70 text-xs">{formatNumber(reel.current_likes)} ❤️</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedReel && (
        <ReelDetailModal reel={selectedReel} onClose={() => setSelectedReel(null)} viralThreshold={viralThreshold} />
      )}
    </div>
  );
}
