// Single source of truth for the dashboard's tabs. Used by the sidebar
// (to render + filter nav), the middleware (to gate routes), and the
// Settings user-management UI (to pick which tabs an employee can see).

export interface DashboardTab {
  key: string;
  label: string;
  href: string;
}

export const DASHBOARD_TABS: DashboardTab[] = [
  { key: "analytics",        label: "Analytics",            href: "/dashboard/analytics" },
  { key: "posts",            label: "Posts",                href: "/dashboard/posts" },
  { key: "top-reels",        label: "Top Reels",            href: "/dashboard/top-reels" },
  { key: "research",         label: "Research",             href: "/dashboard/research" },
  { key: "pattern-analysis", label: "Pattern Analysis",     href: "/dashboard/pattern-analysis" },
  { key: "profiles",         label: "Profiles",             href: "/dashboard/profiles" },
  { key: "reposter",         label: "Reposter Overview",    href: "/dashboard/reposter" },
  { key: "links",            label: "Link Pages",           href: "/dashboard/links" },
  { key: "changelog",        label: "Changelog",            href: "/dashboard/changelog" },
  { key: "ai-assistant",     label: "AI Analysis Assistant", href: "/dashboard/ai-assistant" },
  { key: "settings",         label: "Settings",             href: "/dashboard/settings" },
];

export const ALL_TAB_KEYS = DASHBOARD_TABS.map((t) => t.key);

/** Map a pathname like /dashboard/top-reels/123 to its tab key. */
export function pathToTabKey(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/([^/?#]+)/);
  return m ? m[1] : null;
}
