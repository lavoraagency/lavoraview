// Public link-in-bio page rendered at /p/[slug].
//
// Once a custom domain is wired up, middleware will rewrite
// `domain.com/[slug]` to `/p/[slug]` so the same component handles
// both. For Phase 1 the public path is exposed directly.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkPageRender } from "@/components/link-page-render";
import type { LinkPage } from "@/lib/link-pages/types";

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

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const page = await loadPage(params.slug);
  if (!page) return { title: "Not found" };
  const title = page.display_name || page.slug;
  const description = page.bio || `${title} — links`;
  const image = page.background_url || page.avatar_url || undefined;
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
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicLinkPage({ params }: { params: { slug: string } }) {
  const page = await loadPage(params.slug);
  if (!page) notFound();
  return <LinkPageRender page={page} />;
}
