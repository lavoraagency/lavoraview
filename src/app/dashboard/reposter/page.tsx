export const dynamic = 'force-dynamic';

import { createServiceClient as createClient } from "@/lib/supabase/server";
import { ReposterClient } from "@/components/reposter-client";

export default async function ReposterPage() {
  const supabase = createClient();

  // Fetch the last 30 daily reports, most recent first
  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id, report_date, report_text, created_at")
    .order("report_date", { ascending: false })
    .limit(30);

  return <ReposterClient reports={reports || []} />;
}
