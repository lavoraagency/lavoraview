// ============================================================
// Block schema for link-in-bio pages.
//
// Each block has a stable id (used for click tracking + reorder)
// and a discriminated `type`. Add new types here, then handle them
// in both the editor inspector and the public renderer.
// ============================================================

export type BlockId = string;

export interface ProfileHeaderBlock {
  id: BlockId;
  type: "header";
  /** Big bold title — falls back to page.display_name. */
  title?: string;
  /** Smaller text below — falls back to page.bio. */
  subtitle?: string;
  /** Tiny line below subtitle, e.g. "19y/o 📍 Houston". */
  meta?: string;
}

export interface LinkButtonBlock {
  id: BlockId;
  type: "link";
  title: string;
  url: string;
  /** "of" | "fansly" | "telegram" | "twitter" | "tiktok" | "ig" | "tg" | "snap" | "custom" */
  icon?: string;
  /** Custom icon URL, used when icon === "custom". */
  iconUrl?: string;
  /** Force breaking out of the in-app browser on click (Phase 1: always on). */
  breakoutIab?: boolean;
}

export interface ImageCardBlock {
  id: BlockId;
  type: "image-card";
  /** Big image as background. */
  imageUrl: string;
  /** Title overlaid at the bottom of the image. */
  title: string;
  /** Click destination. */
  url: string;
  /** Optional small overlay icon top-right (e.g. OF logo on the photo). */
  overlayIcon?: string;
  breakoutIab?: boolean;
}

export interface SocialsRowBlock {
  id: BlockId;
  type: "socials";
  items: { platform: string; url: string }[];
}

export interface SpacerBlock {
  id: BlockId;
  type: "spacer";
  /** Vertical space in px. */
  height?: number;
}

export type Block =
  | ProfileHeaderBlock
  | LinkButtonBlock
  | ImageCardBlock
  | SocialsRowBlock
  | SpacerBlock;

// ── Theme ──────────────────────────────────────────────────────────
export interface PageTheme {
  /** Solid background color (used when no background_url set). */
  bgColor?: string;
  /** Tint of the gradient overlay over the background (default rgba(0,0,0,0.55)). */
  overlay?: string;
  /** Button visual style. */
  buttonStyle?: "glass" | "filled" | "outline";
  /** Accent color for hovers / focus rings. */
  accent?: string;
  /** "light" forces dark text — default "dark" assumes white text on dark bg. */
  textTone?: "light" | "dark";
}

// ── Page ───────────────────────────────────────────────────────────
export interface LinkPage {
  id: string;
  slug: string;
  domain_id: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  background_url: string | null;
  blocks: Block[];
  theme: PageTheme;
  is_published: boolean;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────
export function newBlockId(): BlockId {
  // 8-char base36 — short, URL-friendly, collision-safe within a single page.
  return Math.random().toString(36).slice(2, 10);
}

export function isClickable(b: Block): b is LinkButtonBlock | ImageCardBlock {
  return b.type === "link" || b.type === "image-card";
}
