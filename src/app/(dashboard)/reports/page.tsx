"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ScrollText, BarChart3 } from "lucide-react";

const REPORT_TYPES = [
  { value: "inventory-summary", label: "Inventory Summary" },
  { value: "issued-components", label: "Issued Components" },
  { value: "borrowing-requests", label: "Borrowing Requests" },
  { value: "overdue", label: "Overdue Items" },
  { value: "stock-movements", label: "Stock Movements" },
  { value: "low-stock", label: "Low Stock" },
  { value: "frequently-borrowed", label: "Frequently Borrowed" },
];

async function fetchAuditLogs() {
  const res = await fetch("/api/v1/audit-logs?pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function ReportsPage() {
  const [active, setActive] = useState<"reports" | "auditlogs">("reports");
  const [reportType, setReportType] = useState("inventory-summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report", reportType, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/v1/reports?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: active === "reports",
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled: active === "auditlogs",
  });

  const items = data?.items || data?.requests || data?.issues || [];
  const headers = items.length > 0 ? Object.keys(items[0]) : [];

  const exportCsv = () => {
    const params = new URLSearchParams({ type: reportType, format: "csv" });
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    window.open(`/api/v1/reports?${params}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports & Audit Logs</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => setActive("reports")}
          className={`text-left rounded-xl border transition-all ${active === "reports" ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"} bg-blue-50`}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reports</p>
              <p className="text-3xl font-bold mt-1 text-slate-900">{items.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
        <button onClick={() => setActive("auditlogs")}
          className={`text-left rounded-xl border transition-all ${active === "auditlogs" ? "ring-2 ring-blue-500 shadow-md" : "hover:shadow-md"} bg-slate-50`}>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Audit Logs</p>
              <p className="text-3xl font-bold mt-1 text-slate-900">{(auditData?.data || []).length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
              <ScrollText className="h-6 w-6 text-white" />
            </div>
          </div>
        </button>
      </div>

      {active === "reports" && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Reports</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
              <Button variant="outline" onClick={() => window.open("/api/v1/reports/export?format=pdf", "_blank")}><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
              <Button variant="outline" onClick={() => window.open("/api/v1/reports/export?format=docx", "_blank")}><Download className="h-4 w-4 mr-2" /> Export Word</Button>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v || "inventory-summary")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          {reportType === "inventory-summary" && data?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Components</p><p className="text-xl font-bold">{data.summary.totalComponents}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Units</p><p className="text-xl font-bold">{data.summary.totalUnits}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Available</p><p className="text-xl font-bold">{data.summary.totalAvailable}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Issued</p><p className="text-xl font-bold">{data.summary.totalIssued}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-xl font-bold text-red-600">{data.summary.lowStockCount}</p></CardContent></Card>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-8 text-center text-muted-foreground">Loading...</p>
              ) : items.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h) => (<TableHead key={h}>{h}</TableHead>))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row: any, i: number) => (
                      <TableRow key={i}>
                        {headers.map((h) => (
                          <TableCell key={h} className="text-sm">
                            {typeof row[h] === "boolean" ? (row[h] ? "Yes" : "No") : String(row[h] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {active === "auditlogs" && (
        <>
          <h2 className="text-xl font-semibold">Audit Logs</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : (auditData?.data || []).length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs</TableCell></TableRow>
                  ) : (
                    (auditData?.data || []).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{new Date(log.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{log.actorName}</TableCell>
                        <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                        <TableCell>{log.entityType}</TableCell>
                        <TableCell className="font-mono text-xs">{log.entityId?.substring(0, 8) || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
