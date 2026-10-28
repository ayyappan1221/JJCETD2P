"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, CheckCircle,
  ArrowRightLeft, RotateCcw, Truck, AlertTriangle, Bell, BarChart3,
  ScrollText, Users, Settings, LogOut, Menu, X, Cpu, Wifi, Info, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/components", label: "Components", icon: Package, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/project-idea", label: "Project Idea", icon: FileText, roles: ["STUDENT", "ADMIN", "D2P_INCHARGE"] },
  { href: "/categories", label: "Categories", icon: FolderTree, roles: ["ADMIN"] },
  { href: "/requests", label: "Borrow Requests", icon: ShoppingCart, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/approvals", label: "Approvals", icon: CheckCircle, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/issues", label: "Issues", icon: ArrowRightLeft, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/returns", label: "Returns", icon: RotateCcw, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/stock", label: "Stock", icon: Truck, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/overdue", label: "Overdue", icon: AlertTriangle, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  { href: "/about", label: "About", icon: Info, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const roles = (session?.user as any)?.roles || [];
  const filteredNav = navItems.filter((item) => item.roles.some((r) => roles.includes(r)));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile toggle */}
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">JJCETD2P</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">IoT Lab Management</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}>
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{session?.user?.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{session?.user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
