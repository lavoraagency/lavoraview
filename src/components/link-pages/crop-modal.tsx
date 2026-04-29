"use client";

// Drag-and-zoom crop modal. Wraps react-easy-crop and adds an aspect
// ratio toggle plus a zoom slider. Caller passes a source URL (object
// URL of a local File, or a remote URL) and receives a cropped JPEG
// Blob via onConfirm.

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { cropToBlob } from "@/lib/link-pages/crop";

export type AspectKey = "4:3" | "1:1" | "16:9" | "4:5" | "9:16";

const ASPECT_RATIOS: { key: AspectKey; label: string; ratio: number }[] = [
  { key: "4:3",  label: "4 : 3",  ratio: 4 / 3 },
  { key: "1:1",  label: "1 : 1",  ratio: 1 },
  { key: "16:9", label: "16 : 9", ratio: 16 / 9 },
  { key: "4:5",  label: "4 : 5",  ratio: 4 / 5 },
  { key: "9:16", label: "9 : 16", ratio: 9 / 16 },
];

export function aspectKeyToRatio(key: AspectKey): number {
  return ASPECT_RATIOS.find(a => a.key === key)?.ratio || 4 / 3;
}

export function CropModal({
  imageSrc,
  defaultAspect = "4:3",
  allowAspectChange = true,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  defaultAspect?: AspectKey;
  /** When false, the aspect toggle is hidden — caller has already locked the ratio. */
  allowAspectChange?: boolean;
  onCancel: () => void;
  /** Receives the cropped JPEG blob and the chosen aspect key. */
  onConfirm: (blob: Blob, aspect: AspectKey) => Promise<void> | void;
}) {
  const [aspect, setAspect] = useState<AspectKey>(defaultAspect);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Lock body scroll while the modal is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!areaPixels) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(imageSrc, areaPixels);
      await onConfirm(blob, aspect);
    } catch (err) {
      console.error("crop failed:", err);
      alert("Crop failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white border-b border-white/10">
        <div className="text-sm font-semibold">Crop image</div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Crop canvas */}
      <div className="relative flex-1 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectKeyToRatio(aspect)}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          minZoom={1}
          maxZoom={4}
          restrictPosition
          objectFit="contain"
          showGrid
          cropShape="rect"
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-900 text-white px-4 py-3 space-y-3 border-t border-white/10">
        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-white/60 flex-shrink-0" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-brand-500"
          />
          <ZoomIn className="w-4 h-4 text-white/60 flex-shrink-0" />
        </div>

        {/* Aspect ratio toggle */}
        {allowAspectChange && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {ASPECT_RATIOS.map((a) => (
              <button
                key={a.key}
                onClick={() => setAspect(a.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  aspect === a.key
                    ? "bg-white text-gray-900"
                    : "bg-white/10 text-white/70 hover:bg-white/20",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || !areaPixels}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
