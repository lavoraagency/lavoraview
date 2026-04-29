"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp, ArrowDown, Trash2, Plus, Image as ImageIcon, Upload, ExternalLink,
  ChevronDown, ChevronRight, Save, Loader2, Eye, EyeOff, Type, MousePointerClick, ImagePlus,
  Copy, Check, X, Crop,
} from "lucide-react";
import { PUBLIC_LINK_DOMAIN, publicUrlForSlug, publicDisplayForSlug } from "@/lib/link-pages/config";
import { LinkPageRender } from "@/components/link-page-render";
import { CropModal, AspectKey } from "@/components/link-pages/crop-modal";
import {
  Block, ImageCardBlock, LinkButtonBlock, LinkPage, PhotoAspectKey, ProfileHeaderBlock,
  ProfileLite, SocialsRowBlock, SpacerBlock, newBlockId,
} from "@/lib/link-pages/types";
import { suggestProfile } from "@/lib/link-pages/profile-match";
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
// When `cropAspect` is provided, uploads go through the CropModal
// first. The pristine source is uploaded as the original (so re-crop
// later can work with every pixel) and a separate cropped JPEG is
// uploaded for rendering.
//
// onChange receives a single update object. Either field can be
// undefined (= unchanged) so the parent can apply both mutations in
// one render pass — important for nested state like blocks where two
// successive setState calls would race against the same stale block.
type ImageInputUpdate = { url?: string | null; originalUrl?: string | null };

function ImageInput({
  value, originalValue, onChange, pageId, label, cropAspect, onAspectChange, allowAspectChange,
}: {
  value: string | null | undefined;
  originalValue?: string | null;
  onChange: (u: ImageInputUpdate) => void;
  pageId: string;
  label?: string;
  cropAspect?: AspectKey;
  /** Called when the user changes the aspect inside the cropper. */
  onAspectChange?: (a: AspectKey) => void;
  allowAspectChange?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  // The File object the user picked, kept in memory until the cropper
  // confirms — so we can upload it as the "original" alongside the crop.
  const pendingFileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadBlob(blob: Blob | File): Promise<string | null> {
    const fd = new FormData();
    const file = blob instanceof File ? blob : new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });
    fd.append("file", file);
    fd.append("page_id", pageId);
    const r = await fetch("/api/link-pages/upload", { method: "POST", body: fd });
    const j = await r.json();
    if (r.ok && j.url) return j.url as string;
    alert(j.error || "Upload failed");
    return null;
  }

  function handleFile(file: File) {
    if (cropAspect) {
      // Hold on to the File so we can upload it as the original on confirm.
      pendingFileRef.current = file;
      const url = URL.createObjectURL(file);
      setCropSrc(url);
    } else {
      setUploading(true);
      uploadBlob(file).then((url) => {
        if (url) onChange({ url });
        setUploading(false);
      });
    }
  }

  async function handleCropConfirm(blob: Blob, aspect: AspectKey) {
    setUploading(true);
    try {
      onAspectChange?.(aspect);

      const pending = pendingFileRef.current;
      if (pending) {
        // Fresh upload: persist BOTH the pristine source and the cropped
        // version so re-cropping later starts from the full original.
        // Single onChange so the parent applies both URLs atomically.
        const [origUrl, cropUrl] = await Promise.all([
          uploadBlob(pending),
          uploadBlob(blob),
        ]);
        const update: ImageInputUpdate = {};
        if (cropUrl) update.url = cropUrl;
        if (origUrl) update.originalUrl = origUrl;
        if (Object.keys(update).length > 0) onChange(update);
      } else {
        // Re-crop of an existing image — only the cropped version is
        // re-uploaded; the original on Storage stays as-is.
        const cropUrl = await uploadBlob(blob);
        if (cropUrl) onChange({ url: cropUrl });
      }
    } finally {
      pendingFileRef.current = null;
      if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      setUploading(false);
    }
  }

  function handleCropCancel() {
    pendingFileRef.current = null;
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleRecrop() {
    // Prefer the pristine source; fall back to the cropped URL for legacy
    // pages that were uploaded before the original was tracked.
    const src = originalValue || value;
    if (src) setCropSrc(src);
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
              onChange={e => onChange({ url: e.target.value })}
              className="flex-1 bg-transparent text-xs text-gray-700 focus:outline-none truncate"
            />
            {cropAspect && (
              <button
                onClick={handleRecrop}
                className="text-gray-400 hover:text-brand-500 transition-colors"
                title="Re-crop"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onChange({ url: null, originalUrl: null })}
              className="text-gray-400 hover:text-red-500"
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <input
            value=""
            placeholder="Image URL or upload a file"
            onChange={e => onChange({ url: e.target.value || null })}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-400"
          />
        )}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          title="Upload a file"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-500" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
      </div>

      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          defaultAspect={cropAspect || "4:3"}
          allowAspectChange={allowAspectChange ?? true}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
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
      <Field label="Meta line (optional)">
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
          onChange={({ url }) => {
            if (url !== undefined) onChange({ ...block, iconUrl: url || undefined });
          }}
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
        originalValue={block.imageOriginalUrl || null}
        onChange={({ url, originalUrl }) => {
          // Apply both fields in a single block update so the trash
          // button (which clears both at once) doesn't race against a
          // stale `block` closure on the second setState.
          const next = { ...block };
          if (url !== undefined) next.imageUrl = url || "";
          if (originalUrl !== undefined) next.imageOriginalUrl = originalUrl || undefined;
          onChange(next);
        }}
        pageId={pageId}
        cropAspect="4:3"
        allowAspectChange={false}
      />
      <Field label="Overlay icon (top right)">
        <select value={block.overlayIcon || ""} onChange={e => onChange({ ...block, overlayIcon: e.target.value || undefined })} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400 bg-white">
          <option value="">No icon</option>
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
    <Field label="Height (px)">
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

  // Close drawer on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const options: { type: Block["type"]; label: string; sub: string; create: () => Block }[] = [
    {
      type: "link",
      label: "Text Button",
      sub: "Icon + title + URL (compact)",
      create: () => ({ id: newBlockId(), type: "link", title: "New link", url: "", icon: "of" }),
    },
    {
      type: "image-card",
      label: "Image Button",
      sub: "Large button with background image",
      create: () => ({ id: newBlockId(), type: "image-card", title: "Click me", url: "", imageUrl: "" }),
    },
    {
      type: "socials",
      label: "Socials Row",
      sub: "Row of small icons",
      create: () => ({ id: newBlockId(), type: "socials", items: [{ platform: "instagram", url: "" }] }),
    },
    {
      type: "spacer",
      label: "Spacer",
      sub: "Vertical spacing",
      create: () => ({ id: newBlockId(), type: "spacer", height: 16 }),
    },
    {
      type: "header",
      label: "Header",
      sub: "Name + bio over the photo",
      create: () => ({ id: newBlockId(), type: "header" }),
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 hover:text-brand-600 text-gray-500 text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" /> Add block
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full md:w-96 max-h-[80vh] bg-white rounded-t-2xl md:rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Add block</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              {options.map(o => (
                <button
                  key={o.type}
                  onClick={() => { onAdd(o.create()); setOpen(false); }}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-50 last:border-b-0"
                >
                  {(() => { const I = blockIcon(o.type); return <I className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />; })()}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900">{o.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{o.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Profile picker ─────────────────────────────────────────────────
function ProfilePicker({
  profiles,
  value,
  slug,
  suggested,
  onChange,
}: {
  profiles: ProfileLite[];
  value: string | null;
  slug: string;
  suggested: { profile: ProfileLite; score: number } | null;
  onChange: (id: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = profiles.find(p => p.id === value) || null;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles.slice(0, 100);
    return profiles
      .filter(p =>
        p.instagram_username.toLowerCase().includes(q) ||
        (p.model_name || "").toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [profiles, search]);

  const showSuggestion = !value && suggested && slug.length > 0;

  return (
    <div className="space-y-2">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm transition-colors",
            selected ? "border-gray-200 bg-white" : "border-dashed border-gray-300 bg-gray-50 text-gray-500",
          )}
        >
          {selected ? (
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-900 truncate">{selected.instagram_username}</span>
              {selected.model_name && (
                <span className="text-xs text-gray-400 truncate">— {selected.model_name}</span>
              )}
            </span>
          ) : (
            <span className="truncate">No profile linked — pick one to assign</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {open && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search profiles…"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-brand-400"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <button
                onClick={() => { onChange(null); setOpen(false); }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-b border-gray-50",
                  !value ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50 text-gray-500",
                )}
              >
                <span className="italic">No profile</span>
              </button>
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No matches</div>
              )}
              {filtered.map(p => {
                const isSelected = p.id === value;
                const isSuggested = suggested?.profile.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { onChange(p.id); setOpen(false); setSearch(""); }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center gap-2 border-b border-gray-50 last:border-b-0",
                      isSelected ? "bg-brand-50 text-brand-700" : "hover:bg-gray-50",
                    )}
                  >
                    <span className="font-medium text-gray-900 truncate flex-1">{p.instagram_username}</span>
                    {p.model_name && (
                      <span className="text-xs text-gray-400 truncate">{p.model_name}</span>
                    )}
                    {isSuggested && !isSelected && (
                      <span className="text-[10px] uppercase tracking-wide font-bold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">
                        match
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showSuggestion && suggested && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-50 border border-brand-100">
          <div className="flex-1 min-w-0 text-xs text-gray-700">
            Looks like <span className="font-medium text-gray-900">{suggested.profile.instagram_username}</span> matches this slug.
          </div>
          <button
            onClick={() => onChange(suggested.profile.id)}
            className="px-3 py-1 rounded-md bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
          >
            Assign
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 leading-relaxed">
        Linking a page to a profile is informational only — used to keep things organised across the dashboard, no functional behaviour attached.
      </p>
    </div>
  );
}

// ── Main editor ────────────────────────────────────────────────────
interface OtherPageRow {
  id: string;
  slug: string;
  display_name: string | null;
  profile_id: string | null;
}

export function LinkEditorClient({
  initialPage,
  otherPages = [],
  profiles = [],
}: {
  initialPage: LinkPage;
  otherPages?: OtherPageRow[];
  profiles?: ProfileLite[];
}) {
  const router = useRouter();
  const [page, setPage] = useState<LinkPage>(initialPage);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Bulk-edit modal state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChangedFields, setBulkChangedFields] = useState<{ background: boolean; bio: boolean }>({ background: false, bio: false });
  const [bulkApplyFields, setBulkApplyFields] = useState<{ background: boolean; bio: boolean }>({ background: true, bio: true });
  const [bulkTargetIds, setBulkTargetIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Auto-suggested profile based on slug similarity
  const suggested = useMemo(() => suggestProfile(page.slug, profiles), [page.slug, profiles]);

  // Auto-link an unassigned page to its strong-match profile on first edit
  useEffect(() => {
    if (!page.profile_id && suggested && suggested.score >= 0.85) {
      // Don't auto-apply silently — only suggest. User confirms via the picker.
    }
  }, [page.profile_id, suggested]);

  function copyUrl() {
    navigator.clipboard.writeText(publicUrlForSlug(page.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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

  async function patchPage(id: string, patch: Record<string, any>): Promise<{ ok: boolean; error?: string; page?: LinkPage }> {
    const r = await fetch(`/api/link-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.error };
    return { ok: true, page: j.page };
  }

  function fullPagePatch() {
    return {
      slug: page.slug,
      display_name: page.display_name,
      bio: page.bio,
      avatar_url: page.avatar_url,
      background_url: page.background_url,
      background_original_url: page.background_original_url,
      blocks: page.blocks,
      theme: page.theme,
      is_published: page.is_published,
      profile_id: page.profile_id,
    };
  }

  async function saveCurrentOnly() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await patchPage(page.id, fullPagePatch());
      if (!res.ok) { setSaveError(res.error || "Save failed"); return; }
      if (res.page) setPage(res.page);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    // Did background_url or bio change vs the server-side initial state?
    const bgChanged = page.background_url !== initialPage.background_url;
    const bioChanged = (page.bio || "") !== (initialPage.bio || "");

    if ((bgChanged || bioChanged) && otherPages.length > 0) {
      setBulkChangedFields({ background: bgChanged, bio: bioChanged });
      setBulkApplyFields({ background: bgChanged, bio: bioChanged });
      setBulkTargetIds(new Set());
      setBulkOpen(true);
    } else {
      saveCurrentOnly();
    }
  }

  async function confirmBulkSave() {
    setBulkOpen(false);
    setSaving(true);
    setSaveError(null);
    try {
      // 1) Save the current page first
      const ownRes = await patchPage(page.id, fullPagePatch());
      if (!ownRes.ok) { setSaveError(ownRes.error || "Save failed"); return; }
      if (ownRes.page) setPage(ownRes.page);
      setDirty(false);

      // 2) Apply bio/background to selected target pages
      const targets = Array.from(bulkTargetIds);
      if (targets.length === 0) return;

      const fieldPatch: Record<string, any> = {};
      if (bulkApplyFields.background) {
        fieldPatch.background_url = page.background_url;
        fieldPatch.background_original_url = page.background_original_url;
      }
      if (bulkApplyFields.bio) fieldPatch.bio = page.bio;
      if (Object.keys(fieldPatch).length === 0) return;

      setBulkProgress({ done: 0, total: targets.length });
      let failed = 0;
      for (let i = 0; i < targets.length; i++) {
        const r = await patchPage(targets[i], fieldPatch);
        if (!r.ok) failed++;
        setBulkProgress({ done: i + 1, total: targets.length });
      }
      setBulkProgress(null);
      if (failed > 0) setSaveError(`${failed} of ${targets.length} pages failed to update`);
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
            <span className="text-gray-700 font-medium">{publicDisplayForSlug(page.slug)}</span>
            <button onClick={copyUrl} className="text-gray-400 hover:text-gray-700 transition-colors" title="Copy public URL">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
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
            href={publicUrlForSlug(page.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Public
          </a>
          <button
            onClick={handleSaveClick}
            disabled={!dirty || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving && bulkProgress ? `Saving ${bulkProgress.done}/${bulkProgress.total}` : dirty ? "Save" : "Saved"}
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

            <Section title="Linked Profile">
              <ProfilePicker
                profiles={profiles}
                value={page.profile_id}
                slug={page.slug}
                suggested={suggested}
                onChange={(id) => update({ profile_id: id })}
              />
            </Section>

            <Section title="Background">
              <Field label="Photo zone aspect ratio">
                <div className="flex flex-wrap gap-1.5">
                  {(["4:3", "1:1", "16:9", "4:5", "9:16"] as PhotoAspectKey[]).map(a => {
                    const active = (page.theme?.photoAspect || "4:3") === a;
                    return (
                      <button
                        key={a}
                        onClick={() => update({ theme: { ...page.theme, photoAspect: a } })}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                          active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <ImageInput
                label="Background image (full-bleed photo at the top)"
                value={page.background_url}
                originalValue={page.background_original_url}
                onChange={({ url, originalUrl }) => {
                  const patch: Partial<LinkPage> = {};
                  if (url !== undefined) patch.background_url = url;
                  if (originalUrl !== undefined) patch.background_original_url = originalUrl;
                  update(patch);
                }}
                pageId={page.id}
                cropAspect={(page.theme?.photoAspect || "4:3") as AspectKey}
                onAspectChange={(a) => update({ theme: { ...page.theme, photoAspect: a as PhotoAspectKey } })}
                allowAspectChange
              />
              <div className="text-xs text-gray-500 mt-2 leading-relaxed">
                The original is kept around so you can re-crop later — switch the aspect, drag, zoom; you always have every pixel back.
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

      {bulkOpen && (
        <BulkApplyModal
          changedFields={bulkChangedFields}
          applyFields={bulkApplyFields}
          onApplyFieldsChange={setBulkApplyFields}
          targetIds={bulkTargetIds}
          onTargetIdsChange={setBulkTargetIds}
          otherPages={otherPages}
          profiles={profiles}
          onCancel={() => setBulkOpen(false)}
          onSkip={() => { setBulkOpen(false); saveCurrentOnly(); }}
          onConfirm={confirmBulkSave}
        />
      )}
    </div>
  );
}

// ── Bulk-apply modal ───────────────────────────────────────────────
// Shown after Save when bio/background changed AND other pages exist.
// User opts in to which fields propagate and which target pages get them.
function BulkApplyModal({
  changedFields,
  applyFields,
  onApplyFieldsChange,
  targetIds,
  onTargetIdsChange,
  otherPages,
  profiles,
  onCancel,
  onSkip,
  onConfirm,
}: {
  changedFields: { background: boolean; bio: boolean };
  applyFields: { background: boolean; bio: boolean };
  onApplyFieldsChange: (f: { background: boolean; bio: boolean }) => void;
  targetIds: Set<string>;
  onTargetIdsChange: (s: Set<string>) => void;
  otherPages: OtherPageRow[];
  profiles: ProfileLite[];
  onCancel: () => void;
  onSkip: () => void;
  onConfirm: () => void;
}) {
  // Lock body scroll
  useEffect(() => {
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = o; };
  }, []);

  const profileById = useMemo(() => {
    const m: Record<string, ProfileLite> = {};
    for (const p of profiles) m[p.id] = p;
    return m;
  }, [profiles]);

  function toggle(id: string) {
    const next = new Set(targetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onTargetIdsChange(next);
  }

  function selectAll() {
    onTargetIdsChange(new Set(otherPages.map(p => p.id)));
  }

  function clearAll() {
    onTargetIdsChange(new Set());
  }

  const willApplyAnything = (applyFields.background && changedFields.background)
                         || (applyFields.bio && changedFields.bio);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Apply changes to other pages?</h2>
          <p className="text-xs text-gray-500 mt-1">
            Pick which fields and which pages should also receive these updates. Skip to save only this page.
          </p>
        </div>

        {/* Field toggles */}
        <div className="px-5 py-3 border-b border-gray-100 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fields</div>
          {changedFields.background && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={applyFields.background}
                onChange={e => onApplyFieldsChange({ ...applyFields, background: e.target.checked })}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-gray-900">Background image</span>
            </label>
          )}
          {changedFields.bio && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={applyFields.bio}
                onChange={e => onApplyFieldsChange({ ...applyFields, bio: e.target.checked })}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-gray-900">Bio</span>
            </label>
          )}
        </div>

        {/* Target pages */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100 bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Target pages ({targetIds.size}/{otherPages.length})
          </div>
          <div className="flex items-center gap-2">
            <button onClick={selectAll} className="text-xs text-brand-600 hover:text-brand-700 font-medium">All</button>
            <span className="text-xs text-gray-300">·</span>
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">None</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {otherPages.length === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No other pages yet.</div>
          ) : (
            otherPages.map(p => {
              const checked = targetIds.has(p.id);
              const linkedProfile = p.profile_id ? profileById[p.profile_id] : null;
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 cursor-pointer border-b border-gray-50 last:border-b-0",
                    checked ? "bg-brand-50/50" : "hover:bg-gray-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">/{p.slug}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {p.display_name || "—"}
                      {linkedProfile && (
                        <span className="ml-2">
                          · linked to <span className="text-gray-600">{linkedProfile.instagram_username}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            Save only this page
          </button>
          <button
            onClick={onConfirm}
            disabled={!willApplyAnything || targetIds.size === 0}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to {targetIds.size} page{targetIds.size === 1 ? "" : "s"}
          </button>
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
