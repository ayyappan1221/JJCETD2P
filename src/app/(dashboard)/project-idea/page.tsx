"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, ShoppingCart, Trash2, Send, FileText } from "lucide-react";

interface MatchedComponent {
  componentId: string;
  code: string;
  name: string;
  categoryName: string | null;
  availableQuantity: number;
  totalQuantity: number;
  unit: string;
  imageUrl: string | null;
  suggestedQuantity: number;
  matchedScore: number;
}

export default function ProjectIdeaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [matched, setMatched] = useState<MatchedComponent[]>([]);
  const [cart, setCart] = useState<MatchedComponent[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [purpose, setPurpose] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/v1/project-ideas/parse", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Parse failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedText(data.extractedText || "");
      setMatched(data.matchedComponents || []);
      // auto-add all matched to cart
      setCart((data.matchedComponents || []).map((c: MatchedComponent) => ({ ...c })));
      toast.success(`Found ${data.totalMatched} matching components`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleParse = () => {
    if (!file) { toast.error("Select a file first"); return; }
    parseMutation.mutate(file);
  };

  const updateQty = (id: string, qty: number) => {
    setCart((prev) => prev.map((c) => (c.componentId === id ? { ...c, suggestedQuantity: Math.max(1, qty) } : c)));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.componentId !== id));
  };

  const addToCart = (comp: MatchedComponent) => {
    if (cart.some((c) => c.componentId === comp.componentId)) {
      toast.info("Already in cart");
      return;
    }
    setCart((prev) => [...prev, { ...comp }]);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    if (!returnDate) { toast.error("Select a return date"); return; }
    setSubmitting(true);
    try {
      for (const item of cart) {
        const res = await fetch("/api/v1/borrowing-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            componentId: item.componentId,
            quantity: item.suggestedQuantity,
            purpose: purpose || "Project idea submission",
            requestedReturnDate: new Date(returnDate).toISOString(),
          }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      }
      toast.success("Requests submitted for approval");
      setCart([]);
      setMatched([]);
      setFile(null);
      setExtractedText("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Project Idea Submission</h1>
      <p className="text-sm text-muted-foreground">
        Upload your project idea using the college template (Word/PDF). We'll extract component requirements and match them with inventory.
      </p>

      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Project Idea</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".docx,.pdf,.txt" onChange={handleFileChange} />
          <Button onClick={handleParse} disabled={!file || parseMutation.isPending}>
            {parseMutation.isPending ? "Parsing..." : "Parse & Match Components"}
          </Button>
          {extractedText && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Extracted text preview</summary>
              <pre className="mt-2 whitespace-pre-wrap max-h-40 overflow-auto bg-slate-100 p-2 rounded">{extractedText}</pre>
            </details>
          )}
        </CardContent>
      </Card>

      {matched.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle>Matched Components ({matched.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {matched.map((c) => (
              <div key={c.componentId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.categoryName} · Available: {c.availableQuantity}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addToCart(c)} disabled={cart.some((x) => x.componentId === c.componentId)}>
                  Add to Cart
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {cart.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Request Cart ({cart.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {cart.map((c) => (
              <div key={c.componentId} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Available: {c.availableQuantity}</p>
                </div>
                <Input type="number" min={1} max={c.availableQuantity} value={c.suggestedQuantity}
                  onChange={(e) => updateQty(c.componentId, Number(e.target.value))}
                  className="w-20 h-9" />
                <Button size="sm" variant="ghost" onClick={() => removeFromCart(c.componentId)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Purpose</Label>
                <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Project name" />
              </div>
              <div>
                <Label className="text-sm">Requested Return Date</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              <Send className="h-4 w-4 mr-2" /> {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}