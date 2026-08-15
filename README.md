# Paikar ERP

> **A modern, full-stack ERP platform for streamlined business operations, inventory, procurement, sales, and resource management.**

[![Live](https://img.shields.io/badge/Live-paikarpos.com-111827?style=flat-square)](https://paikarpos.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-111827?style=flat-square\&logo=next.js\&logoColor=white)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-Express-111827?style=flat-square\&logo=express\&logoColor=white)](https://expressjs.com/)
[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square\&logo=prisma\&logoColor=white)](https://www.prisma.io/)

---

## Overview

**Paikar ERP** is a full-stack enterprise resource planning platform designed to bring core business operations into a single, structured system.

The platform provides a centralized foundation for managing **products, inventory, procurement, sales, customers, parties, warehouses, users, and operational workflows**.

Built with a modern TypeScript-based stack, Paikar ERP separates presentation, business logic, and data access into maintainable application layers—providing a foundation that can evolve with the business.

**Live application:** https://paikarpos.com/

---

## Core Capabilities

| Domain              | Capabilities                                                  |
| ------------------- | ------------------------------------------------------------- |
| **Inventory**       | Products, stock lots, availability, inventory operations      |
| **Procurement**     | Purchase orders, approval workflows, supplier management      |
| **Sales**           | Sales orders, order lifecycle, customer management            |
| **Organization**    | Users, parties, warehouses, business entities                 |
| **Authentication**  | Secure JWT-based authentication and protected resources       |
| **Data Management** | PostgreSQL-backed relational data model with Prisma           |
| **Operations**      | Structured workflows designed around real-world ERP processes |

---

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│                    Next.js Client                    │
│                                                      │
│        UI · Application State · User Experience      │
└──────────────────────────┬───────────────────────────┘
                           │
                           │ HTTP / REST
                           ▼
┌──────────────────────────────────────────────────────┐
│              Express + TypeScript API                │
│                                                      │
│   Authentication · Validation · Business Logic       │
└──────────────────────────┬───────────────────────────┘
                           │
                           │ Prisma
                           ▼
┌──────────────────────────────────────────────────────┐
│                     PostgreSQL                       │
│                                                      │
│       Relational Data · Transactions · Integrity     │
└──────────────────────────────────────────────────────┘
```

### Design Principles

* **Separation of concerns** — frontend, API, business logic, and persistence remain independently maintainable.
* **Type safety** — TypeScript is used across the application stack.
* **Relational integrity** — PostgreSQL provides a reliable foundation for interconnected ERP data.
* **Explicit workflows** — business operations follow defined states and transitions.
* **Security by default** — protected resources use authenticated access and server-side validation.
* **Extensibility** — the architecture is designed to support additional ERP modules as requirements grow.

---

## Technology

### Frontend

**Next.js** provides the application interface and client-side experience.

### Backend

**Express + TypeScript** powers the application API and business logic layer.

### Persistence

**PostgreSQL** serves as the primary relational database.

### Data Access

**Prisma ORM** provides type-safe database access and schema management.

### Security

Authentication is implemented using **JWT access tokens**, with password hashing handled through **bcrypt**.

---

## Repository Structure

```text
paikar-erp-server/
│
├── client/                 # Next.js application
│
├── server/                 # Express + TypeScript API
│   ├── ...
│   └── ...
│
├── .gitignore
└── README.md
```

The repository intentionally keeps the client and server applications separated, allowing each layer to evolve independently while maintaining a clear application boundary.

---

## Local Development

### Requirements

* Node.js 18+
* npm 9+
* PostgreSQL
* Git

Node.js 20 LTS is recommended for development.

### Installation

```bash
git clone https://github.com/RohanSha05/paikar-erp-server.git

cd paikar-erp-server

npm install
```

### Environment

Create the appropriate environment configuration for the server:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://postgres:<password>@localhost:5432/paikar_erp

JWT_ACCESS_SECRET=<strong-random-secret>
JWT_ACCESS_TTL=15m

CORS_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
```

> **Never commit environment files or production credentials to source control.**

### Database Initialization

Create the PostgreSQL database and initialize the Prisma schema:

```bash
npx prisma db push
npx prisma generate
npm run seed
```

### Development

```bash
npm run dev
```

The API is available locally at:

```text
http://localhost:5000
```

---

## Development Workflow

Common project commands:

```bash
# Development
npm run dev

# Production build
npm run build

# Production start
npm run start

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio

# Database seed
npm run seed

# Code quality
npm run lint
```

---

## Engineering Considerations

Paikar ERP is structured around the requirements typically found in operational business software:

* **Transactional consistency** for business-critical operations
* **Structured relational modeling** for interconnected entities
* **Authentication and authorization boundaries**
* **Validation at the API boundary**
* **Explicit order and approval workflows**
* **Scalable modular architecture**
* **Environment-based configuration**
* **Database schema managed through Prisma**
* **Production-oriented TypeScript development**

The architecture is intended to provide a stable foundation for expanding into additional domains such as accounting, reporting, advanced inventory, payments, and business intelligence.

---

## Roadmap

The platform is designed to evolve toward a broader ERP ecosystem.

* [ ] Role-based access control
* [ ] Advanced inventory & stock movement
* [ ] Accounting & financial management
* [ ] Reporting & business intelligence
* [ ] Audit logs & activity tracking
* [ ] Notifications & workflow automation
* [ ] Advanced procurement workflows
* [ ] Sales analytics
* [ ] Production management
* [ ] Deployment & observability improvements

---

## Production

For production deployments:

* Use a managed PostgreSQL instance or production-grade database infrastructure.
* Store secrets through the deployment environment rather than source control.
* Use a strong, randomly generated JWT signing secret.
* Run Prisma migrations through the deployment pipeline.
* Configure CORS for trusted application origins only.
* Enable HTTPS at the infrastructure or reverse-proxy layer.
* Use appropriate logging, monitoring, backups, and database recovery procedures.

---

## Project Status

**Active development**

Paikar ERP is actively evolving toward a production-ready ERP platform with an emphasis on maintainability, reliability, and extensibility.

---

## License

This project is proprietary software.

All rights reserved.

---

<p align="center">
  <strong>Paikar ERP</strong>
  <br />
  Modern infrastructure for modern business operations.
  <br /><br />
  <a href="https://paikarpos.com/">paikarpos.com</a>
</p>
