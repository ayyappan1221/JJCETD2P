"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";

async function fetchOverdue() {
  const res = await fetch("/api/v1/overdue?pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function OverduePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["overdue"], queryFn: fetchOverdue });

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/overdue/notify", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => toast.success(d.message),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" /> Overdue Items
        </h1>
        <Button variant="outline" onClick={() => notifyMutation.mutate()} disabled={notifyMutation.isPending}>
          <Mail className="h-4 w-4 mr-2" /> Send Overdue Emails
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Overdue Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No overdue items</TableCell></TableRow>
              ) : (
                (data?.data || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.componentName}</TableCell>
                    <TableCell className="text-red-600 font-bold">{r.outstanding}</TableCell>
                    <TableCell className="text-sm">{new Date(r.expectedReturnDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="destructive">{r.overdueDays} days</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
