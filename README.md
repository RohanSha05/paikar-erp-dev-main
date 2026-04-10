# Paikar ERP Server

Backend API server for Paikar ERP using Express, TypeScript, Prisma, and PostgreSQL.

## Prerequisites

- Node.js 18+ (recommended: Node 20 LTS)
- npm 9+
- PostgreSQL (local or remote)

## 1) Clone and Install

```bash
npm install
```

## 2) Environment Setup

Create a `.env` file in project root with the following values:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/paikar_erp
JWT_ACCESS_SECRET=very_long_random_secret_minimum_32_characters_required
JWT_ACCESS_TTL=15m
CORS_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
```

Notes:
- `JWT_ACCESS_SECRET` must be at least 32 characters.
- `DATABASE_URL` must point to a running PostgreSQL instance.

## 3) Database Setup (PostgreSQL)

Create database first (example):

```sql
CREATE DATABASE paikar_erp;
```

Then sync Prisma schema:

```bash
npx prisma db push
```

Generate Prisma client:

```bash
npx prisma generate
```

Seed initial data:

```bash
npm run seed
```

Seed creates:
- Admin user: `admin@paikar.local` / `admin123`
- Core accounts: `AC-INVENTORY`, `AC-PAYABLES`
- Default warehouse and sample seller/product

## 4) Run the Server

Development mode:

```bash
npm run dev
```

Server base URL:

```text
http://localhost:5000/api/v1
```

Health check:

```text
GET http://localhost:5000/api/v1/health
```

## 5) Optional Prisma Studio

```bash
npm run prisma:studio
```

## 6) Build and Start (Production style)

```bash
npm run build
npm run start
```

## 7) API Route Summary

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET /api/v1/products`
- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `GET /api/v1/lots`
- `GET /api/v1/lots?available=true`
- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/:id`
- `GET /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/:id`
- `POST /api/v1/purchase-orders`
- `PATCH /api/v1/purchase-orders/:id`
- `POST /api/v1/purchase-orders/:id/approve`
- `GET /api/v1/sales-orders`
- `GET /api/v1/sales-orders/:id`
- `POST /api/v1/sales-orders`
- `PATCH /api/v1/sales-orders/:id`
- `POST /api/v1/sales-orders/:id/confirm`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/:id`
- `GET /api/v1/parties`
- `POST /api/v1/parties`
- `PATCH /api/v1/parties/:id`
- `GET /api/v1/warehouses`
- `POST /api/v1/warehouses`
- `PATCH /api/v1/warehouses/:id`

## 8) Authentication

Protected routes require:

```text
Authorization: Bearer <access_token>
```

Get token from:

```text
POST /api/v1/auth/login
```

## 9) Common Troubleshooting

### A) Database connection error (`Can't reach database server at localhost:5432`)

Make sure PostgreSQL is running.

Windows (PowerShell as Administrator):

```powershell
Start-Service -Name postgresql-x64-18
```

Check status:

```powershell
Get-Service -Name postgresql-x64-18
```

### B) Prisma generate EPERM (Windows file lock)

If Prisma client binary is locked:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
npx prisma generate
```

### C) Validation failed / Invalid UUID

Use real UUID values returned by API responses for IDs in request bodies.

## 10) Development Commands

- `npm run dev` - run dev server
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - create/apply development migration
- `npm run prisma:studio` - open Prisma Studio
- `npm run seed` - seed database
- `npm run lint` - lint project
