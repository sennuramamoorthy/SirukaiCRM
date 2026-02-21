# CRM Application — Claude Context

## Project Overview

Full-stack CRM application for managing customer orders, invoices, inventory, reports, and supply chain operations.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite 5 |
| UI | Tailwind CSS v3 + shadcn/ui (Radix primitives) + lucide-react icons |
| State | Zustand (auth + UI state, persisted to localStorage) |
| Forms | react-hook-form + Zod resolver |
| Charts | Recharts |
| PDF | @react-pdf/renderer (client preview + server PDF stream) |
| Backend | Node.js + Express 4 + TypeScript |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Auth | JWT HS256 (8h expiry) + RBAC middleware |
| Monorepo | npm workspaces |

## Directory Structure

```
CRMApp/
├── CLAUDE.md                       # This file
├── package.json                    # Root workspace (workspaces: ["client","server"])
├── client/                         # React frontend (port 5173)
│   └── src/
│       ├── api/                    # Axios instance + domain API files
│       ├── components/
│       │   ├── ui/                 # shadcn/ui auto-generated components
│       │   ├── layout/             # AppShell, Sidebar, Topbar, PageHeader
│       │   └── shared/             # DataTable, StatusBadge, ConfirmDialog, etc.
│       ├── features/               # Feature modules (one folder per domain)
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── customers/
│       │   ├── orders/
│       │   ├── invoices/
│       │   ├── inventory/
│       │   ├── reports/
│       │   └── supply-chain/
│       ├── hooks/                  # useDebounce, usePagination
│       ├── store/                  # authStore.ts, uiStore.ts
│       ├── types/                  # Shared TypeScript interfaces per domain
│       └── lib/                    # utils.ts (cn helper), formatters.ts, constants.ts
└── server/                         # Express backend (port 3001)
    └── src/
        ├── config/                 # database.ts, env.ts
        ├── db/
        │   ├── migrations/         # Numbered .sql migration files
        │   └── seed.ts             # Dev seed data
        ├── middleware/             # auth, rbac, validate, error
        ├── modules/                # One folder per domain
        │   └── [module]/
        │       ├── *.router.ts
        │       ├── *.controller.ts
        │       ├── *.service.ts
        │       └── *.schema.ts
        └── utils/                  # jwt.ts, bcrypt.ts, pagination.ts, response.ts
```

## Dev Commands

```bash
# Install all dependencies (run from root)
npm install

# Run both client and server in parallel (from root)
npm run dev

# Run server only
npm run dev --workspace=server

# Run client only
npm run dev --workspace=client

# Build everything
npm run build

# Seed the database with initial data
cd server && npx ts-node src/db/seed.ts
```

## Server Configuration

- **Port:** 3001 (configured via `PORT` env var)
- **Database:** `server/data/crm.db` (SQLite file, created automatically)
- **JWT Secret:** `JWT_SECRET` env var (required)

## Environment Variables

Create `server/.env`:
```
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
```

## Architecture Conventions

### Backend (Router → Controller → Service → DB)
- **Router**: Express Router + auth/RBAC middleware. No logic.
- **Controller**: Parse request → call service → send response. No business logic.
- **Service**: All business logic + prepared SQL statements via better-sqlite3.
- **Schema**: Zod schemas for request body validation (used in validate middleware).

### Database Conventions
- All **monetary values** stored as **INTEGER cents** (e.g., $12.50 → `1250`)
- All **timestamps** stored as **INTEGER Unix milliseconds** (`Date.now()`)
- All **soft deletes** via `deleted_at INTEGER` column (NULL = active)
- Foreign keys enforced via `PRAGMA foreign_keys = ON`

### Frontend Conventions
- Currency display: always use `formatCurrency(cents)` from `lib/formatters.ts`
- Convert form input to cents: use `decimalToCents(value)` before API call
- Dates: use `date-fns` for all date formatting/parsing
- API calls: always use the domain-specific file in `src/api/` (never raw axios)
- Error handling: show errors via `toast.error()` from shadcn/ui `useToast`

## RBAC Roles

| Role | Access |
|---|---|
| `admin` | Full access to everything including user management |
| `sales` | Customers (CRUD), Orders (CRUD), Invoices (CRUD), Reports (read), Suppliers/POs/Shipments (read) |
| `warehouse` | Customers (read), Orders (read), Products/Inventory (CRUD), Suppliers/POs/Shipments (CRUD) |

## Auto-Number Sequences

Documents use year-scoped sequences: `ORD-2026-00001`, `INV-2026-00001`, `PO-2026-00001`, `SHP-2026-00001`. Generated in service layer inside a SQLite transaction.

## Default Seed Credentials

After running seed: `admin@crm.local` / `Admin123!`

## Key Domain Workflows

- **Order confirmed** → inventory `quantity_reserved` increases per item
- **Order cancelled** → reservation released
- **Order shipped** → `quantity_on_hand` decreases, reservation cleared
- **PO received** → `quantity_on_hand` increases per received qty
- All stock movements create an `inventory_transactions` audit row
