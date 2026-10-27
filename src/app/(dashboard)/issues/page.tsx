"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRightLeft } from "lucide-react";

async function fetchIssues(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/issues?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchApprovedRequests() {
  const res = await fetch("/api/v1/borrowing-requests?status=APPROVED&pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [issueDialog, setIssueDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["issues", status, page],
    queryFn: () => fetchIssues({ status: status === "all" ? "" : status, page: String(page), pageSize: "20" }),
  });

  const { data: approvedData } = useQuery({
    queryKey: ["approved-requests"],
    queryFn: fetchApprovedRequests,
  });

  const issueMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch("/api/v1/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["approved-requests"] });
      setIssueDialog(false);
      setSelectedRequest("");
      toast.success("Component issued");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Component Issues</h1>
        <Button onClick={() => setIssueDialog(true)}>
          <ArrowRightLeft className="h-4 w-4 mr-2" /> Issue Component
        </Button>
      </div>

      <Select value={status} onValueChange={(v) => { setStatus(v || "all"); setPage(1); }}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="PARTIALLY_RETURNED">Partial</SelectItem>
          <SelectItem value="RETURNED">Returned</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
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
    </div>
  );
}
