"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";

async function fetchUsers(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/v1/users?${qs}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const ROLES = ["ADMIN", "D2P_INCHARGE", "STUDENT"];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!detailUser) { setHistory([]); return; }
    setHistoryLoading(true);
    fetch(`/api/v1/borrowing-requests?studentId=${detailUser.id}&pageSize=50`)
      .then((r) => r.json())
      .then((d) => setHistory(d?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [detailUser]);
  const [form, setForm] = useState({
    email: "", password: "", fullName: "", rollNumber: "", department: "", roles: ["STUDENT"] as string[],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => fetchUsers({ search, pageSize: "50" }),
  });

  const createMutation = useMutation({
    mutationFn: async (d: any) => {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDialogOpen(false);
      setForm({ email: "", password: "", fullName: "", rollNumber: "", department: "", roles: ["STUDENT"] });
      toast.success("User created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> User Management</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add User</Button>
      </div>

      <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Register No.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users</TableCell></TableRow>
              ) : (
                (data?.data || []).map((u: any) => (
                  <TableRow key={u.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailUser(u)}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(u.roles || []).map((r: string) => (
                          <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{u.department || "-"}</TableCell>
                    <TableCell>{u.registerNumber || "-"}</TableCell>
                    <TableCell><Badge variant={u.isActive ? "default" : "secondary"}>{u.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Full Name</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Roll Number</Label><Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            </div>
            <div>
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.roles.includes(role)} onCheckedChange={() => toggleRole(role)} />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => createMutation.mutate(form)} className="w-full" disabled={createMutation.isPending}>Create User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{detailUser?.fullName} — Details</DialogTitle></DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {detailUser.fullName}</div>
                <div><span className="text-muted-foreground">Email:</span> {detailUser.email}</div>
                <div><span className="text-muted-foreground">Register No:</span> {detailUser.registerNumber || "-"}</div>
                <div><span className="text-muted-foreground">SPR No:</span> {detailUser.sprNumber || "-"}</div>
                <div><span className="text-muted-foreground">Mobile:</span> {detailUser.mobileNumber || "-"}</div>
                <div><span className="text-muted-foreground">Department:</span> {detailUser.department || "-"}</div>
                <div><span className="text-muted-foreground">Section:</span> {detailUser.section || "-"}</div>
                <div><span className="text-muted-foreground">Academic Year:</span> {detailUser.academicYear || "-"}</div>
                <div><span className="text-muted-foreground">Roles:</span> {(detailUser.roles || []).join(", ")}</div>
                <div><span className="text-muted-foreground">Status:</span> {detailUser.isActive ? "Active" : "Inactive"}</div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Borrowing History</h3>
                {historyLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No borrowing requests</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Return Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                          <TableCell className="text-sm">{r.componentName}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.status}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(r.requestedReturnDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
