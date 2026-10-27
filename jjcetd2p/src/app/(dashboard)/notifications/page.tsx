"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

async function fetchNotifications() {
  const res = await fetch("/api/v1/notifications?pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All marked as read");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" /> Notifications
          {data?.unreadCount > 0 && <Badge variant="destructive">{data.unreadCount}</Badge>}
        </h1>
        <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          <Check className="h-4 w-4 mr-2" /> Mark All Read
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading ? (
              <p className="p-8 text-center text-muted-foreground">Loading...</p>
            ) : (data?.data || []).length === 0 ? (
              <p className="p-8 text-center text-muted-foreground">No notifications</p>
            ) : (
              (data?.data || []).map((n: any) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between cursor-pointer hover:bg-slate-50 ${!n.isRead ? "bg-blue-50/50" : ""}`}
                  onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                >
                  <div>
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
