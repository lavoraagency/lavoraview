"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Eye, Edit3, Trash2, Link as LinkIcon, Files } from "lucide-react";
import { PUBLIC_LINK_DOMAIN, publicUrlForSlug, publicDisplayForSlug } from "@/lib/link-pages/config";

interface PageRow {
  id: string;
  slug: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  background_url: string | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export function LinkPagesListClient({ initialPages }: { initialPages: PageRow[] }) {
  const router = useRouter();
  const [pages, setPages] = useState<PageRow[]>(initialPages);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Duplicate flow state
  const [dupSource, setDupSource] = useState<PageRow | null>(null);
  const [dupSlug, setDupSlug] = useState("");
  const [dupBusy, setDupBusy] = useState(false);
  const [dupError, setDupError] = useState<string | null>(null);

  function startDuplicate(p: PageRow) {
    // Suggest a fresh slug: append "-copy", or "-copy-2", "-copy-3", … if taken.
    const taken = new Set(pages.map(x => x.slug));
    let candidate = `${p.slug}-copy`;
    let n = 2;
    while (taken.has(candidate)) {
      candidate = `${p.slug}-copy-${n}`;
      n++;
    }
    setDupSource(p);
    setDupSlug(candidate);
    setDupError(null);
  }

  async function confirmDuplicate() {
    if (!dupSource) return;
    setDupBusy(true);
    setDupError(null);
    try {
      const r = await fetch("/api/link-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: dupSlug.trim().toLowerCase(), from: dupSource.id }),
      });
      const j = await r.json();
      if (!r.ok) { setDupError(j.error || "Duplicate failed"); return; }
      router.push(`/dashboard/links/${j.page.id}`);
    } finally {
      setDupBusy(false);
    }
  }

  async function createPage() {
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/link-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug.trim().toLowerCase(),
          display_name: newName.trim() || newSlug.trim(),
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Fehler"); return; }
      router.push(`/dashboard/links/${j.page.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function deletePage(id: string) {
    if (!confirm("Delete this page?")) return;
    const r = await fetch(`/api/link-pages/${id}`, { method: "DELETE" });
    if (r.ok) setPages(p => p.filter(x => x.id !== id));
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Link Pages</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            Mobile-first bio pages for Instagram funnels
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <LinkIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <div className="text-sm text-gray-500">No pages yet. Click <b>New Page</b> to create your first one.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map(p => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/dashboard/links/${p.id}`} className="block">
                <div
                  className="h-32 w-full bg-gray-100 relative"
                  style={p.background_url ? {
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url("${p.background_url}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  } : undefined}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-lg font-bold drop-shadow-md">
                      {p.display_name || p.slug}
                    </div>
                  </div>
                  {!p.is_published && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                      Draft
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{publicDisplayForSlug(p.slug)}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Eye className="w-3 h-3" /> {p.view_count}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startDuplicate(p)}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="Duplicate"
                  >
                    <Files className="w-4 h-4" />
                  </button>
                  <a
                    href={publicUrlForSlug(p.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="Public View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Link
                    href={`/dashboard/links/${p.id}`}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deletePage(p.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !creating && setShowCreate(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">New Page</h2>
            <p className="text-xs text-gray-500 mt-1">Comes pre-filled with a default Bouncy-style layout.</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Slug</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-400">{PUBLIC_LINK_DOMAIN} /</span>
                  <input
                    autoFocus
                    value={newSlug}
                    onChange={e => setNewSlug(e.target.value.replace(/[^a-z0-9._-]/gi, "").toLowerCase())}
                    placeholder="stephii"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                    maxLength={40}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">a-z, 0-9, ., -, _, max 40</span>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-700">Display Name (optional)</span>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder={newSlug || "Just Stephanie"}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                />
              </label>

              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createPage}
                disabled={creating || !newSlug.trim()}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dupSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !dupBusy && setDupSource(null)}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Duplicate page</h2>
            <p className="text-xs text-gray-500 mt-1">
              Copy of <span className="font-medium text-gray-700">/{dupSource.slug}</span> — same blocks, theme and images, fresh slug. The linked profile is not copied.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">New slug</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-400">{PUBLIC_LINK_DOMAIN} /</span>
                  <input
                    autoFocus
                    value={dupSlug}
                    onChange={e => setDupSlug(e.target.value.replace(/[^a-z0-9._-]/gi, "").toLowerCase())}
                    placeholder="new-slug"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                    maxLength={40}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">a-z, 0-9, ., -, _, max 40</span>
              </label>

              {dupError && <div className="text-sm text-red-600">{dupError}</div>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDupSource(null)}
                disabled={dupBusy}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDuplicate}
                disabled={dupBusy || !dupSlug.trim()}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {dupBusy ? "Duplicating…" : "Duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
