"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

async function fetchPending() {
  const res = await fetch("/api/v1/borrowing-requests?status=PENDING&pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["pending-requests"], queryFn: fetchPending });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      toast.success("Approved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/v1/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      setRejectDialog(null);
      setReason("");
      toast.success("Rejected");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Queue</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending requests</TableCell></TableRow>
              ) : (
                (data?.data || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                    <TableCell>{r.studentName}</TableCell>
                    <TableCell>{r.componentName}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell className="text-sm">{r.purpose || "-"}</TableCell>
                    <TableCell className="text-sm">{new Date(r.requestedReturnDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(r.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectDialog(r)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason })} className="w-full" disabled={rejectMutation.isPending}>Reject</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
