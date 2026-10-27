# JJCETD2P — D2P Lab Component Management System

## Overview

JJCETD2P is a laboratory component management system for J.J. College of Engineering and Technology (JJCET), Ammapettai, Tiruchirappalli. It digitizes laboratory inventory, student borrowing, approval workflows, component issuing and returns, stock management, overdue tracking, reports, notifications, and administrative operations.

**Architecture:** Next.js full-stack (App Router) deployed on Vercel, with Neon Postgres as the database. Single deployable, no separate backend server, no Docker.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui + Lucide Icons |
| Database | Neon Postgres (via Vercel Marketplace) |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | Auth.js v5 (Credentials + JWT) |
| Data Fetching | TanStack Query + React Hook Form + Zod |
| Charts | Recharts |
| Deployment | Vercel |

## User Roles

| Role | Permissions |
|---|---|
| Administrator | Full system access: users, roles, inventory, categories, reports, audit logs, settings |
| D2P In-Charge | Oversight, approvals, inventory overview, overdue, reports, audit history |
| Lab Staff | Inventory operations, issue/return components, stock receipts/adjustments, overdue |
| Student | Browse inventory, submit requests, track status, view history/notifications |

## Features

- **Authentication** — Secure login with role-based access control
- **Dashboard** — Role-specific stats, charts, recent activity
- **Inventory Management** — CRUD, search, filter, sort, paginate, archive, min thresholds
- **Category Management** — CRUD with safe deletion
- **Borrowing Requests** — Submit, track status (PENDING/APPROVED/REJECTED/CANCELLED/ISSUED)
- **Approvals** — Approve/reject with reasons, audit trail
- **Component Issue** — Atomic stock update with concurrency protection
- **Returns** — Full and partial returns with outstanding tracking
- **Stock Management** — Receipts, adjustments, append-only movement history
- **Overdue Tracking** — Derived from deadlines, never includes fully returned items
- **Notifications** — In-app with deduplication
- **Reports** — 13 report types with filters and CSV export
- **Audit Logging** — Append-only, immutable for ordinary users

## Excluded Scope

The following are explicitly NOT implemented per project requirements:
- Damage List / Damage Management
- Damage Reports / Damage Analytics
- Separate damaged-component tracking

## Getting Started (Local Development)

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Create database (pglite, no external DB needed)
npm run db:setup

# Seed demo data
npm run dev
# Then: POST http://localhost:3000/api/v1/seed with {"secret":"dev-seed-secret"}

# Run dev server
npm run dev
```

### Demo Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Administrator | admin@jjcet.ac.in | Admin@123 |
| D2P In-Charge | incharge@jjcet.ac.in | Incharge@123 |
| Lab Staff | staff@jjcet.ac.in | Staff@123 |
| Student | student@jjcet.ac.in | Student@123 |

### Environment Variables

Copy `.env.example` to `.env.local`:

```env
# Local development (pglite)
DATABASE_URL=./data/jjcetd2p.db

# Production (Neon via Vercel Marketplace)
# DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
SEED_SECRET=dev-seed-secret
```

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add Neon database via Vercel Marketplace (auto-injects DATABASE_URL)
4. Set NEXTAUTH_SECRET and SEED_SECRET in Vercel env vars
5. Deploy

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected dashboard pages
│   │   ├── dashboard/
│   │   ├── components/
│   │   ├── categories/
│   │   ├── requests/
│   │   ├── approvals/
│   │   ├── issues/
│   │   ├── returns/
│   │   ├── stock/
│   │   ├── overdue/
│   │   ├── notifications/
│   │   ├── reports/
│   │   ├── audit-logs/
│   │   ├── users/
│   │   └── settings/
│   ├── api/v1/               # REST API routes
│   ├── login/
│   ├── access-denied/
│   └── layout.tsx
├── components/ui/            # shadcn/ui components
├── lib/
│   ├── db/                   # Drizzle schema + connection
│   ├── auth/                 # Auth.js config
│   ├── utils.ts              # Utilities
│   └── validations/          # Zod schemas
├── services/                 # Business logic (audit, notifications)
└── types/                    # TypeScript types
```

## Developer

Ayyappan P — B.E. CSE, JJCET (2024–2028)

## License

Academic/Institutional use.
