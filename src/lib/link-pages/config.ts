// ============================================================
// Public-domain configuration for the link-in-bio tool.
//
// Multi-domain: each page picks which domain it lives on. To add a new
// domain, (1) add it in Vercel + DNS, then (2) append one line to
// LINK_DOMAINS below. Everything else (middleware host matching, the
// editor dropdown, URL display) is derived from this list.
// ============================================================

export interface LinkDomain {
  hostname: string;
  /** The domain new pages default to + the fallback for pages with no domain set. */
  isDefault?: boolean;
}

export const LINK_DOMAINS: LinkDomain[] = [
  { hostname: "vibez.bio", isDefault: true },
  // { hostname: "yourseconddomain.com" },   ← add domain #2 here once it's live
];

/** Selectable domains for the editor dropdown (bare hostnames). */
export const AVAILABLE_DOMAINS = LINK_DOMAINS.map((d) => d.hostname);

/** The default domain — used for pages that have no domain set (legacy + new default). */
export const DEFAULT_LINK_DOMAIN =
  LINK_DOMAINS.find((d) => d.isDefault)?.hostname || LINK_DOMAINS[0].hostname;

/** Back-compat alias (older imports). Equals the default domain. */
export const PUBLIC_LINK_DOMAIN = DEFAULT_LINK_DOMAIN;

/** All hosts the middleware treats as the public link plane (apex + www). */
export const PUBLIC_LINK_HOSTS = new Set<string>(
  LINK_DOMAINS.flatMap((d) => [d.hostname, `www.${d.hostname}`])
);

/** Normalise a request host: lowercase, strip port + leading www. */
export function normalizeHost(host: string | null | undefined): string {
  return (host || "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

/** Resolve a page's effective domain (its own, or the default). */
export function resolveDomain(domain: string | null | undefined): string {
  const d = (domain || "").toLowerCase().trim();
  return AVAILABLE_DOMAINS.includes(d) ? d : DEFAULT_LINK_DOMAIN;
}

/** Build the user-facing URL for a slug, e.g. "https://vibez.bio/stephii". */
export function publicUrlForSlug(slug: string, domain?: string | null): string {
  return `https://${resolveDomain(domain)}/${slug}`;
}

/** Bare display form (no protocol), e.g. "vibez.bio/stephii". */
export function publicDisplayForSlug(slug: string, domain?: string | null): string {
  return `${resolveDomain(domain)}/${slug}`;
}
