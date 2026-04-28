export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { LinkEditorClient } from "@/components/link-editor-client";
import type { LinkPage } from "@/lib/link-pages/types";

export default async function LinkEditorPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("link_pages")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !data) notFound();
  return <LinkEditorClient initialPage={data as LinkPage} />;
}
