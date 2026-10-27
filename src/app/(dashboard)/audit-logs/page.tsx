"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

async function fetchAuditLogs() {
  const res = await fetch("/api/v1/audit-logs?pageSize=50");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["audit-logs"], queryFn: fetchAuditLogs });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6" /> Audit Logs
      </h1>
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
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : (data?.data || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit logs</TableCell></TableRow>
              ) : (
                (data?.data || []).map((log: any) => (
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
    </div>
  );
}
