// Fuzzy-match a link-page slug against an Instagram username so the
// editor can suggest "you probably want to link this page to that profile".
// Pure functions — no React, no DB.

import type { ProfileLite } from "./types";

/** Lowercase + strip everything that isn't a-z0-9. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Classic Levenshtein distance, iterative O(n*m) DP. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  let curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Similarity in [0, 1].
 *   1.0 = identical after normalisation
 *   ~0.85 = one is a substring of the other
 *   1 - dist/maxLen otherwise
 */
export function similarity(a: string, b: string): number {
  const x = normalise(a);
  const y = normalise(b);
  if (!x || !y) return 0;
  if (x === y) return 1;

  // Substring is a strong signal even when lengths differ a lot
  // (e.g. "stephii" vs "stephii_world").
  if (x.includes(y) || y.includes(x)) {
    const minLen = Math.min(x.length, y.length);
    const maxLen = Math.max(x.length, y.length);
    return 0.85 + 0.15 * (minLen / maxLen);
  }

  const dist = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length);
  return 1 - dist / maxLen;
}

/** Score every profile against `slug` and return the best match. */
export function suggestProfile(
  slug: string,
  profiles: ProfileLite[],
  threshold = 0.7,
): { profile: ProfileLite; score: number } | null {
  if (!slug || profiles.length === 0) return null;
  let best: { profile: ProfileLite; score: number } | null = null;
  for (const p of profiles) {
    const score = similarity(slug, p.instagram_username);
    if (!best || score > best.score) best = { profile: p, score };
  }
  return best && best.score >= threshold ? best : null;
}
