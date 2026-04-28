"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, Settings, LogOut, LayoutGrid, PieChart, ClipboardList, TrendingUp, TableProperties, History, Bot, Search, Menu, X, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/analytics", label: "Analytics", icon: PieChart },
  { href: "/dashboard/posts", label: "Posts", icon: LayoutGrid },
  { href: "/dashboard/top-reels", label: "Top Reels", icon: TrendingUp },
  { href: "/dashboard/research", label: "Research", icon: Search },
  { href: "/dashboard/pattern-analysis", label: "Pattern Analysis", icon: TableProperties },
  { href: "/dashboard/profiles", label: "Profiles", icon: Users },
  { href: "/dashboard/reposter", label: "Reposter Overview", icon: ClipboardList },
  { href: "/dashboard/links", label: "Link Pages", icon: LinkIcon },
  { href: "/dashboard/changelog", label: "Changelog", icon: History },
  { href: "/dashboard/ai-assistant", label: "AI Analysis Assistant", icon: Bot },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = original; };
    }
  }, [mobileOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const navContent = (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Lavora" className="w-9 h-9 rounded-full object-cover" />
          <div>
            <div className="text-white font-semibold text-sm">LavoraView</div>
            <div className="text-slate-400 text-xs">Lavora Agency</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Desktop sidebar — unchanged behavior on >=md */}
      <div className="hidden md:flex w-64 min-h-screen bg-sidebar flex-col">
        {navContent}
      </div>

      {/* Mobile top bar (hamburger) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Lavora" className="w-7 h-7 rounded-full object-cover" />
          <span className="text-white font-semibold text-sm">LavoraView</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-white p-2 -mr-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-sidebar flex flex-col shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
