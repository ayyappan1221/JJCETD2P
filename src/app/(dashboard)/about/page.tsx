"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Package, ShoppingCart, CheckCircle, RotateCcw, BarChart3, Bell } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">About JJCETD2P</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">D2P Lab Component Management System</p>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" /> Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <p>
            JJCETD2P is the laboratory component management system for the Design-to-Product (D2P) Lab at
            <strong> J.J. College of Engineering and Technology (JJCET)</strong>, Ammapettai, Tiruchirappalli.
            It digitizes laboratory inventory, student borrowing, approval workflows, component issuing and
            returns, stock management, overdue tracking, reports, notifications, and administrative operations.
          </p>
          <p>
            The system replaces manual registers with a secure, role-based digital platform that improves
            inventory accuracy, accountability, and laboratory efficiency for students and staff.
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Purpose</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <ul className="list-disc pl-5 space-y-1">
            <li>Maintain a centralized, searchable inventory of electronic components and modules.</li>
            <li>Enable students to request components for academic and project work.</li>
            <li>Streamline approval, issuing, and return workflows handled by the D2P In-Charge.</li>
            <li>Track outstanding and overdue borrowings with in-app and email notifications.</li>
            <li>Generate borrowing reports with PDF and Word export.</li>
            <li>Provide administrators with user management and audit visibility.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { icon: Package, label: "Inventory management with stock tracking" },
            { icon: ShoppingCart, label: "Component requests with cart" },
            { icon: CheckCircle, label: "Approval workflows" },
            { icon: RotateCcw, label: "Full & partial returns with overdue tracking" },
            { icon: BarChart3, label: "Borrowing reports (PDF & Word export)" },
            { icon: Bell, label: "In-app & email notifications" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <f.icon className="h-4 w-4 text-blue-600" />
              <span>{f.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700 dark:text-slate-300">
          Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui · Drizzle ORM · PGlite (local) / Neon Postgres (production) · Auth.js v5 · Vercel
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        Developer: Ayyappan P — B.E. CSE, JJCET (2024–2028). Academic/Institutional use.
      </p>
    </div>
  );
}