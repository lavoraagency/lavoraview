import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/sync-conversions
// Accepts array of { username, date, link_clicks, new_subs }
// Matches username to profile_id (IG) or facebook_profile_id (FB) and upserts into conversion_snapshots
//
// n8n should POST to this endpoint with the Authorization header:
// Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//
// `username` here is the TRACKING LINK name — the Conversion Tracking Sheet
// names its columns after the short.io slug, not after the account. Those used
// to be identical, so an exact name match was enough. Since links started
// being renamed (ban risk on Instagram) they drift apart, and every record
// whose name no longer matched was silently dropped: ~160 subs/day by the time
// anyone noticed. Hence the rule-based fallback and the reporting below.

type Target = { kind: "ig" | "fb"; id: string; name: string; active: boolean };

/** Candidate account names for a tracking-link name, in the two renaming
 * conventions actually in use (verified against the live sheet):
 *   - one character appended:  juliaanpfiff -> juliaanpfiffx, MickelStock -> MickelStockk
 *   - "its" prefixed:          ava.feelgood -> itsava.feelgood
 * Each rule yields exactly ONE candidate string, so unlike a general
 * similarity search it cannot quietly pick the wrong neighbour. */
function ruleCandidates(key: string): string[] {
  const out: string[] = [];
  if (key.length > 1) out.push(key.slice(0, -1));
  if (key.startsWith("its") && key.length > 3) {
    out.push(key.slice(3));
    if (key.length > 4) out.push(key.slice(3, -1));
  }
  return out;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

export async function POST(req: NextRequest) {
  // Simple auth check
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const records: { username: string; date: string; link_clicks: number; new_subs: number }[] = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Expected non-empty array" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch all IG profiles (active only) and FB profiles in parallel
    const [{ data: igProfiles, error: igError }, { data: fbProfiles, error: fbError }] = await Promise.all([
      supabase.from("profiles").select("id, instagram_username").eq("is_active", true),
      supabase.from("facebook_profiles").select("id, name, is_active"),
    ]);

    if (igError) throw igError;
    if (fbError) throw fbError;

    const byName = new Map<string, Target[]>();
    const add = (name: string | null, t: Target) => {
      const k = String(name || "").trim().toLowerCase();
      if (!k) return;
      const list = byName.get(k);
      if (list) list.push(t); else byName.set(k, [t]);
    };
    for (const p of igProfiles || []) {
      add(p.instagram_username, { kind: "ig", id: p.id, name: p.instagram_username, active: true });
    }
    for (const p of fbProfiles || []) {
      add(p.name, { kind: "fb", id: p.id, name: p.name, active: !!p.is_active });
    }
    const allNames = Array.from(byName.keys());

    /** Narrow several same-named rows to one. FB names are not unique and an
     * account that went live after a warmup phase can still have a dead twin;
     * the live one is always the right target. Only genuinely unclear cases
     * are left ambiguous — previously whichever row happened to be read last
     * silently won, which is how conversions ended up on dead profiles. */
    const pick = (hits: Target[]): Target | null => {
      if (hits.length === 1) return hits[0];
      const active = hits.filter(h => h.active);
      return active.length === 1 ? active[0] : null;
    };

    type Resolution =
      | { how: "exact" | "rule"; target: Target }
      | { how: "ambiguous"; candidates: Target[] }
      | { how: "none" };

    const resolve = (username: string): Resolution => {
      const key = String(username || "").trim().toLowerCase();
      if (!key) return { how: "none" };

      const exact = byName.get(key);
      if (exact?.length) {
        const t = pick(exact);
        return t ? { how: "exact", target: t } : { how: "ambiguous", candidates: exact };
      }

      // Exact match always wins before any rule is considered.
      const hits: Target[] = [];
      const seen = new Set<string>();
      for (const cand of ruleCandidates(key)) {
        for (const h of byName.get(cand) || []) {
          const id = h.kind + h.id;
          if (!seen.has(id)) { seen.add(id); hits.push(h); }
        }
      }
      if (hits.length) {
        const t = pick(hits);
        return t ? { how: "rule", target: t } : { how: "ambiguous", candidates: hits };
      }
      return { how: "none" };
    };

    /** Closest known account name, as a hint for a human — never applied
     * automatically. */
    const suggest = (username: string): string | null => {
      const key = username.trim().toLowerCase();
      let best: string | null = null, bestD = Infinity;
      for (const n of allNames) {
        const d = levenshtein(key, n);
        if (d < bestD) { bestD = d; best = n; }
      }
      return best && bestD <= 4 ? best : null;
    };

    // Several sheet columns can legitimately point at the same account on the
    // same day — an account keeps its old link column after a rename, and both
    // resolve to one profile. Postgres rejects an upsert that touches the same
    // conflict key twice ("ON CONFLICT DO UPDATE command cannot affect row a
    // second time"), which took the whole Facebook batch down for four days.
    // So aggregate first: one row per (target, date), values summed.
    const igAgg = new Map<string, { profile_id: string; date: string; link_clicks: number; new_subs: number }>();
    const fbAgg = new Map<string, { facebook_profile_id: string; date: string; link_clicks: number; new_subs: number }>();

    const unresolved: { username: string; link_clicks: number; new_subs: number; reason: string; suggestion?: string | null }[] = [];
    const ruleMatches: { link: string; matched: string }[] = [];
    let viaExact = 0;

    for (const r of records) {
      if (!r.date || r.date === "Start" || r.date === "Week ⬆") continue;

      const clicks = Number(r.link_clicks) || 0;
      const subs = Number(r.new_subs) || 0;
      const res = resolve(r.username);

      if (res.how === "none" || res.how === "ambiguous") {
        unresolved.push({
          username: r.username,
          link_clicks: clicks,
          new_subs: subs,
          reason: res.how === "ambiguous"
            ? `ambiguous: ${res.candidates.map(c => `${c.kind.toUpperCase()} ${c.name}`).join(" / ")}`
            : "no match",
          suggestion: res.how === "none" ? suggest(r.username) : null,
        });
        continue;
      }

      if (res.how === "rule") ruleMatches.push({ link: r.username, matched: res.target.name });
      else viaExact++;

      if (res.target.kind === "ig") {
        const k = `${res.target.id}|${r.date}`;
        const row = igAgg.get(k);
        if (row) { row.link_clicks += clicks; row.new_subs += subs; }
        else igAgg.set(k, { profile_id: res.target.id, date: r.date, link_clicks: clicks, new_subs: subs });
      } else {
        const k = `${res.target.id}|${r.date}`;
        const row = fbAgg.get(k);
        if (row) { row.link_clicks += clicks; row.new_subs += subs; }
        else fbAgg.set(k, { facebook_profile_id: res.target.id, date: r.date, link_clicks: clicks, new_subs: subs });
      }
    }

    const igRows = Array.from(igAgg.values());
    const fbRows = Array.from(fbAgg.values());

    if (igRows.length > 0) {
      const { error } = await supabase
        .from("conversion_snapshots")
        .upsert(igRows, { onConflict: "profile_id,date" });
      if (error) throw error;
    }

    if (fbRows.length > 0) {
      const { error } = await supabase
        .from("conversion_snapshots")
        .upsert(fbRows, { onConflict: "facebook_profile_id,date" });
      if (error) throw error;
    }

    // Sorted so the biggest losses lead the Telegram report.
    unresolved.sort((a, b) => (b.new_subs - a.new_subs) || (b.link_clicks - a.link_clicks));

    return NextResponse.json({
      ok: true,
      inserted: igRows.length + fbRows.length,
      ig: igRows.length,
      fb: fbRows.length,
      via_exact: viaExact,
      via_rule: ruleMatches.length,
      rule_matches: ruleMatches,
      unresolved,
      // Kept for backwards compatibility with anything reading the old shape.
      skipped: unresolved.map(u => u.username),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
