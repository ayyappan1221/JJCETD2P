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
import { Plus, Search, Edit, LayoutGrid, List, Package } from "lucide-react";
import { toast } from "sonner";

async function fetchComponents(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/components?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchCategories() {
  const res = await fetch("/api/v1/categories?pageSize=100");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function ComponentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);

  const [form, setForm] = useState({
    code: "", name: "", categoryId: "", description: "", unit: "pcs",
    totalQuantity: 0, storageLocation: "", minStockThreshold: 0, imageUrl: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["components", search, categoryId, page],
    queryFn: () => fetchComponents({ search, categoryId, page: String(page), pageSize: "24" }),
  });

  const { data: categoriesData } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const createMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/components", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["components"] }); setDialogOpen(false); resetForm(); toast.success("Component created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/v1/components/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["components"] }); setDialogOpen(false); resetForm(); toast.success("Component updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ code: "", name: "", categoryId: "", description: "", unit: "pcs", totalQuantity: 0, storageLocation: "", minStockThreshold: 0, imageUrl: "" });
    setEditingComponent(null);
  };

  const openEdit = (comp: any) => {
    setEditingComponent(comp);
    setForm({
      code: comp.code, name: comp.name, categoryId: comp.categoryId ?? "",
      description: comp.description || "", unit: comp.unit, totalQuantity: comp.totalQuantity,
      storageLocation: comp.storageLocation || "", minStockThreshold: comp.minStockThreshold,
      imageUrl: comp.imageUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const payload = { ...form, categoryId: form.categoryId || null, totalQuantity: Number(form.totalQuantity), minStockThreshold: Number(form.minStockThreshold) };
    if (editingComponent) updateMutation.mutate({ id: editingComponent.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Components</h1>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
            <List className="h-4 w-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Component</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingComponent ? "Edit Component" : "Add Component"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editingComponent} /></div>
                  <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v || "" })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(categoriesData?.data || []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                  <div><Label>Quantity</Label><Input type="number" value={form.totalQuantity} onChange={(e) => setForm({ ...form, totalQuantity: Number(e.target.value) })} disabled={!!editingComponent} /></div>
                  <div><Label>Min Threshold</Label><Input type="number" value={form.minStockThreshold} onChange={(e) => setForm({ ...form, minStockThreshold: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Storage Location</Label><Input value={form.storageLocation} onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} /></div>
                <div><Label>Image URL</Label><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." /></div>
                <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>{editingComponent ? "Update" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search components..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v === "all" ? "" : (v || "")); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categoriesData?.data || []).map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (<Card key={i}><CardContent className="p-4"><div className="h-40 bg-slate-100 animate-pulse rounded" /></CardContent></Card>))}
        </div>
      ) : viewMode === "grid" ? (
        /* Amazon-style product cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(data?.data || []).map((comp: any) => (
            <Card key={comp.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                {comp.imageUrl ? (
                  <img src={comp.imageUrl} alt={comp.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-16 w-16 text-slate-300" />
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-2">{comp.name}</h3>
                  <Badge variant={comp.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
                    {comp.isActive ? "Active" : "Archived"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{comp.code}</p>
                {comp.categoryName && <p className="text-xs text-muted-foreground">{comp.categoryName}</p>}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Avail: </span>
                    <span className={comp.availableQuantity <= comp.minStockThreshold ? "text-red-600 font-bold" : "font-semibold"}>
                      {comp.availableQuantity}
                    </span>
                    <span className="text-muted-foreground"> / {comp.totalQuantity}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(comp)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                {comp.availableQuantity <= comp.minStockThreshold && comp.minStockThreshold > 0 && comp.totalQuantity > 0 && (
                  <Badge variant="destructive" className="text-xs w-full justify-center">Low Stock</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table view */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Issued</TableHead><TableHead>Location</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data || []).map((comp: any) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-mono text-sm">{comp.code}</TableCell>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>{comp.categoryName || "-"}</TableCell>
                    <TableCell className="text-right">{comp.totalQuantity}</TableCell>
                    <TableCell className="text-right">
                      <span className={comp.availableQuantity <= comp.minStockThreshold && comp.minStockThreshold > 0 && comp.totalQuantity > 0 ? "text-red-600 font-bold" : ""}>{comp.availableQuantity}</span>
                    </TableCell>
                    <TableCell className="text-right">{comp.issuedQuantity}</TableCell>
                    <TableCell className="text-sm">{comp.storageLocation || "-"}</TableCell>
                    <TableCell><Badge variant={comp.isActive ? "default" : "secondary"}>{comp.isActive ? "Active" : "Archived"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(comp)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {data.page} of {data.totalPages} ({data.total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
