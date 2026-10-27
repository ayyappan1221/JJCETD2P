# JJCETD2P — D2P Lab Component Management System

> **Status:** In Development — Full-stack application built with Next.js + Neon Postgres

## Overview

JJCETD2P is a laboratory component management system for **J.J. College of Engineering and Technology (JJCET)**, Ammapettai, Tiruchirappalli. It digitizes laboratory inventory, student borrowing, approval workflows, component issuing and returns, stock management, overdue tracking, reports, notifications, and administrative operations.

## Quick Start

The application lives in the `jjcetd2p/` directory.

```bash
cd jjcetd2p
npm install
npm run db:setup        # Create local database (pglite)
npm run dev             # Start dev server at http://localhost:3000
```

Then seed demo data:
```bash
curl -X POST http://localhost:3000/api/v1/seed -H "Content-Type: application/json" -d '{"secret":"dev-seed-secret"}'
```

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Administrator | admin@jjcet.ac.in | Admin@123 |
| D2P In-Charge | incharge@jjcet.ac.in | Incharge@123 |
| Lab Staff | staff@jjcet.ac.in | Staff@123 |
| Student | student@jjcet.ac.in | Student@123 |

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend:** Next.js Route Handlers (serverless) — no separate backend
- **Database:** Neon Postgres (via Vercel Marketplace) / pglite (local dev)
- **ORM:** Drizzle ORM
- **Auth:** Auth.js v5 (Credentials + JWT)
- **Deployment:** Vercel (single deployable)

## Architecture

```
Browser → Vercel (Next.js) → Neon Postgres
```

Modular monolith — frontend, API, and database access in one Next.js application. No separate backend server, no Docker, no Python.

## User Roles

| Role | Access |
|---|---|
| Administrator | Users, roles, inventory, categories, reports, audit logs, settings |
| D2P In-Charge | Approvals, inventory overview, overdue, reports, audit history |
| Lab Staff | Inventory ops, issue/return, stock receipts/adjustments, overdue |
| Student | Browse, request, track, history, notifications |

## Application Pages

- **Public:** Login, Password Recovery, Access Denied
- **Student:** Dashboard, Components, Requests, Issues, Notifications
- **Staff:** + Approvals, Returns, Stock, Overdue, Reports
- **Admin:** + Categories, Users, Audit Logs, Settings

## Database Schema

11 tables: `profiles`, `user_roles`, `categories`, `components`, `borrowing_requests`, `issue_records`, `return_records`, `stock_movements`, `notifications`, `audit_logs`, `app_settings`

## API Endpoints

All under `/api/v1/`: auth, users, categories, components, borrowing-requests, approvals, issues, returns, stock-movements, overdue, notifications, reports, audit-logs, dashboard, health, seed

## Excluded Scope

Per project requirements, the following are **not** implemented:
- Damage List / Damage Management
- Damage Reports / Damage Analytics
- Separate damaged-component tracking

## Developer

Ayyappan P — B.E. CSE, JJCET (2024–2028)

## License

Academic/Institutional use.
