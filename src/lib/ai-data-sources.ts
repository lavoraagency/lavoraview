// Pure data — usable from both client and server components.

export const AI_DATA_SOURCES = [
  { key: "profiles_info", label: "Profile Info", description: "Usernames, model, group, status, tags" },
  { key: "profile_daily", label: "Profile Daily Stats", description: "Followers, daily views/likes/comments/shares per account per day" },
  { key: "conversions", label: "Conversions", description: "Link clicks + new OF subs per account per day" },
  { key: "reels_in_period", label: "Reels Posted in Period", description: "Shortcode, views, likes, viral flag for reels posted in the window" },
  { key: "reel_snapshots", label: "Reel Daily Snapshots", description: "Per-reel views and view deltas per day" },
  { key: "video_analyses", label: "Video Pattern Analyses", description: "AI-analyzed patterns (outfit, music, scroll stopper etc.) for each reel" },
  { key: "other_changes", label: "Other Changes in Window", description: "Other Changelog entries within the time window (for confounding detection)" },
] as const;

export type AiDataSourceKey = typeof AI_DATA_SOURCES[number]["key"];

export const DEFAULT_AI_DATA_SOURCES: AiDataSourceKey[] = AI_DATA_SOURCES.map(s => s.key) as AiDataSourceKey[];
