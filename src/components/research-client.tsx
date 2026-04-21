"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, Heart, MessageCircle, Flame, Plus, X, Pause, Play, Trash2, Users, AlertCircle, Calendar } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ResearchProfile {
  id: string;
  instagram_username: string;
  display_name: string | null;
  followers: number | null;
  profile_pic_url: string | null;
  is_active: boolean;
  last_scraped_at: string | null;
  last_scrape_error: string | null;
  created_at: string;
}

interface TopReelSnapshot {
  id: string;
  research_reel_id: string;
  scraped_at: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  views_delta: number;
  avg_views: number;
  multiplier: number;
  is_top: boolean;
  research_reels: {
    id: string;
    instagram_reel_id: string;
    shortcode: string | null;
    caption: string | null;
    thumbnail_url: string | null;
    reel_url: string | null;
    video_cdn_url: string | null;
    video_storage_url: string | null;
    video_deleted_at: string | null;
    posted_at: string | null;
    research_profile_id: string;
    research_profiles: {
      id: string;
      instagram_username: string;
      display_name: string | null;
      profile_pic_url: string | null;
    } | null;
  } | null;
}

export function ResearchClient({
  profiles,
  topReels,
  date,
}: {
  profiles: ResearchProfile[];
  topReels: TopReelSnapshot[];
  date: string;
}) {
  const [managerOpen, setManagerOpen] = useState(false);

  const activeCount = profiles.filter(p => p.is_active).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Research</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top Reels von beobachteten Creatorn (≥3× Multiplier)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker value={date} />
          <button
            onClick={() => setManagerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Profile verwalten
            <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-semibold">{activeCount}</span>
          </button>
        </div>
      </div>

      {/* Top Reels Grid */}
      {topReels.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Flame className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Keine Top Reels für {formatDate(date)}</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {profiles.length === 0
              ? "Füg zuerst ein Profil hinzu — danach scraped n8n jede Nacht die Reels."
              : activeCount === 0
              ? "Alle Profile sind pausiert. Aktiviere ein Profil im Profil-Manager."
              : "Der Scraper läuft täglich um 00:30 London. Für heute gibt's noch keine Top Reels."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {topReels.map(snap => (
            <ReelCard key={snap.id} snap={snap} />
          ))}
        </div>
      )}

      {managerOpen && (
        <ProfileManagerDrawer
          profiles={profiles}
          onClose={() => setManagerOpen(false)}
        />
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Date Picker ──
function DatePicker({ value }: { value: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg">
      <Calendar className="w-4 h-4 text-gray-400" />
      <input
        type="date"
        value={value}
        onChange={e => {
          if (e.target.value) router.push(`/dashboard/research?date=${e.target.value}`);
        }}
        className="text-sm text-gray-700 focus:outline-none bg-transparent"
      />
    </div>
  );
}

// ── Reel Card ──
function ReelCard({ snap }: { snap: TopReelSnapshot }) {
  const reel = snap.research_reels;
  if (!reel) return null;
  const profile = reel.research_profiles;
  const videoAvailable = reel.video_storage_url && !reel.video_deleted_at;
  const videoUrl = reel.video_storage_url || reel.reel_url || "";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
      <div className="relative aspect-[9/16] bg-gray-100">
        {reel.thumbnail_url ? (
          <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Flame className="w-8 h-8" />
          </div>
        )}
        {/* Multiplier badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white rounded-lg text-xs font-bold shadow-sm">
          <Flame className="w-3 h-3" />
          {snap.multiplier.toFixed(1)}×
        </div>
        {/* Video link */}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
            title={videoAvailable ? "Video abspielen" : "Auf Instagram öffnen"}
          >
            <div className="opacity-0 group-hover:opacity-100 bg-white/90 rounded-full p-3 transition-opacity">
              <Play className="w-5 h-5 text-gray-900 fill-current" />
            </div>
          </a>
        )}
        {/* Deleted video overlay */}
        {reel.video_deleted_at && (
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-gray-800/80 text-white rounded text-xs">
            Video gelöscht
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Profile */}
        {profile && (
          <div className="flex items-center gap-2">
            {profile.profile_pic_url ? (
              <img src={profile.profile_pic_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200" />
            )}
            <span className="text-xs font-medium text-gray-900 truncate">
              @{profile.instagram_username}
            </span>
          </div>
        )}
        {/* Caption */}
        {reel.caption && (
          <p className="text-xs text-gray-600 line-clamp-2">{reel.caption}</p>
        )}
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-600 pt-1">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(snap.views)}</span>
          <span className="flex items-center gap-1 text-orange-600 font-semibold">
            +{formatNumber(snap.views_delta)}
          </span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{formatNumber(snap.likes)}</span>
          {reel.reel_url && (
            <a
              href={reel.reel_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-gray-400 hover:text-gray-700"
              title="Auf Instagram öffnen"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Manager Drawer ──
function ProfileManagerDrawer({
  profiles,
  onClose,
}: {
  profiles: ResearchProfile[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/research/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagram_username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Fehler");
        setAdding(false);
        return;
      }
      setNewUsername("");
      setAdding(false);
      router.refresh();
    } catch (err: any) {
      setAddError(err.message || "Fehler");
      setAdding(false);
    }
  }

  async function togglePause(p: ResearchProfile) {
    setBusyId(p.id);
    try {
      await fetch(`/api/research/profiles/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProfile(p: ResearchProfile) {
    if (!confirm(`Profil @${p.instagram_username} wirklich löschen? Alle zugehörigen Reels und Snapshots werden auch gelöscht.`)) return;
    setBusyId(p.id);
    try {
      await fetch(`/api/research/profiles/${p.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Profile verwalten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-1">Neues Profil hinzufügen</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              placeholder="@username oder instagram.com/username"
              disabled={adding}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={adding || !newUsername.trim()}
              className="flex items-center gap-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {adding ? "..." : "Hinzufügen"}
            </button>
          </div>
          {addError && (
            <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {addError}
            </div>
          )}
        </form>

        {/* Profile list */}
        <div className="flex-1 overflow-y-auto">
          {profiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Noch keine Profile. Füg oben eins hinzu.
            </div>
          ) : (
            <ul className="divide-y">
              {profiles.map(p => (
                <li key={p.id} className="p-4 flex items-center gap-3">
                  {p.profile_pic_url ? (
                    <img src={p.profile_pic_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                      @
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900 truncate">@{p.instagram_username}</span>
                      {!p.is_active && (
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">pausiert</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.followers ? `${formatNumber(p.followers)} Follower` : "Noch nicht gescraped"}
                      {p.last_scraped_at && ` • ${new Date(p.last_scraped_at).toLocaleDateString("de-DE")}`}
                    </div>
                    {p.last_scrape_error && (
                      <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.last_scrape_error}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePause(p)}
                      disabled={busyId === p.id}
                      title={p.is_active ? "Pausieren" : "Aktivieren"}
                      className={cn(
                        "p-2 rounded-lg transition-colors disabled:opacity-50",
                        p.is_active
                          ? "text-gray-600 hover:bg-gray-100"
                          : "text-green-600 hover:bg-green-50"
                      )}
                    >
                      {p.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteProfile(p)}
                      disabled={busyId === p.id}
                      title="Löschen"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
