"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6" /> Application Settings
      </h1>
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Application settings can be managed here. Configure low-stock thresholds, notification preferences, and other system parameters.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Setting Key</Label>
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g., low_stock_email" />
            </div>
            <div>
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" />
            </div>
          </div>
          <Button className="mt-4" onClick={() => toast.info("Settings saved (placeholder)")}>Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
