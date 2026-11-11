"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRightLeft, RotateCcw, AlertTriangle, Mail, Search } from "lucide-react";

async function fetchIssues(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/issues?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchActiveIssues() {
  const res = await fetch("/api/v1/issues?status=ACTIVE&pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchOverdue() {
  const res = await fetch("/api/v1/overdue?pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
async function fetchApprovedRequests() {
  const res = await fetch("/api/v1/borrowing-requests?status=APPROVED&pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function IssuesReturnsPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles || [];
  const canManage = roles.some((r: string) => ["ADMIN", "D2P_INCHARGE"].includes(r));
  const isStudent = !canManage;

  const [active, setActive] = useState<"issues" | "returns" | "overdue">("issues");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [issueDialog, setIssueDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState("");

  const [search, setSearch] = useState("");
  const [returnDialog, setReturnDialog] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["issues", status, page],
    queryFn: () => fetchIssues({ status: status === "all" ? "" : status, page: String(page), pageSize: "20" }),
  });
  const { data: activeData, isLoading: activeLoading } = useQuery({ queryKey: ["active-issues"], queryFn: fetchActiveIssues });
  const { data: overdueData, isLoading: overdueLoading } = useQuery({ queryKey: ["overdue"], queryFn: fetchOverdue });
  const { data: approvedData } = useQuery({ queryKey: ["approved-requests"], queryFn: fetchApprovedRequests, enabled: canManage });

  const issueMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch("/api/v1/issues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["issues"] }); queryClient.invalidateQueries({ queryKey: ["approved-requests"] }); setIssueDialog(false); setSelectedRequest(""); toast.success("Component issued"); },
    onError: (e: any) => toast.error(e.message),
  });

  const returnMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["active-issues"] }); queryClient.invalidateQueries({ queryKey: ["issues"] }); setReturnDialog(null); setQty(1); setNotes(""); toast.success("Return recorded"); },
    onError: (e: any) => toast.error(e.message),
  });

  const notifyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/overdue/notify", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => toast.success(d.message),
    onError: (e: any) => toast.error(e.message),
  });

  const filteredActive = (activeData?.data || []).filter((r: any) =>
    r.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    r.componentName?.toLowerCase().includes(search.toLowerCase()) ||
    r.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const sections = [
    { key: "issues" as const, label: "Issues", count: (data?.data || []).length, icon: ArrowRightLeft, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
    ...(canManage ? [{ key: "returns" as const, label: "Returns", count: (activeData?.data || []).length, icon: RotateCcw, color: "from-green-500 to-emerald-600", bg: "bg-green-50" }] : []),
    { key: "overdue" as const, label: "Overdue", count: (overdueData?.data || []).length, icon: AlertTriangle, color: "from-red-500 to-rose-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{canManage ? "Issues & Returns" : "My Issues"}</h1>
        {canManage && active === "issues" && (
          <Button onClick={() => setIssueDialog(true)}><ArrowRightLeft className="h-4 w-4 mr-2" /> Issue Component</Button>
        )}
        {canManage && active === "overdue" && (
          <Button variant="outline" onClick={() => notifyMutation.mutate()} disabled={notifyMutation.isPending}>
            <Mail className="h-4 w-4 mr-2" /> Send Overdue Emails
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button key={s.key} onClick={() => setActive(s.key)}
              className={`text-left rounded-xl border transition-all ${isActive ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"} ${s.bg}`}>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold mt-1 text-slate-900">{s.count}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {active === "issues" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Component Issues</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <Select value={status} onValueChange={(v) => { setStatus(v || "all"); setPage(1); }}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PARTIALLY_RETURNED">Partial</SelectItem>
                  <SelectItem value="RETURNED">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (data?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No issues</TableCell></TableRow>
                ) : (
                  (data?.data || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{r.componentName}</TableCell>
                      <TableCell>{r.quantityIssued}</TableCell>
                      <TableCell>{r.totalReturned}</TableCell>
                      <TableCell className={r.outstanding > 0 ? "text-red-600 font-bold" : ""}>{r.outstanding}</TableCell>
                      <TableCell className="text-sm">{new Date(r.expectedReturnDate).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {active === "returns" && canManage && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Component Returns</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search active issues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredActive.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No active issues</TableCell></TableRow>
                ) : (
                  filteredActive.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                      <TableCell>{r.studentName}</TableCell>
                      <TableCell>{r.componentName}</TableCell>
                      <TableCell>{r.quantityIssued}</TableCell>
                      <TableCell>{r.totalReturned}</TableCell>
                      <TableCell className="text-red-600 font-bold">{r.outstanding}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => { setReturnDialog(r); setQty(r.outstanding); }}>
                          <RotateCcw className="h-4 w-4 mr-1" /> Return
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

      {active === "overdue" && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /> Overdue Items</CardTitle></CardHeader>
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
                {overdueLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : (overdueData?.data || []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No overdue items</TableCell></TableRow>
                ) : (
                  (overdueData?.data || []).map((r: any) => (
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
      )}

      {canManage && issueDialog && (
        <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Issue Approved Component</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={selectedRequest} onValueChange={(v) => setSelectedRequest(v || "")}>
                <SelectTrigger><SelectValue placeholder="Select approved request" /></SelectTrigger>
                <SelectContent>
                  {(approvedData?.data || []).map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>{r.reference} - {r.studentName} - {r.componentName} (qty: {r.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => issueMutation.mutate(selectedRequest)} className="w-full" disabled={!selectedRequest || issueMutation.isPending}>Issue</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {canManage && (
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{returnDialog?.componentName} - Outstanding: {returnDialog?.outstanding}</p>
            <div><Label>Quantity</Label><Input type="number" min={1} max={returnDialog?.outstanding} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button onClick={() => returnMutation.mutate({ issueId: returnDialog.id, quantity: qty, notes })} className="w-full" disabled={returnMutation.isPending}>Record Return</Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
