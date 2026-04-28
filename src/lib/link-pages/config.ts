// ============================================================
// Public-domain configuration for the link-in-bio tool.
//
// Phase 1: a single hardcoded domain. Phase 2 will move this into
// the link_domains table and make it dynamic per page.
// ============================================================

export const PUBLIC_LINK_DOMAIN = "vibez.bio";

/** Hosts that the middleware treats as the public link plane. */
export const PUBLIC_LINK_HOSTS = new Set<string>([
  "vibez.bio",
  "www.vibez.bio",
]);

/** Build the user-facing URL for a slug, e.g. "vibez.bio/stephii". */
export function publicUrlForSlug(slug: string): string {
  return `https://${PUBLIC_LINK_DOMAIN}/${slug}`;
}

/** Bare display form (no protocol), e.g. "vibez.bio/stephii". */
export function publicDisplayForSlug(slug: string): string {
  return `${PUBLIC_LINK_DOMAIN}/${slug}`;
}
