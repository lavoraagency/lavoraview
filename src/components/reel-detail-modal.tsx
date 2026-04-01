"use client";

import { X, ExternalLink, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber, formatDate, formatDateShort } from "@/lib/utils";
import Image from "next/image";

export function ReelDetailModal({ reel, onClose, viralThreshold }: {
  reel: any; onClose: () => void; viralThreshold: number;
}) {
  const snapshots = (reel.reel_snapshots || [])
    .sort((a: any, b: any) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime())
    .map((s: any) => ({ date: formatDateShort(s.scraped_at), views: s.views, delta: s.views_delta }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900">Reel Details</h2>
            {reel.is_viral_tracked && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3" /> Viral
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {reel.reel_url && (
              <a href={reel.reel_url} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-600">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            {reel.thumbnail_url && (
              <div className="relative w-24 aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image src={reel.thumbnail_url} alt="Reel" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="space-y-2">
              {reel.caption && (
                <p className="text-sm text-gray-600 line-clamp-3">{reel.caption}</p>
              )}
              <div className="text-xs text-gray-400">
                Gepostet: {reel.posted_at ? formatDate(reel.posted_at) : "Unbekannt"}
              </div>
              <div className="text-xs text-gray-400">
                Viral Threshold: {formatNumber(viralThreshold)} views/Tag
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Views", value: reel.current_views, icon: "👁️" },
              { label: "Likes", value: reel.current_likes, icon: "❤️" },
              { label: "Comments", value: reel.current_comments, icon: "💬" },
              { label: "Shares", value: reel.current_shares, icon: "📤" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">{s.icon}</div>
                <div className="font-bold text-gray-900 text-sm">{formatNumber(s.value)}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">Views Heute: </span>
            <span className={reel.last_daily_views >= viralThreshold ? "text-orange-600 font-bold" : ""}>
              +{formatNumber(reel.last_daily_views)}
              {reel.last_daily_views >= viralThreshold && " 🔥"}
            </span>
          </div>

          {/* View History Chart */}
          {snapshots.length > 1 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">View-Verlauf</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => formatNumber(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [formatNumber(v as number), "Views"]} />
                  <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
