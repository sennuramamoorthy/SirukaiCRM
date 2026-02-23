# SirukaiCRM

A full-stack CRM application for managing customer orders, invoices, inventory, reports, and supply chain operations. Built with React, Node.js/Express, and PostgreSQL — fully containerised with Docker Compose.

---

## Features

- **Customer Management** — Create, search, and manage customers with billing/shipping addresses
- **Order Management** — Draft → Confirmed → Processing → Shipped → Delivered workflow with auto-numbering (`ORD-2026-00001`)
- **Invoice Generation** — Generate invoices from confirmed orders, track payment status and aging
- **Inventory Management** — Stock levels, reservations, low-stock alerts, manual adjustments, transaction history
- **Supply Chain** — Supplier catalogue, purchase orders (`PO-2026-00001`), shipment tracking (`SHP-2026-00001`)
- **Reports & Dashboard** — Revenue trends, top products/customers, inventory valuation, order status breakdown
- **Role-Based Access Control** — Admin, Sales, and Warehouse roles with per-route enforcement

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite 5 |
| UI | Tailwind CSS v3 + shadcn/ui (Radix primitives) + lucide-react icons |
| State | Zustand (auth + UI state, persisted to localStorage) |
| Forms | react-hook-form + Zod resolver |
| Charts | Recharts |
| Backend | Node.js + Express 4 + TypeScript |
| Database | PostgreSQL 16 via pg (node-postgres) |
| Auth | JWT HS256 (8 h expiry) + RBAC middleware |
| Monorepo | npm workspaces |

---

## 🐳 Running with Docker (Recommended)

The fastest way to get started — no local Node or PostgreSQL installation needed beyond Docker Desktop.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

### Steps

```bash
# 1. Clone the repository
git clone git@github.com:sennuramamoorthy/SirukaiCRM.git
cd SirukaiCRM

# 2. Build images and start all services (PostgreSQL + API server + React/nginx)
#    First build takes ~3–5 minutes
docker compose up -d --build

# 3. Seed the database with demo data (run once after the first build)
docker compose run --rm server npm run seed

# 4. Open the app
#    http://localhost:8000
```

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@crm.local` | `Admin123!` |
| Sales | `sales@crm.local` | `Sales123!` |
| Warehouse | `warehouse@crm.local` | `Warehouse123!` |

### Common Docker Commands

```bash
# View live logs from all services
docker compose logs -f

# Restart after a code change (rebuilds images)
docker compose up -d --build

# Stop all containers (data is preserved in the crm_pg_data volume)
docker compose down

# Stop and permanently delete all data
docker compose down -v

# Check container health
docker compose ps
```

---

## 💻 Local Development Setup

Use this path when you want hot-reload and fast iteration without rebuilding Docker images.

### Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/)
- **PostgreSQL 16** — running locally, or use the Docker one-liner below

### 1. Start PostgreSQL

If you don't have PostgreSQL installed locally, start it via Docker:

```bash
docker run -d \
  --name crm_pg \
  -e POSTGRES_USER=crm \
  -e POSTGRES_PASSWORD=crm_password \
  -e POSTGRES_DB=crmdb \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Create server environment file

```bash
cat > server/.env << 'EOF'
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
DATABASE_URL=postgres://crm:crm_password@localhost:5432/crmdb
EOF
```

### 3. Install dependencies

```bash
# Run from the repo root — installs all workspace packages at once
npm install
```

### 4. Seed the database

```bash
npm run seed --workspace=server
```

### 5. Start the development servers

```bash
# Runs client (Vite) and server (tsx watch) in parallel
npm run dev
```

### Access URLs

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Express API | http://localhost:3001 |
| API health check | http://localhost:3001/health |

---

## Available npm Scripts

### Root (run from repo root)

| Command | Description |
|---|---|
| `npm run dev` | Start both client and server with hot-reload |
| `npm run build` | Production build of client + server |

### Server workspace (`npm run <script> --workspace=server`)

| Command | Description |
|---|---|
| `dev` | Start server with `tsx watch` (hot-reload) |
| `build` | Compile TypeScript → `server/dist/` |
| `start` | Run the compiled production server |
| `seed` | Seed the database with demo data |

### Client workspace (`npm run <script> --workspace=client`)

| Command | Description |
|---|---|
| `dev` | Start Vite dev server with HMR |
| `build` | Production build → `client/dist/` |
| `preview` | Preview the production build locally |

---

## RBAC Roles

| Role | Access |
|---|---|
| `admin` | Full access — all modules + user management |
| `sales` | Customers (CRUD), Orders (CRUD), Invoices (CRUD), Reports (read), Suppliers/POs/Shipments (read) |
| `warehouse` | Customers (read), Orders (read), Products/Inventory (CRUD), Suppliers/POs/Shipments (CRUD) |

---

## Project Structure

```
SirukaiCRM/
├── docker-compose.yml          # Orchestrates postgres + server + client
├── .env.docker                 # Environment vars used by Docker Compose
├── package.json                # Root workspace (workspaces: ["client","server"])
├── CLAUDE.md                   # Developer/AI context (architecture conventions)
├── client/                     # React frontend (Vite, port 5173 / nginx port 8000)
│   ├── Dockerfile
│   ├── nginx.conf              # Reverse proxy /api → server:3001
│   └── src/
│       ├── api/                # Axios instance + per-domain API files
│       ├── components/         # ui/, layout/, shared/ components
│       ├── features/           # auth, dashboard, customers, orders, invoices,
│       │                       # inventory, reports, supply-chain
│       ├── hooks/              # useDebounce, usePagination
│       ├── store/              # authStore.ts, uiStore.ts (Zustand)
│       ├── types/              # Shared TypeScript interfaces per domain
│       └── lib/                # formatters.ts, utils.ts, constants.ts
└── server/                     # Express API (port 3001)
    ├── Dockerfile
    └── src/
        ├── config/             # database.ts (pg Pool), env.ts
        ├── db/
        │   ├── migrations/     # 001_initial_schema.sql (auto-applied on startup)
        │   └── seed.ts         # Demo data seeder
        ├── middleware/         # auth, rbac, validate, error handlers
        ├── modules/            # One folder per domain:
        │   └── [module]/       #   *.router.ts, *.controller.ts,
        │                       #   *.service.ts, *.schema.ts
        └── utils/              # jwt.ts, pagination.ts, response.ts, sequencer.ts
```
