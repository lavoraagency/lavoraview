// ============================================================
// In-App-Browser detection + external-browser breakout.
//
// Mirrors the technique used by Bouncy.ai / Linktree for Meta apps:
// "instagram://extbrowser/?url=..." is an undocumented but stable IG
// schema that hands the URL off to the system browser. Same trick on
// Threads via "barcelona://extbrowser/?url=...". Android uses an
// intent:// URL targeting Chrome with a fallback. Other IABs (TikTok,
// Snapchat, Pinterest, ...) have no public breakout API — those calls
// just navigate normally and stay in-app, same as every other tool.
// ============================================================

export type IabApp =
  | "instagram"
  | "threads"
  | "facebook"
  | "messenger"
  | "tiktok"
  | "snapchat"
  | "pinterest"
  | "twitter"
  | "linkedin"
  | "telegram"
  | null;

export function detectIab(ua: string): { isIab: boolean; app: IabApp } {
  if (/Instagram/i.test(ua) && !/FBAN|FBAV/i.test(ua)) return { isIab: true, app: "instagram" };
  if (/Barcelona/i.test(ua))                            return { isIab: true, app: "threads" };
  if (/FBAN|FBAV/i.test(ua) && /Messenger/i.test(ua))   return { isIab: true, app: "messenger" };
  if (/FBAN|FBAV/i.test(ua))                            return { isIab: true, app: "facebook" };
  if (/musical_ly|TikTok/i.test(ua))                    return { isIab: true, app: "tiktok" };
  if (/Snapchat/i.test(ua))                             return { isIab: true, app: "snapchat" };
  if (/Pinterest/i.test(ua))                            return { isIab: true, app: "pinterest" };
  if (/Twitter|TwitterAndroid/i.test(ua))               return { isIab: true, app: "twitter" };
  if (/LinkedInApp/i.test(ua))                          return { isIab: true, app: "linkedin" };
  if (/TelegramBot|TelegramWebApp/i.test(ua))           return { isIab: true, app: "telegram" };
  return { isIab: false, app: null };
}

export function detectPlatform(ua: string): "ios" | "android" | "other" {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua))          return "android";
  return "other";
}

/**
 * Open `url` outside any in-app browser when possible.
 *
 * Browser/app matrix (verified against Bouncy.ai and current iOS/Android):
 *   - iOS Instagram     -> instagram://extbrowser/?url=...      (reliable)
 *   - iOS Threads       -> barcelona://extbrowser/?url=...      (reliable)
 *   - iOS Facebook/Msgr -> no public schema, falls through      (stays in IAB)
 *   - iOS Safari (out)  -> googlechrome:// then x-safari- then plain (best-effort)
 *   - Android (any IAB) -> intent://...;package=com.android.chrome;... (reliable)
 *   - Everything else   -> window.location.href = url
 */
export function openExternal(url: string): void {
  if (typeof window === "undefined") return;
  const ua = navigator.userAgent || "";
  const platform = detectPlatform(ua);
  const { app } = detectIab(ua);

  // ── iOS Meta apps that publish a working extbrowser schema ────
  if (platform === "ios" && app === "instagram") {
    window.location.replace(`instagram://extbrowser/?url=${encodeURIComponent(url)}`);
    return;
  }
  if (platform === "ios" && app === "threads") {
    window.location.replace(`barcelona://extbrowser/?url=${encodeURIComponent(url)}`);
    return;
  }

  // ── Android: intent URL targeting Chrome ──────────────────────
  if (platform === "android") {
    try {
      const t = new URL(url);
      const intentUrl =
        `intent://${t.host}${t.pathname}${t.search}` +
        `#Intent;scheme=${t.protocol.replace(":", "")};` +
        `package=com.android.chrome;` +
        `S.browser_fallback_url=${encodeURIComponent(url)};end`;
      window.location.href = intentUrl;
      return;
    } catch {
      // fall through to plain navigation
    }
  }

  // ── iOS Safari (or non-IAB iOS) cascade ───────────────────────
  if (platform === "ios" && !app) {
    const noProto = url.replace(/^https?:\/\//, "");
    setTimeout(() => { window.location.href = `googlechrome://${noProto}`; }, 0);
    setTimeout(() => { window.location.href = `x-safari-${url}`; }, 200);
    setTimeout(() => { window.location.href = url; }, 400);
    return;
  }

  // ── Default fallback ──────────────────────────────────────────
  window.location.href = url;
}
