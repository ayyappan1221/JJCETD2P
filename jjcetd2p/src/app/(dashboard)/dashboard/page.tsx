"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, ArrowRightLeft, AlertTriangle, Clock, TrendingDown, CheckCircle2, Cpu, Wifi, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function fetchDashboard() {
  const res = await fetch("/api/v1/dashboard");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (<Card key={i}><CardContent className="p-6"><div className="h-16 bg-slate-100 animate-pulse rounded" /></CardContent></Card>))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Components", value: data?.totalComponents || 0, icon: Package, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
    { label: "Available Stock", value: data?.totalAvailable || 0, icon: Package, gradient: "from-green-500 to-emerald-600", bg: "bg-green-50" },
    { label: "Issued Stock", value: data?.totalIssued || 0, icon: ArrowRightLeft, gradient: "from-orange-500 to-amber-600", bg: "bg-orange-50" },
    { label: "Pending Requests", value: data?.pendingRequests || 0, icon: ShoppingCart, gradient: "from-yellow-500 to-amber-500", bg: "bg-yellow-50" },
    { label: "Approved (Awaiting)", value: data?.approvedAwaitingIssue || 0, icon: CheckCircle2, gradient: "from-cyan-500 to-blue-500", bg: "bg-cyan-50" },
    { label: "Active Transactions", value: data?.activeTransactions || 0, icon: Clock, gradient: "from-purple-500 to-violet-600", bg: "bg-purple-50" },
    { label: "Overdue Items", value: data?.overdueTransactions || 0, icon: AlertTriangle, gradient: "from-red-500 to-rose-600", bg: "bg-red-50" },
    { label: "Low Stock Alerts", value: data?.lowStockComponents || 0, icon: TrendingDown, gradient: "from-red-600 to-pink-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">IoT Lab Operations Overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Activity className="h-4 w-4 text-green-500" />
          <span>Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            Recent Borrowing Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentActivity?.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{item.componentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.studentName} · {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{item.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
