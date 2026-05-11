// Detect social-media crawlers + link-preview bots by User-Agent.
//
// The big risk for adult-content funnels is Instagram's own crawler:
// it visits links in bios, parses outbound URLs, and flags accounts
// that funnel to OF/Fansly. Other Meta surfaces (FB, WhatsApp
// previews) share the same crawler infrastructure (facebookexternalhit
// + the newer meta-externalagent), so the same UA check catches all
// three.
//
// Real users in the IG in-app browser have full WebKit/Mobile markers
// followed by "Instagram x.y.z" — that UA is NOT matched here. Only
// shorter, bot-identifying UAs match.

export interface BotInfo {
  /** True when the request looks like an automated crawler. */
  isBot: boolean;
  /** Short identifier, used for logging / analytics. null when not a bot. */
  name: string | null;
}

const META_BOTS = [
  "facebookexternalhit", // Meta link-preview crawler (IG, FB, WhatsApp)
  "meta-externalagent",  // newer Meta variant
  "facebookcatalog",
  "facebookbot",
];

const SOCIAL_BOTS: Record<string, string> = {
  twitterbot:    "twitter",
  linkedinbot:   "linkedin",
  slackbot:      "slack",
  discordbot:    "discord",
  telegrambot:   "telegram",
  snapchatbot:   "snapchat",
  pinterestbot:  "pinterest",
  bytespider:    "tiktok",
  tiktokspider:  "tiktok",
  redditbot:     "reddit",
};

const SEARCH_BOTS: Record<string, string> = {
  googlebot:     "google",
  bingbot:       "bing",
  yandexbot:     "yandex",
  duckduckbot:   "duckduckgo",
  applebot:      "apple",
  baiduspider:   "baidu",
};

const SEO_BOTS: Record<string, string> = {
  ahrefsbot:     "ahrefs",
  semrushbot:    "semrush",
  mj12bot:       "majestic",
  dotbot:        "moz",
};

export function detectBot(userAgent: string | null | undefined): BotInfo {
  if (!userAgent) return { isBot: false, name: null };
  const ua = userAgent.toLowerCase();

  // Meta family first — this is the important one for IG bios.
  for (const needle of META_BOTS) {
    if (ua.includes(needle)) return { isBot: true, name: "meta" };
  }
  for (const [needle, name] of Object.entries(SOCIAL_BOTS)) {
    if (ua.includes(needle)) return { isBot: true, name };
  }
  for (const [needle, name] of Object.entries(SEARCH_BOTS)) {
    if (ua.includes(needle)) return { isBot: true, name };
  }
  for (const [needle, name] of Object.entries(SEO_BOTS)) {
    if (ua.includes(needle)) return { isBot: true, name };
  }

  // Generic "bot"/"crawl"/"spider" tokens — last-resort catch-all.
  // A real Mobile UA never contains these substrings.
  if (/\b(bot|crawler|spider)\b/.test(ua) && !ua.includes("mozilla")) {
    return { isBot: true, name: "generic" };
  }

  return { isBot: false, name: null };
}
