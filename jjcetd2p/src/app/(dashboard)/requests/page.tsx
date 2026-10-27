"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

async function fetchRequests(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/borrowing-requests?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchComponents(params: Record<string, string> = {}) {
  const qs = new URLSearchParams({ ...params, pageSize: "100" }).toString();
  const res = await fetch(`/api/v1/components?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ componentId: "", quantity: 1, purpose: "", requestedReturnDate: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["requests", status, page],
    queryFn: () => fetchRequests({ status: status === "all" ? "" : status, page: String(page), pageSize: "20" }),
  });

  const { data: componentsData } = useQuery({
    queryKey: ["components-all"],
    queryFn: () => fetchComponents({}),
  });

  const createMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/borrowing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setDialogOpen(false);
      setForm({ componentId: "", quantity: 1, purpose: "", requestedReturnDate: "" });
      toast.success("Request submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/borrowing-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request cancelled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Borrowing Requests</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button><Plus className="h-4 w-4 mr-2" /> New Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Borrowing Request</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Component</Label>
                <Select value={form.componentId} onValueChange={(v) => setForm({ ...form, componentId: v || "" })}>
                  <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
                  <SelectContent>
                    {(componentsData?.data || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} - {c.name} (avail: {c.availableQuantity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
              <div><Label>Purpose</Label><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
              <div><Label>Return Date</Label><Input type="datetime-local" value={form.requestedReturnDate} onChange={(e) => setForm({ ...form, requestedReturnDate: e.target.value })} /></div>
              <Button onClick={() => createMutation.mutate({ ...form, requestedReturnDate: new Date(form.requestedReturnDate).toISOString() })} className="w-full" disabled={createMutation.isPending}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Select value={status} onValueChange={(v) => { setStatus(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests</TableCell></TableRow>
              ) : (
                (data?.data || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                    <TableCell>{r.componentName}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(r.requestedReturnDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {["PENDING", "APPROVED"].includes(r.status) && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => cancelMutation.mutate(r.id)}>Cancel</Button>
                      )}
                    </TableCell>
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
