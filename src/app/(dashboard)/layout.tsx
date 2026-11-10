"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, CheckCircle,
  ArrowRightLeft, Bell, BarChart3,
  Users, LogOut, Menu, X, Cpu, Info, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/components", label: "Components", icon: Package, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/project-idea", label: "Project Idea", icon: FileText, roles: ["STUDENT", "ADMIN", "D2P_INCHARGE"] },
  { href: "/requests", label: "Borrow Requests", icon: ShoppingCart, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/approvals", label: "Approvals", icon: CheckCircle, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/issues", label: "Issues & Returns", icon: ArrowRightLeft, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
  { href: "/reports", label: "Reports & Logs", icon: BarChart3, roles: ["ADMIN", "D2P_INCHARGE"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
  { href: "/about", label: "About", icon: Info, roles: ["ADMIN", "D2P_INCHARGE", "STUDENT"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const roles = (session?.user as any)?.roles || [];
  const isAdmin = roles.includes("ADMIN");

  useEffect(() => {
    if (isAdmin) document.body.classList.add("comic-theme");
    else document.body.classList.remove("comic-theme");
    return () => document.body.classList.remove("comic-theme");
  }, [isAdmin]);

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

  const filteredNav = navItems.filter((item) => item.roles.some((r) => roles.includes(r)));

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile toggle */}
      <button className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

<aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} ${isAdmin ? "" : "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"}`}
  style={isAdmin ? {
    background: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0), linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
    backgroundSize: "12px 12px, 100% 100%",
    borderRight: "4px solid #000",
    boxShadow: "4px 0 0 0 #fbbf24",
  } : undefined}>
        <div className="flex flex-col h-full">
          {/* Logo */}
<div className={`p-5 ${isAdmin ? "border-b-4 border-black/40" : "border-b border-slate-200 dark:border-slate-800"}`} style={isAdmin ? { background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)" } : undefined}>
            <div className="flex items-center gap-3">
              <div className={isAdmin ? "h-12 w-12 rounded-lg bg-black flex items-center justify-center shadow-[3px_3px_0_0_#fff]" : "h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md"}>
                <Cpu className={isAdmin ? "h-6 w-6 text-yellow-300" : "h-5 w-5 text-white"} />
              </div>
              <div>
                <h1 className={isAdmin ? "text-2xl font-[family-name:var(--font-bangers)] tracking-wider text-black drop-shadow-[2px_2px_0_#fff]" : "text-lg font-bold text-slate-900 dark:text-white"}>JJCETD2P</h1>
                <p className={isAdmin ? "text-[11px] text-black/80 font-bold" : "text-[11px] text-slate-500 dark:text-slate-400 font-medium"}>IoT Lab Management</p>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${isAdmin ? "font-bold border-2" : "font-medium"} ${
                    isActive
                      ? isAdmin
                        ? "bg-yellow-400 text-black border-black shadow-[3px_3px_0_0_#000] -translate-y-0.5"
                        : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25"
                      : isAdmin
                        ? "text-white border-transparent hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}>
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
<div className={`p-4 ${isAdmin ? "border-t-4 border-black/40" : "border-t border-slate-200 dark:border-slate-800"}`} style={isAdmin ? { background: "linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)" } : undefined}>
            <div className="flex items-center gap-3 mb-3">
              <div className={isAdmin ? "h-10 w-10 rounded-full bg-black flex items-center justify-center text-yellow-300 font-[family-name:var(--font-bangers)] text-lg border-2 border-black shadow-[2px_2px_0_0_#000]" : "h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm"}>
                {session?.user?.name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className={isAdmin ? "text-sm font-bold text-black truncate" : "text-sm font-semibold truncate"}>{session?.user?.name}</div>
                <div className={isAdmin ? "text-xs text-black/70 truncate font-medium" : "text-xs text-slate-500 dark:text-slate-400 truncate"}>{session?.user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className={`w-full justify-start ${isAdmin ? "text-black font-bold hover:bg-red-500 hover:text-white border-2 border-transparent hover:border-black" : "text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"}`} onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut size={16} className="mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

<main className="flex-1 overflow-y-auto" style={isAdmin ? { background: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)", backgroundSize: "14px 14px" } : undefined}>
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
