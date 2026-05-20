import { Sidebar } from "@/components/sidebar";
import { getCurrentUserPerms } from "@/lib/auth/permissions";
import { ALL_TAB_KEYS } from "@/lib/auth/tabs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const perms = await getCurrentUserPerms();
  // Owners see every tab; employees only their granted set. (Unauthenticated
  // requests never reach here — middleware redirects them to /login first.)
  const allowedTabs = perms?.role === "owner" ? ALL_TAB_KEYS : (perms?.allowedTabs || []);
  const isOwner = perms?.role === "owner";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar allowedTabs={allowedTabs} isOwner={isOwner} email={perms?.email || ""} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
