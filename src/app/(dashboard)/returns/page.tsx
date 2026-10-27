"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { RotateCcw, Search } from "lucide-react";

async function fetchActiveIssues() {
  const res = await fetch("/api/v1/issues?status=ACTIVE&pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function ReturnsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [returnDialog, setReturnDialog] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["active-issues"], queryFn: fetchActiveIssues });

  const returnMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-issues"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setReturnDialog(null);
      setQty(1);
      setNotes("");
      toast.success("Return recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data?.data || []).filter((r: any) =>
    r.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    r.componentName?.toLowerCase().includes(search.toLowerCase()) ||
    r.reference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Component Returns</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search active issues..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No active issues</TableCell></TableRow>
              ) : (
                filtered.map((r: any) => (
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

      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {returnDialog?.componentName} - Outstanding: {returnDialog?.outstanding}
            </p>
            <div><Label>Quantity</Label><Input type="number" min={1} max={returnDialog?.outstanding} value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <Button onClick={() => returnMutation.mutate({ issueId: returnDialog.id, quantity: qty, notes })} className="w-full" disabled={returnMutation.isPending}>Record Return</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
