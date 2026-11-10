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
import { CheckCircle, XCircle, Package, Clock, CheckCircle2, Truck } from "lucide-react";

async function fetchByStatus(status: string) {
  const res = await fetch(`/api/v1/borrowing-requests?status=${status}&pageSize=50`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<"pending" | "approved" | "issued">("pending");
  const [rejectDialog, setRejectDialog] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [issueDialog, setIssueDialog] = useState<any>(null);

  const { data: pendingData, isLoading: pendingLoading } = useQuery({ queryKey: ["pending-requests"], queryFn: () => fetchByStatus("PENDING") });
  const { data: approvedData, isLoading: approvedLoading } = useQuery({ queryKey: ["approved-requests"], queryFn: () => fetchByStatus("APPROVED") });
  const { data: issuedData, isLoading: issuedLoading } = useQuery({ queryKey: ["issued-requests"], queryFn: () => fetchByStatus("ISSUED") });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
    queryClient.invalidateQueries({ queryKey: ["approved-requests"] });
    queryClient.invalidateQueries({ queryKey: ["issued-requests"] });
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { invalidateAll(); toast.success("Approved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/v1/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject", rejectionReason: reason }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setRejectDialog(null); setReason(""); toast.success("Rejected"); },
    onError: (e: any) => toast.error(e.message),
  });

  const issueMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/v1/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: id }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { invalidateAll(); setIssueDialog(null); toast.success("Components issued"); },
    onError: (e: any) => toast.error(e.message),
  });

  const renderItems = (r: any) => {
    const items = r.items && r.items.length > 0 ? r.items : (r.componentId ? [{ componentName: r.componentName, quantity: r.quantity }] : []);
    return items.map((it: any, i: number) => (
      <div key={i} className="text-xs">{it.componentName} × {it.quantity}</div>
    ));
  };

  const pendingCount = (pendingData?.data || []).length;
  const approvedCount = (approvedData?.data || []).length;
  const issuedCount = (issuedData?.data || []).length;

  const summaryCards = [
    { key: "pending" as const, label: "Pending", count: pendingCount, icon: Clock, color: "from-yellow-500 to-amber-500", bg: "bg-yellow-50" },
    { key: "approved" as const, label: "Approved", count: approvedCount, icon: CheckCircle2, color: "from-cyan-500 to-blue-500", bg: "bg-cyan-50" },
    { key: "issued" as const, label: "Issued", count: issuedCount, icon: Truck, color: "from-green-500 to-emerald-600", bg: "bg-green-50" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approval Queue</h1>

      {/* Summary cards in one row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          const isActive = active === c.key;
          return (
            <button key={c.key} onClick={() => setActive(c.key)}
              className={`text-left rounded-xl border transition-all ${isActive ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"} ${c.bg}`}>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.label}</p>
                  <p className="text-3xl font-bold mt-1 text-slate-900">{c.count}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail table for the selected section */}
      {active === "pending" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Pending Requests</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (pendingData?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending requests</TableCell></TableRow>
                ) : (
                  (pendingData?.data || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{renderItems(r)}</TableCell>
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
      )}

      {active === "approved" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Approved (Awaiting Issue)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (approvedData?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No approved requests awaiting issue</TableCell></TableRow>
                ) : (
                  (approvedData?.data || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{renderItems(r)}</TableCell>
                      <TableCell className="text-sm">{r.purpose || "-"}</TableCell>
                      <TableCell className="text-sm">{new Date(r.requestedReturnDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => issueMutation.mutate(r.id)}>
                          <Package className="h-4 w-4 mr-1" /> Issue Components
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {active === "issued" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Issued</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuedLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (issuedData?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No issued items</TableCell></TableRow>
                ) : (
                  (issuedData?.data || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{renderItems(r)}</TableCell>
                      <TableCell className="text-sm">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
