"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp, ArrowDown, Trash2, Plus, Image as ImageIcon, Upload, ExternalLink,
  ChevronDown, ChevronRight, Save, Loader2, Eye, EyeOff, Type, MousePointerClick, ImagePlus,
} from "lucide-react";
import { LinkPageRender } from "@/components/link-page-render";
import {
  Block, ImageCardBlock, LinkButtonBlock, LinkPage, ProfileHeaderBlock,
  SocialsRowBlock, SpacerBlock, newBlockId,
} from "@/lib/link-pages/types";
import { cn } from "@/lib/utils";

const ICON_OPTIONS = [
  { value: "of", label: "OnlyFans" },
  { value: "fansly", label: "Fansly" },
  { value: "telegram", label: "Telegram" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "tiktok", label: "TikTok" },
  { value: "custom", label: "Custom URL" },
  { value: "", label: "Generic / None" },
];

// ── Image upload widget ────────────────────────────────────────────
function ImageInput({
  value, onChange, pageId, label,
}: { value: string | null | undefined; onChange: (url: string | null) => void; pageId: string; label?: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page_id", pageId);
      const r = await fetch("/api/link-pages/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (r.ok && j.url) onChange(j.url);
      else alert(j.error || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label && <div className="text-xs font-medium text-gray-700 mb-1">{label}</div>}
      <div className="flex items-center gap-2">
        {value ? (
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-8 h-8 rounded object-cover" />
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="flex-1 bg-transparent text-xs text-gray-700 focus:outline-none truncate"
            />
            <button onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <input
            value=""
            placeholder="Bild-URL oder Datei hochladen"
            onChange={e => onChange(e.target.value || null)}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-400"
          />
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          title="Datei hochladen"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}

// ── Block inspector forms ──────────────────────────────────────────
function HeaderInspector({ block, onChange }: { block: ProfileHeaderBlock; onChange: (b: ProfileHeaderBlock) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <input value={block.title || ""} onChange={e => onChange({ ...block, title: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="Just Stephanie 😊" />
      </Field>
      <Field label="Subtitle">
        <input value={block.subtitle || ""} onChange={e => onChange({ ...block, subtitle: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="@stephaniesteward" />
      </Field>
      <Field label="Meta-Zeile (optional)">
        <input value={block.meta || ""} onChange={e => onChange({ ...block, meta: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="19y/o 📍 Houston | texas 🌴" />
      </Field>
    </div>
  );
}

function LinkInspector({ block, onChange, pageId }: { block: LinkButtonBlock; onChange: (b: LinkButtonBlock) => void; pageId: string }) {
  return (
    <div className="space-y-3">
      <Field label="Title">
        <input value={block.title} onChange={e => onChange({ ...block, title: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="Onlyfans" />
      </Field>
      <Field label="URL">
        <input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="https://onlyfans.com/username" />
      </Field>
      <Field label="Icon">
        <select value={block.icon || ""} onChange={e => onChange({ ...block, icon: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 bg-white">
          {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      {block.icon === "custom" && (
        <ImageInput
          label="Custom Icon"
          value={block.iconUrl}
          onChange={url => onChange({ ...block, iconUrl: url || undefined })}
          pageId={pageId}
        />
      )}
    </div>
  );
}

function ImageCardInspector({ block, onChange, pageId }: { block: ImageCardBlock; onChange: (b: ImageCardBlock) => void; pageId: string }) {
  return (
    <div className="space-y-3">
      <Field label="Title (Overlay)">
        <input value={block.title} onChange={e => onChange({ ...block, title: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="Lets become friends! 😋" />
      </Field>
      <Field label="URL">
        <input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="https://..." />
      </Field>
      <ImageInput
        label="Background Image"
        value={block.imageUrl}
        onChange={url => onChange({ ...block, imageUrl: url || "" })}
        pageId={pageId}
      />
      <Field label="Overlay-Icon (oben rechts)">
        <select value={block.overlayIcon || ""} onChange={e => onChange({ ...block, overlayIcon: e.target.value || undefined })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 bg-white">
          <option value="">Kein Icon</option>
          {ICON_OPTIONS.filter(o => o.value && o.value !== "custom").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
    </div>
  );
}

function SocialsInspector({ block, onChange }: { block: SocialsRowBlock; onChange: (b: SocialsRowBlock) => void }) {
  return (
    <div className="space-y-2">
      {(block.items || []).map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <select value={it.platform} onChange={e => {
            const items = [...block.items]; items[i] = { ...it, platform: e.target.value }; onChange({ ...block, items });
          }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
            {ICON_OPTIONS.filter(o => o.value && o.value !== "custom").map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input value={it.url} onChange={e => {
            const items = [...block.items]; items[i] = { ...it, url: e.target.value }; onChange({ ...block, items });
          }} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" placeholder="https://..." />
          <button onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={() => onChange({ ...block, items: [...(block.items || []), { platform: "instagram", url: "" }] })} className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700">
        <Plus className="w-3.5 h-3.5" /> Add Social
      </button>
    </div>
  );
}

function SpacerInspector({ block, onChange }: { block: SpacerBlock; onChange: (b: SpacerBlock) => void }) {
  return (
    <Field label="Höhe (px)">
      <input type="number" min={4} max={120} value={block.height || 12} onChange={e => onChange({ ...block, height: parseInt(e.target.value) || 12 })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400" />
    </Field>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700 block mb-1">{label}</span>
      {children}
    </label>
  );
}

// ── Block list item ────────────────────────────────────────────────
function BlockListItem({
  block, expanded, onToggle, onChange, onMoveUp, onMoveDown, onDelete, pageId, isFirst, isLast,
}: {
  block: Block;
  expanded: boolean;
  onToggle: () => void;
  onChange: (b: Block) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  pageId: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const summary = blockSummary(block);
  const Icon = blockIcon(block.type);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center px-3 py-2 gap-2 hover:bg-gray-50/50">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">{summary.title}</div>
            {summary.subtitle && <div className="text-xs text-gray-400 truncate">{summary.subtitle}</div>}
          </div>
        </button>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUp className="w-4 h-4" /></button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDown className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50/30">
          {block.type === "header"     && <HeaderInspector block={block} onChange={onChange as any} />}
          {block.type === "link"       && <LinkInspector block={block} onChange={onChange as any} pageId={pageId} />}
          {block.type === "image-card" && <ImageCardInspector block={block} onChange={onChange as any} pageId={pageId} />}
          {block.type === "socials"    && <SocialsInspector block={block} onChange={onChange as any} />}
          {block.type === "spacer"     && <SpacerInspector block={block} onChange={onChange as any} />}
        </div>
      )}
    </div>
  );
}

function blockSummary(b: Block): { title: string; subtitle?: string } {
  switch (b.type) {
    case "header":      return { title: "Header", subtitle: (b.title || b.subtitle || b.meta || "").slice(0, 60) };
    case "link":        return { title: b.title || "Link Button", subtitle: b.url || "no url" };
    case "image-card":  return { title: b.title || "Image Card", subtitle: b.url || "no url" };
    case "socials":     return { title: "Social Row", subtitle: `${(b.items || []).length} items` };
    case "spacer":      return { title: "Spacer", subtitle: `${b.height || 12}px` };
  }
}

function blockIcon(type: Block["type"]) {
  switch (type) {
    case "header":      return Type;
    case "link":        return MousePointerClick;
    case "image-card":  return ImagePlus;
    case "socials":     return ExternalLink;
    case "spacer":      return ChevronDown;
  }
}

// ── Add-Block menu ────────────────────────────────────────────────
function AddBlockMenu({ onAdd }: { onAdd: (b: Block) => void }) {
  const [open, setOpen] = useState(false);

  const options: { type: Block["type"]; label: string; create: () => Block }[] = [
    { type: "link",       label: "Link Button",  create: () => ({ id: newBlockId(), type: "link",       title: "Neuer Link", url: "", icon: "of" }) },
    { type: "image-card", label: "Image Card",   create: () => ({ id: newBlockId(), type: "image-card", title: "Klick mich", url: "", imageUrl: "" }) },
    { type: "socials",    label: "Socials Row",  create: () => ({ id: newBlockId(), type: "socials",    items: [{ platform: "instagram", url: "" }] }) },
    { type: "spacer",     label: "Spacer",       create: () => ({ id: newBlockId(), type: "spacer",     height: 16 }) },
    { type: "header",     label: "Header",       create: () => ({ id: newBlockId(), type: "header" }) },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 hover:text-brand-600 text-gray-500 text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Block hinzufügen
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 left-1/2 -translate-x-1/2 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {options.map(o => (
              <button
                key={o.type}
                onClick={() => { onAdd(o.create()); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                {(() => { const I = blockIcon(o.type); return <I className="w-4 h-4 text-gray-500" />; })()}
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────
export function LinkEditorClient({ initialPage }: { initialPage: LinkPage }) {
  const router = useRouter();
  const [page, setPage] = useState<LinkPage>(initialPage);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mark dirty on any page mutation
  function update<K extends keyof LinkPage>(patch: Partial<LinkPage>) {
    setPage(p => ({ ...p, ...patch }));
    setDirty(true);
  }

  function updateBlocks(next: Block[]) { update({ blocks: next }); }

  function moveBlock(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= page.blocks.length) return;
    const next = [...page.blocks];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateBlocks(next);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`/api/link-pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: page.slug,
          display_name: page.display_name,
          bio: page.bio,
          avatar_url: page.avatar_url,
          background_url: page.background_url,
          blocks: page.blocks,
          theme: page.theme,
          is_published: page.is_published,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setSaveError(j.error || "Fehler beim Speichern"); return; }
      setPage(j.page);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  // Warn if user navigates away with unsaved changes
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const previewPage: LinkPage = useMemo(() => ({ ...page }), [page]);

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 md:px-6 py-3 border-b border-gray-200 bg-white">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button onClick={() => router.push("/dashboard/links")} className="hover:text-gray-700">Link Pages</button>
            <span>/</span>
            <span className="text-gray-700 font-medium">/{page.slug}</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 truncate">{page.display_name || page.slug}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => update({ is_published: !page.is_published })}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              page.is_published ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
            )}
          >
            {page.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {page.is_published ? "Published" : "Draft"}
          </button>
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Public
          </a>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      {saveError && <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{saveError}</div>}

      {/* Body: form left, preview right */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,minmax(360px,440px)] gap-6 p-4 md:p-6">
          {/* Left: form */}
          <div className="space-y-5 min-w-0">
            <Section title="Page">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Slug">
                  <input
                    value={page.slug}
                    onChange={e => update({ slug: e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase() })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                    maxLength={40}
                  />
                </Field>
                <Field label="Display Name">
                  <input
                    value={page.display_name || ""}
                    onChange={e => update({ display_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400"
                  />
                </Field>
              </div>
              <Field label="Bio">
                <textarea
                  value={page.bio || ""}
                  onChange={e => update({ bio: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 resize-none"
                />
              </Field>
            </Section>

            <Section title="Background">
              <ImageInput
                label="Vollflächiges Hintergrundbild (Bouncy-Style)"
                value={page.background_url}
                onChange={url => update({ background_url: url })}
                pageId={page.id}
              />
              <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                Tipp: Ein hochformatiges Foto funktioniert am besten — wird automatisch mit dunklem Verlauf nach unten überlagert für Lesbarkeit.
              </div>
            </Section>

            <Section title="Blocks">
              <div className="space-y-2">
                {(page.blocks || []).map((b, i) => (
                  <BlockListItem
                    key={b.id}
                    block={b}
                    expanded={expandedBlock === b.id}
                    onToggle={() => setExpandedBlock(expandedBlock === b.id ? null : b.id)}
                    onChange={(nb) => updateBlocks(page.blocks.map(x => x.id === b.id ? nb : x))}
                    onMoveUp={() => moveBlock(i, -1)}
                    onMoveDown={() => moveBlock(i, 1)}
                    onDelete={() => updateBlocks(page.blocks.filter(x => x.id !== b.id))}
                    pageId={page.id}
                    isFirst={i === 0}
                    isLast={i === page.blocks.length - 1}
                  />
                ))}
                <AddBlockMenu onAdd={(b) => { updateBlocks([...page.blocks, b]); setExpandedBlock(b.id); }} />
              </div>
            </Section>
          </div>

          {/* Right: preview */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="text-xs font-medium text-gray-500 mb-2 text-center">Live Preview</div>
            <div className="mx-auto rounded-[40px] border-[10px] border-gray-900 overflow-hidden bg-black shadow-2xl"
                 style={{ width: 360, maxWidth: "100%", aspectRatio: "9/19", maxHeight: "calc(100vh - 160px)" }}>
              <div className="w-full h-full overflow-y-auto">
                <LinkPageRender page={previewPage} isPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm font-bold text-gray-900 mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
