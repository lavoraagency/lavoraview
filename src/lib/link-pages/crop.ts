// Canvas-based crop helper used by the link-page editor.
//
// react-easy-crop returns the crop area in source pixel coordinates.
// We draw that region onto a new canvas and export as a JPEG/PNG Blob,
// ready to upload back to Supabase Storage.

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Load an Image element from a URL or blob URL. Promises resolve when decoded. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // for cross-origin uploads
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop `imageSrc` to the given pixel rectangle and return a JPEG Blob.
 *
 * Output size is capped so we don't upload absurdly large files — the
 * longer side maxes out at `maxLongEdge` (default 1600px), the
 * cropped aspect ratio is preserved.
 */
export async function cropToBlob(
  imageSrc: string,
  area: CropArea,
  opts: { maxLongEdge?: number; quality?: number; mimeType?: string } = {},
): Promise<Blob> {
  const { maxLongEdge = 1600, quality = 0.9, mimeType = "image/jpeg" } = opts;
  const img = await loadImage(imageSrc);

  // Scale so the longer side <= maxLongEdge
  const longSrc = Math.max(area.width, area.height);
  const scale = longSrc > maxLongEdge ? maxLongEdge / longSrc : 1;
  const outW = Math.round(area.width * scale);
  const outH = Math.round(area.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // Draw source rectangle onto the destination canvas (sx,sy,sw,sh -> dx,dy,dw,dh)
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      mimeType,
      quality,
    );
  });
}

/** Convert a File to an object URL for previewing in the cropper. */
export function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}
