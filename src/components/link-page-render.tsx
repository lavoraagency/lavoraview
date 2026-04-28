"use client";

import { useEffect, useMemo } from "react";
import {
  ChevronRight,
  Instagram,
  Twitter,
  Send as TelegramIcon,
  Music2 as TikTokIcon,
  Globe,
} from "lucide-react";
import {
  Block,
  ImageCardBlock,
  LinkButtonBlock,
  LinkPage,
  ProfileHeaderBlock,
  SocialsRowBlock,
  SpacerBlock,
} from "@/lib/link-pages/types";
import { openExternal, detectIab, detectPlatform } from "@/lib/link-pages/iab";

// ── Built-in icons ─────────────────────────────────────────────────
// We render small monochrome icons inside a circular badge for buttons.
// "of" / "fansly" use brand-colored SVG since they're the primary CTAs.
function BrandIcon({ kind, customUrl }: { kind?: string; customUrl?: string }) {
  if (kind === "custom" && customUrl) {
    return <img src={customUrl} alt="" className="w-5 h-5 object-contain" />;
  }
  switch (kind) {
    case "of":
      // OnlyFans-style mark
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#00AFF0" />
          <circle cx="9" cy="12" r="2.6" fill="#fff" />
          <path d="M14 7.5c.7 0 1.4.3 1.9.8s.8 1.2.8 1.9c0 .7-.3 1.4-.8 1.9s-1.2.8-1.9.8" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "fansly":
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
          <path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10h-4z" fill="#1d9bf0" />
        </svg>
      );
    case "telegram":
      return <TelegramIcon className="w-5 h-5 text-sky-400" />;
    case "tg":
      return <TelegramIcon className="w-5 h-5 text-sky-400" />;
    case "twitter":
    case "x":
      return <Twitter className="w-5 h-5 text-gray-100" />;
    case "tiktok":
      return <TikTokIcon className="w-5 h-5 text-gray-100" />;
    case "ig":
    case "instagram":
      return <Instagram className="w-5 h-5 text-pink-400" />;
    default:
      return <Globe className="w-5 h-5 text-gray-200" />;
  }
}

// ── Track click (fire-and-forget) ──────────────────────────────────
function track(pageId: string, blockId: string, url: string) {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const { isIab, app } = detectIab(ua);
    const body = JSON.stringify({
      link_page_id: pageId,
      block_id: blockId,
      url,
      user_agent: ua,
      is_iab: isIab,
      iab_app: app,
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/link-clicks", blob);
    } else {
      fetch("/api/link-clicks", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch { /* never block the click on tracking */ }
}

// ── Block renderers ────────────────────────────────────────────────
function HeaderBlock({ block, page }: { block: ProfileHeaderBlock; page: LinkPage }) {
  const title = block.title || page.display_name || "";
  const subtitle = block.subtitle || page.bio || "";
  const meta = block.meta || "";
  return (
    <div className="text-center px-2 pt-2 pb-1">
      {title && (
        <h1 className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-md leading-tight">
          {title}
        </h1>
      )}
      {subtitle && (
        <div className="mt-1 text-sm text-white/80 drop-shadow-sm">
          {subtitle}
        </div>
      )}
      {meta && (
        <div className="mt-1 text-xs text-white/70 drop-shadow-sm">
          {meta}
        </div>
      )}
    </div>
  );
}

function LinkButton({ block, pageId }: { block: LinkButtonBlock; pageId: string }) {
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    track(pageId, block.id, block.url);
    if (block.breakoutIab !== false) openExternal(block.url);
    else window.location.href = block.url;
  };
  return (
    <a
      href={block.url}
      onClick={onClick}
      className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-md transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
        <BrandIcon kind={block.icon} customUrl={block.iconUrl} />
      </span>
      <span className="flex-1 text-left text-white font-medium text-base">
        {block.title}
      </span>
      <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
    </a>
  );
}

function ImageCard({ block, pageId }: { block: ImageCardBlock; pageId: string }) {
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    track(pageId, block.id, block.url);
    if (block.breakoutIab !== false) openExternal(block.url);
    else window.location.href = block.url;
  };
  return (
    <a
      href={block.url}
      onClick={onClick}
      className="relative block w-full rounded-2xl overflow-hidden aspect-[4/3] bg-black/30"
    >
      {block.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.imageUrl}
          alt={block.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
      {block.overlayIcon && (
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 border border-white/20 backdrop-blur-md flex items-center justify-center">
          <BrandIcon kind={block.overlayIcon} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white text-lg font-bold drop-shadow-md">
        {block.title}
      </div>
    </a>
  );
}

function SocialsRow({ block, pageId }: { block: SocialsRowBlock; pageId: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {block.items.map((it, i) => (
        <a
          key={i}
          href={it.url}
          onClick={(e) => {
            e.preventDefault();
            track(pageId, `${block.id}-${i}`, it.url);
            openExternal(it.url);
          }}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/15 transition-colors"
        >
          <BrandIcon kind={it.platform} />
        </a>
      ))}
    </div>
  );
}

function Spacer({ block }: { block: SpacerBlock }) {
  return <div style={{ height: block.height || 12 }} />;
}

// ── Main render ────────────────────────────────────────────────────
export function LinkPageRender({
  page,
  isPreview,
}: {
  page: LinkPage;
  /** When true (used inside the editor), clicks are no-ops and tracking is disabled. */
  isPreview?: boolean;
}) {
  // Guarantee a header block exists so the Bouncy-style title always renders.
  const blocks = useMemo<Block[]>(() => {
    if (!page.blocks || page.blocks.length === 0) {
      return [{ id: "auto-header", type: "header" } as ProfileHeaderBlock];
    }
    return page.blocks;
  }, [page.blocks]);

  // Solid background color for the lower half of the page (where buttons live).
  // Bouncy-style: photo only at the top, smooth fade into a single solid color.
  const solidColor = page.theme?.bgColor || "#0f0f1a";

  // Pull the FIRST header block to the top photo zone; everything else
  // renders underneath on the solid color. Order of non-header blocks
  // is preserved exactly as authored in the editor.
  const headerIdx = blocks.findIndex((b) => b.type === "header");
  const headerBlock = headerIdx >= 0 ? (blocks[headerIdx] as ProfileHeaderBlock) : null;
  const otherBlocks: Block[] = headerIdx >= 0
    ? [...blocks.slice(0, headerIdx), ...blocks.slice(headerIdx + 1)]
    : blocks;

  // Bump view_count once on real (non-preview) page mount
  useEffect(() => {
    if (isPreview) return;
    try {
      fetch("/api/link-clicks/view", {
        method: "POST",
        body: JSON.stringify({ link_page_id: page.id }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
    } catch { /* ignore */ }
  }, [isPreview, page.id]);

  // Wrap any block in a click-eating div when rendered inside the editor preview
  const wrapPreview = (node: React.ReactNode, key: string | number) =>
    isPreview ? (
      <div
        key={key}
        onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
        style={{ pointerEvents: "auto" }}
      >
        {node}
      </div>
    ) : (
      <div key={key}>{node}</div>
    );

  function renderBlock(b: Block, key: string | number) {
    switch (b.type) {
      case "header":      return wrapPreview(<HeaderBlock block={b} page={page} />, key);
      case "link":        return wrapPreview(<LinkButton block={b} pageId={page.id} />, key);
      case "image-card":  return wrapPreview(<ImageCard block={b} pageId={page.id} />, key);
      case "socials":     return wrapPreview(<SocialsRow block={b} pageId={page.id} />, key);
      case "spacer":      return wrapPreview(<Spacer block={b} />, key);
      default:            return null;
    }
  }

  // Photo zone: anchored at top, fades from full image to solid color.
  // The 50% / 95% gradient stops mean: top half is fully photo, bottom
  // ~5% is fully solid color, so when the content area below starts
  // there's no visible seam.
  const photoZoneStyle: React.CSSProperties | undefined = page.background_url
    ? {
        backgroundImage: `linear-gradient(to bottom, transparent 0%, transparent 50%, ${solidColor} 95%), url("${page.background_url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <div className="min-h-screen w-full text-white" style={{ backgroundColor: solidColor }}>
      <div className="mx-auto max-w-[480px] min-h-screen flex flex-col">
        {/* ── Photo zone (top) — only when a background image is set ── */}
        {page.background_url && (
          <div
            className="relative w-full aspect-[4/3] flex flex-col justify-end px-4 pb-2"
            style={photoZoneStyle}
          >
            {headerBlock && renderBlock(headerBlock, "hdr")}
          </div>
        )}

        {/* ── Header without photo ── */}
        {!page.background_url && headerBlock && (
          <div className="px-4 pt-8 pb-2">
            {renderBlock(headerBlock, "hdr")}
          </div>
        )}

        {/* ── Solid-color content zone (everything below the photo) ── */}
        <div className="px-4 pt-3 pb-6 flex flex-col gap-3 flex-1">
          {otherBlocks.map((b, i) => renderBlock(b, b.id || i))}
        </div>
      </div>
    </div>
  );
}
