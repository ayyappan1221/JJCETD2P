"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, rollNumber, department }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Signup failed"); setLoading(false); return; }
      router.push("/login");
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-xl shadow-blue-500/30 mb-4">
            <Cpu className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">JJCETD2P</h1>
          <p className="text-blue-200 mt-1">Create a student account</p>
        </div>

        <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>Register as a student</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@jjcet.ac.in" required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rollNumber">Roll Number (optional)</Label>
                <Input id="rollNumber" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department (optional)</Label>
                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
