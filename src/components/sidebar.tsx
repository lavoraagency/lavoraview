"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Settings, LogOut, LayoutGrid, PieChart, ClipboardList, TrendingUp, TableProperties, History, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/analytics", label: "Analytics", icon: PieChart },
  { href: "/dashboard/posts", label: "Posts", icon: LayoutGrid },
  { href: "/dashboard/top-reels", label: "Top Reels", icon: TrendingUp },
  { href: "/dashboard/pattern-analysis", label: "Pattern Analysis", icon: TableProperties },
  { href: "/dashboard/profiles", label: "Profiles", icon: Users },
  { href: "/dashboard/reposter", label: "Reposter Overview", icon: ClipboardList },
  { href: "/dashboard/changelog", label: "Changelog", icon: History },
  { href: "/dashboard/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="w-64 min-h-screen bg-sidebar flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Lavora" className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-white font-semibold text-sm">LavoraView</div>
            <div className="text-slate-400 text-xs">Lavora Agency</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-gold-gradient text-white shadow-sm"
                  : "text-slate-400 hover:bg-sidebar-accent hover:text-white"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-sidebar-accent hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
