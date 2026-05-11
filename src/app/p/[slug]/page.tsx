// Public link-in-bio page rendered at /p/[slug].
//
// Once a custom domain is wired up, middleware will rewrite
// `domain.com/[slug]` to `/p/[slug]` so the same component handles
// both. For Phase 1 the public path is exposed directly.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkPageRender } from "@/components/link-page-render";
import type { LinkPage } from "@/lib/link-pages/types";
import { detectBot } from "@/lib/link-pages/bot-detect";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadPage(slug: string): Promise<LinkPage | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("link_pages")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as LinkPage;
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
  const page = await loadPage(params.slug);
  if (!page) return { title: "Not found" };

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
  const page = await loadPage(params.slug);
  if (!page) notFound();

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
