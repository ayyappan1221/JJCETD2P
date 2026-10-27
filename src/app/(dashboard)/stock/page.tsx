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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck, Plus } from "lucide-react";

async function fetchMovements(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/stock-movements?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchComponents() {
  const res = await fetch("/api/v1/components?pageSize=100");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function StockPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<"receipt" | "adjustment">("receipt");
  const [form, setForm] = useState({ componentId: "", quantity: 1, quantityDelta: 0, reason: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["stock-movements", typeFilter],
    queryFn: () => fetchMovements({ type: typeFilter === "all" ? "" : typeFilter, pageSize: "50" }),
  });

  const { data: componentsData } = useQuery({ queryKey: ["components-all"], queryFn: fetchComponents });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["components"] });
      setDialogOpen(false);
      setForm({ componentId: "", quantity: 1, quantityDelta: 0, reason: "" });
      toast.success("Recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Movements</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Movement</Button>
      </div>

      <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "all")}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="RECEIPT">Receipts</SelectItem>
          <SelectItem value="ISSUE">Issues</SelectItem>
          <SelectItem value="RETURN">Returns</SelectItem>
          <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Delta</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No movements</TableCell></TableRow>
              ) : (
                (data?.data || []).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-sm">{m.reference}</TableCell>
                    <TableCell>{m.component?.name}</TableCell>
                    <TableCell><Badge variant="outline">{m.type}</Badge></TableCell>
                    <TableCell className={m.quantityDelta > 0 ? "text-green-600" : "text-red-600"}>{m.quantityDelta > 0 ? "+" : ""}{m.quantityDelta}</TableCell>
                    <TableCell className="text-sm">{m.reason}</TableCell>
                    <TableCell className="text-sm">{m.performedBy?.fullName}</TableCell>
                    <TableCell className="text-sm">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Stock Movement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={movementType} onValueChange={(v: any) => setMovementType((v || "receipt") as "receipt" | "adjustment")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt (Add Stock)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (Correction)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Component</Label>
              <Select value={form.componentId} onValueChange={(v) => setForm({ ...form, componentId: v || "" })}>
                <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
                <SelectContent>
                  {(componentsData?.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {movementType === "receipt" ? (
              <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
            ) : (
              <div><Label>Delta (+/-)</Label><Input type="number" value={form.quantityDelta} onChange={(e) => setForm({ ...form, quantityDelta: Number(e.target.value) })} /></div>
            )}
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <Button
              onClick={() => saveMutation.mutate({
                type: movementType,
                componentId: form.componentId,
                quantity: movementType === "receipt" ? form.quantity : undefined,
                quantityDelta: movementType === "adjustment" ? form.quantityDelta : undefined,
                reason: form.reason,
              })}
              className="w-full"
              disabled={saveMutation.isPending}
            >
              Record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
