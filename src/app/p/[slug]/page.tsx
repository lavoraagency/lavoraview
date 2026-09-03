// Public link-in-bio page rendered at /p/[slug].
//
// Once a custom domain is wired up, middleware will rewrite
// `domain.com/[slug]` to `/p/[slug]` so the same component handles
// both. For Phase 1 the public path is exposed directly.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkPageRender } from "@/components/link-page-render";
import type { LinkPage } from "@/lib/link-pages/types";
import { detectBot } from "@/lib/link-pages/bot-detect";
import { normalizeHost, resolveDomain, PUBLIC_LINK_HOSTS } from "@/lib/link-pages/config";

// The page still renders dynamically per-request (headers() below forces
// that anyway, and it must: bot cloaking and domain isolation need the
// real request's user-agent/host every time). What we cache is only the
// SLOW part — the Supabase lookup — via Next's Data Cache, tagged per
// slug so the editor can invalidate instantly on save/delete (see the
// revalidateTag calls in /api/link-pages).
//
// Two direct benefits, both aimed at reducing blast radius from a
// Supabase hiccup rather than adding load: (1) repeat visits/link-preview
// bots hitting the same slug within the cache window reuse the cached
// row instead of re-querying Supabase — fewer Supabase reads AND fewer
// Vercel function-seconds, not more; (2) if Supabase is degraded, a
// cache hit still serves the page fine, and a cache miss fails fast via
// the timeout below (a few seconds, not up to Vercel's 300s function
// timeout) with a friendly retry message instead of a dead page.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const LINK_PAGE_CACHE_SECONDS = 60;
const SUPABASE_TIMEOUT_MS = 8000;

type LoadResult =
  | { status: "ok"; page: LinkPage }
  | { status: "not_found" }
  | { status: "unavailable" };

async function fetchPageFromSupabase(slug: string): Promise<LinkPage | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("link_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  // Distinguish "no such row" (a real, cacheable 404) from a Supabase
  // error (must NOT be cached as a false-negative — throw so it's treated
  // as "unavailable" upstream instead of poisoning the cache with "not
  // found" for up to LINK_PAGE_CACHE_SECONDS during an outage).
  if (error) throw error;
  if (!data) return null;
  return data as LinkPage;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function loadPage(slug: string): Promise<LoadResult> {
  // Re-wrapping per call is intentional and is the documented way to get
  // a per-argument cache tag out of unstable_cache: the slug is baked
  // into both the cache key (via keyParts) and the tag, so each slug is
  // cached and invalidated independently.
  const cachedFetch = unstable_cache(
    () => fetchPageFromSupabase(slug),
    ["link-page", slug],
    { revalidate: LINK_PAGE_CACHE_SECONDS, tags: [`link-page:${slug}`] }
  );
  try {
    // The timeout only matters on a cache miss — a cache hit resolves
    // immediately without touching Supabase at all. If the underlying
    // call eventually finishes after we give up waiting, its result
    // still lands in the cache for the next visitor.
    const page = await withTimeout(cachedFetch(), SUPABASE_TIMEOUT_MS);
    return page ? { status: "ok", page } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

function UnavailableNotice() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f1a", color: "#fff",
      fontFamily: "system-ui, sans-serif", display: "flex",
      alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24,
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.5px" }}>Page temporarily unavailable</h1>
        <p style={{ opacity: 0.6, fontSize: 14, marginTop: 8 }}>Please try again in a moment.</p>
      </div>
    </div>
  );
}

/** True when this request should see the cloaked view (bot + page opted in). */
function shouldCloak(page: LinkPage, userAgent: string | null): boolean {
  const enabled = page.theme?.cloakFromBots !== false; // default ON
  if (!enabled) return false;
  return detectBot(userAgent).isBot;
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const result = await loadPage(params.slug);
  if (result.status === "not_found") return { title: "Not found" };
  if (result.status === "unavailable") return { title: "Temporarily unavailable", robots: { index: false, follow: false } };
  const page = result.page;

  const ua = headers().get("user-agent");
  const cloak = shouldCloak(page, ua);

  const title = page.display_name || page.slug;
  // For bots, strip the bio/image from social previews too — no signal that
  // could trip an adult-content classifier.
  const description = cloak ? "Personal page" : (page.bio || `${title} — links`);
  const image = cloak ? undefined : (page.background_url || page.avatar_url || undefined);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
    // Discourage indexing of cloaked or uncloaked variants — these pages
    // are direct-link traffic, not search-result destinations.
    robots: { index: false, follow: false },
  };
}

export default async function PublicLinkPage({ params }: { params: { slug: string } }) {
  const result = await loadPage(params.slug);
  if (result.status === "not_found") notFound();
  if (result.status === "unavailable") return <UnavailableNotice />;
  const page = result.page;

  // Domain isolation: a page only serves on its assigned domain. If the
  // request comes in on a different public link host, 404 — this stops a
  // page leaking onto every domain just because the slug exists. Direct
  // /p/[slug] previews on the dashboard host (not a public link host) skip
  // the check so the editor "Public" button still works there.
  const reqHost = normalizeHost(headers().get("host"));
  if (PUBLIC_LINK_HOSTS.has(reqHost) || PUBLIC_LINK_HOSTS.has(`www.${reqHost}`)) {
    if (reqHost !== resolveDomain(page.domain)) notFound();
  }

  const ua = headers().get("user-agent");
  const bot = detectBot(ua);
  const cloak = (page.theme?.cloakFromBots !== false) && bot.isBot;

  if (bot.isBot) {
    // Server-side log so we can see in Vercel logs which crawlers hit us.
    console.log(`[link-page] bot visit slug=${page.slug} bot=${bot.name} cloaked=${cloak} ua=${(ua || "").slice(0, 200)}`);
  }

  // When cloaked, strip outbound-link blocks server-side so they don't leak
  // through React's hydration payload (props get serialised into the HTML
  // even when not rendered visually). The bot literally never sees the URLs.
  const pageToRender = cloak
    ? {
        ...page,
        blocks: (page.blocks || []).filter(
          (b) => b.type !== "link" && b.type !== "image-card",
        ),
      }
    : page;

  return <LinkPageRender page={pageToRender} cloaked={cloak} />;
}
