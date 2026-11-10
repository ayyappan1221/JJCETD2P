# JJCETD2P — IoT Lab Component Management System
## Complete Working Application Document

**Prepared for:** College Management
**Date:** 2026
**Version:** Production (https://jjcetd2p.vercel.app)

---

## Table of Contents

1. Introduction
2. Technology Stack
3. User Roles & Permissions
4. Authentication & Account Management
5. Dashboard
6. Components
7. Categories
8. Project Idea
9. Borrowing Requests
10. Approvals
11. Issues
12. Returns
13. Stock
14. Overdue
15. Notifications
16. Reports
17. Audit Logs
18. Users (Admin)
19. Settings
20. About
21. Email Notifications
22. Key Data Model
23. Sensor Readings
24. Local Setup & Deployment
25. Notes for College Management

---

## 1. Introduction

JJCETD2P is a web-based IoT Lab Component Management System designed for the JJCET (J. J. College of Engineering and Technology) IoT laboratory. It replaces manual register-based tracking of electronic components, borrowing requests, issues, returns, and stock with a secure, role-based, auditable digital workflow.

The system is used by three kinds of users — Administrator, Lab In-Charge (D2P In-Charge), and Student — each with a dedicated set of screens and permissions. All data is stored in a PostgreSQL database (Neon in production) and the application is hosted on Vercel.

### 1.1 Objectives

- Digitise component inventory with categories, quantities, storage locations, and minimum-stock thresholds.
- Allow students to browse components (with real product photos), build a cart, and submit a single borrowing request covering multiple items.
- Provide a controlled approval workflow: Pending → Approved → Issued, with atomic stock updates.
- Track issues, partial returns, outstanding quantities, and overdue items.
- Send email + in-app notifications at every step, with a clickable button that opens the relevant page after login.
- Maintain a complete audit trail of every action for accountability.
- Give college management a dashboard of lab operations at a glance.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js Route Handlers (Node.js), Drizzle ORM |
| Database | PostgreSQL (Neon in production; PGlite for local) |
| Authentication | Auth.js (NextAuth) with role-based JWT sessions |
| Email | Nodemailer (SMTP) — graceful no-op when not configured |
| PDF / Word export | pdfkit, docx |
| Document parsing | mammoth, pdf-parse (for Project Idea upload) |
| Image processing | sharp (resize + WebP conversion) |
| Hosting | Vercel (production) |
| RBAC | Middleware (page-level) + requireRole (API-level) |

---

## 3. User Roles & Permissions

The system has exactly three roles. No "Lab Staff" or "damage" role exists.

| Role | Description | Access |
|---|---|---|
| ADMIN | Laboratory administrator | Full access to every page and API, including user management, settings, categories and audit logs. |
| D2P_INCHARGE | Lab in-charge | Approvals, issues, returns, stock, overdue, reports, audit logs, components, requests, notifications. |
| STUDENT | Registered student | Dashboard, components (browse + cart), project idea, own requests, own issues, notifications, about. |

### 3.1 Permission Matrix

| Page / Feature | ADMIN | D2P_INCHARGE | STUDENT |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| Components (view) | ✓ | ✓ | ✓ |
| Components (add/edit/delete/upload image) | ✓ | ✓ | — |
| Categories | ✓ | — | — |
| Project Idea upload | ✓ | ✓ | ✓ |
| Borrow Requests (view own) | ✓ all | ✓ all | ✓ own |
| Approvals (approve/reject/issue) | ✓ | ✓ | — |
| Issues (view) | ✓ all | ✓ all | ✓ own |
| Issues (issue component) | ✓ | ✓ | — |
| Returns (process return) | ✓ | ✓ | — |
| Stock management | ✓ | ✓ | — |
| Overdue tracking | ✓ | ✓ | — |
| Notifications | ✓ | ✓ | ✓ |
| Reports (view + export) | ✓ | ✓ | — |
| Audit Logs | ✓ | ✓ | — |
| Users (list + detail) | ✓ | — | — |
| Settings | ✓ | — | — |
| About | ✓ | ✓ | ✓ |

Permissions are enforced twice: in `src/middleware.ts` (page-level redirect to `/access-denied`) and in every API route via `requireRole` / `requireAuth`. Students are additionally filtered so they only ever see their own requests, issues and notifications — client-supplied roles are never trusted.

---

## 4. Authentication & Account Management

### 4.1 Login

- Route: `/login`. Email + password form.
- On success, a JWT session is created carrying the user's roles. The sidebar and pages are filtered by role.
- Forgot password link → `/forgot-password`.

### 4.2 Signup

- Route: `/signup`. Required fields: Full Name, Email, Register Number, SPR Number, Mobile Number, Department, Section, Academic Year, Password.
- Duplicate prevention: email and register number must be unique.
- New accounts are created with the STUDENT role by default.

### 4.3 Default seeded accounts

| Email | Password | Role | Name |
|---|---|---|---|
| plicentring9876@gmail.com | Ayyu@123 | ADMIN | Ayyappan P |
| aashikahamed029@gmail.com | Ayyu@123 | D2P_INCHARGE | Aashik Ahamed A |

---

## 5. Dashboard (`/dashboard`)

The first screen after login. Shows a live operations overview:

| Card | Meaning |
|---|---|
| Total Components | Number of component types in inventory. |
| Available Stock | Sum of available quantities across all components. |
| Issued Stock | Sum of issued quantities. |
| Pending Requests | Borrowing requests awaiting approval. |
| Approved (Awaiting) | Approved requests not yet issued. |
| Active Transactions | Issue records still active/partially returned. |
| Overdue Items | Issue records past their expected return date. |
| Low Stock Alerts | Components at or below minimum threshold. |

Below the cards: "Recent Borrowing Requests" list showing component, student, date and status. Empty state shows a placeholder icon.

---

## 6. Components (`/components`)

Amazon-style product cards showing every component with its real product photo, name, code, category, available/total stock and an "Add to Cart" button.

### 6.1 Views

- Grid view — product cards with photo, low-stock badge, add-to-cart.
- Table view — compact rows with a thumbnail, code, name, category, totals, available, issued, location, status and edit action.
- Search and category filter; pagination (20 per page).

### 6.2 Component images

- Each card shows the component's image. If none exists, a Package icon placeholder is shown (never a wrong/fake photo).
- Admin/In-Charge can upload an image (JPG/JPEG/PNG/WebP, max 5 MB) via the edit dialog; it is stored as a data URL in the database.
- Bulk images are shipped as static WebP files under `public/components/<CODE>.webp` and referenced by path in `image_url`.
- The edit dialog shows a live preview of the current image URL.

### 6.3 Cart & submission

- Students (and staff) can add components to a cart with quantities.
- A floating cart button shows the total item count.
- Submitting the cart sends a single request with all items + cartId, creating ONE borrowing request with multiple line items.
- One notification email is sent per staff member listing all requested items with a "Review Request" button linking to `/approvals`.

---

## 7. Categories (`/categories`) — Admin only

- List, create, edit and delete component categories.
- Each component belongs to one category; used for filtering on the Components page.

---

## 8. Project Idea (`/project-idea`)

- Students (and staff) upload a project proposal document (PDF or DOCX).
- The server parses the file (pdf-parse / mammoth) and matches mentioned components against the inventory.
- Matched components can be added to the cart in one click.
- Helps students quickly assemble the bill of materials for their project.

---

## 9. Borrowing Requests (`/requests`)

Lists all borrowing requests (students see only their own).

| Column | Meaning |
|---|---|
| Reference | Unique request reference (BR-…). |
| Component | Component name(s); multi-item requests show all items. |
| Qty | Total quantity requested. |
| Status | PENDING / APPROVED / REJECTED / CANCELLED / ISSUED. |
| Return Date | Requested return date. |
| Created | Submission date. |
| Actions | Cancel (only while PENDING or APPROVED). |

- Filter by status; pagination.
- "New Request" dialog lets a user submit a single-item request (component, quantity, purpose, return date).
- Multi-item cart submissions appear as one grouped row.

---

## 10. Approvals (`/approvals`) — Staff only

Unified approval queue with three tabs:

| Tab | Contents | Actions |
|---|---|---|
| Pending | Requests awaiting decision. | Approve / Reject (with reason). |
| Approved | Approved but not yet issued. | Issue Components (decrements stock). |
| Issued | Issued requests. | View only. |

- Each row shows reference, student, components with quantities, purpose and return date.
- Approving/rejecting sends an in-app notification and an email to the student.
- Issuing is atomic: stock is decremented only if sufficient; issue records and stock movements are created in one transaction.

---

## 11. Issues (`/issues`)

Tracks every component issue record.

| Column | Meaning |
|---|---|
| Reference | Issue reference (IS-…). |
| Student | Borrower. |
| Component | Issued component. |
| Issued | Quantity issued. |
| Returned | Total quantity returned so far. |
| Outstanding | Issued − returned (highlighted in red if > 0). |
| Due Date | Expected return date. |
| Status | ACTIVE / PARTIALLY_RETURNED / RETURNED. |

- Filter by status; pagination.
- Staff can issue an approved request via the "Issue Component" button (staff only).
- Students see only their own issues.

---

## 12. Returns (`/returns`) — Staff only

- Process a return against an active/partially-returned issue.
- Supports partial returns: outstanding quantity is recomputed automatically.
- On full return the issue status becomes RETURNED and stock is restored.
- Stock movements are recorded for audit.

---

## 13. Stock (`/stock`) — Staff only

- Overview of stock levels per component.
- Shows total, available and issued quantities; low-stock highlighting.
- Stock movements (issue/return/adjustment) are logged and viewable.

---

## 14. Overdue (`/overdue`) — Staff only

- Lists issue records past their expected return date with outstanding quantity.
- "Notify" action sends an overdue reminder email + in-app notification to the student.
- Bulk notify endpoint available.

---

## 15. Notifications (`/notifications`)

- In-app notification inbox for the logged-in user.
- Types: REQUEST_SUBMITTED, REQUEST_APPROVED, REQUEST_REJECTED, COMPONENT_ISSUED, OVERDUE, etc.
- Mark as read; unread badge in the sidebar.

---

## 16. Reports (`/reports`) — Staff only

- Borrowing report with filters (date range, status, student).
- Export to PDF (pdfkit) and Word (docx).
- Used for college management review and record-keeping.

---

## 17. Audit Logs (`/audit-logs`) — Staff only

- Chronological record of every significant action: who did what, when, on which entity.
- Includes before/after snapshots for changes.
- Supports filtering by actor, action, entity type and date range.

---

## 18. Users (`/users`) — Admin only

- Lists all registered users with name, email, role and register number.
- Click a student row to open a detail dialog showing: full name, register number, SPR number, email, mobile, department, section, academic year, roles, and borrowing history (requests + issues + status).
- Used by college management to verify student records and borrowing activity.

---

## 19. Settings (`/settings`) — Admin only

- Application-level configuration and admin controls.

---

## 20. About (`/about`)

- Information about the system, the lab and contact details.

---

## 21. Email Notifications

Emails are sent via SMTP (Gmail) when configured; they are a graceful no-op if SMTP env vars are missing.

| Event | Recipient | Content |
|---|---|---|
| Request submitted | Staff / In-Charge | Item list + purpose + return date + "Review Request" button → `/approvals`. |
| Request approved | Student | Approval confirmation + next steps. |
| Request rejected | Student | Rejection reason. |
| Components issued | Student | Issued items + return-by date. |
| Overdue reminder | Student | Overdue items + return prompt. |

Every email button links to the relevant page and works after the user logs in.

---

## 22. Key Data Model (tables)

| Table | Purpose |
|---|---|
| profiles | Users (name, email, register no, SPR no, mobile, dept, section, academic year). |
| roles / user_roles | Role assignments (ADMIN, D2P_INCHARGE, STUDENT). |
| categories | Component categories. |
| components | Inventory (code, name, category, qty, available, issued, location, min threshold, image_url). |
| borrowing_requests | Request header (reference, student, status, return date, cartId). |
| borrowing_request_items | Line items of a request (component + quantity). |
| issue_records | Issued components (quantity, issued by, expected return, status). |
| returns | Return transactions against an issue. |
| stock_movements | Audit of stock changes (issue/return/adjustment). |
| notifications | In-app notifications per user. |
| audit_logs | Full action audit trail. |

---

## 23. Sensor Readings

The inventory includes sensor components (DHT11, MQ-series, ultrasonic, etc.). The system does not fabricate sensor values; where a live reading is not available the UI explicitly shows "unavailable" instead of fake data. Component metadata (name, code, image) is what the system manages.

---

## 24. Local Setup & Deployment

### 24.1 Run locally

- Clone the repo: `git clone https://github.com/ayyappan1221/JJCETD2P.git`
- Install: `npm install`
- Configure `.env.local` (DATABASE_URL, NEXTAUTH_SECRET, SMTP_*, SEED_SECRET).
- Run: `npm run dev` (or `run-local.bat` on Windows).
- Seed base data: `POST /api/v1/seed` with `{ secret }`. Seed components: `POST /api/v1/seed/import` with `{ secret }`.

### 24.2 Deploy

- Push to main; Vercel auto-deploys, or run: `vercel --prod`.
- Production URL: https://jjcetd2p.vercel.app (health: `/api/v1/health`).

---

## 25. Notes for College Management

- All actions are auditable; every issue, return, approval and change is logged with actor and timestamp.
- Stock updates during issue are atomic — partial failure rolls back the whole transaction.
- Students never see other students' data; ownership is enforced on the server.
- Emails and notifications are sent at every workflow step with a clickable button to the relevant page.
- Component images are real product photos sourced from robu.in and rees52.com (see `public/components/CREDITS.md`).

---

*End of document.*
