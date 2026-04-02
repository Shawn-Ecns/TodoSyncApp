# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Todo Sync (todo-sync) — 多平台同步 TodoList 应用。Full-stack collaborative todo application with real-time sync across web, mobile, and server. Offline-first architecture with WebSocket-based real-time updates and JWT authentication.

## Monorepo Structure

- **apps/server** — Fastify 5 backend, PostgreSQL (Prisma ORM 6), Socket.IO, JWT auth
- **apps/web** — React 19 SPA with Vite 6, Tailwind CSS 4, Zustand, TanStack Query
- **apps/mobile** — React Native 0.81 via Expo 54, React Navigation
- **packages/shared** — Shared TypeScript types, Zod validation schemas, constants, utilities

Package manager: pnpm 10.33 (workspaces). Build orchestrator: Turbo.

## Common Commands

```bash
pnpm install              # Install all dependencies
docker-compose up -d      # Start PostgreSQL 17
pnpm db:generate          # Generate Prisma client
pnpm db:migrate           # Run Prisma migrations

pnpm dev                  # Start all apps via turbo
pnpm dev:server           # Server only (localhost:3001)
pnpm dev:web              # Web only (localhost:5173)
pnpm dev:mobile           # Mobile only (Expo)

pnpm build                # Build all packages
pnpm test                 # Run tests (vitest on server)
pnpm lint                 # Lint all
```

Run a single test file:
```bash
pnpm --filter @todo-sync/server exec vitest run path/to/test.ts
```

## Architecture

### Server (apps/server)
- **Routes** (`src/routes/`) — `auth.ts` (register/login/refresh/logout), `todos.ts` (CRUD + sync)
- **Services** (`src/services/`) — `auth.service.ts`, `todo.service.ts`, `sync.service.ts` (business logic lives here, routes are thin)
- **Middleware** (`src/middleware/`) — `authenticate.ts` (JWT verification)
- **Lib** (`src/lib/`) — `prisma.ts` (singleton client), `socket.ts` (Socket.IO setup & event handlers)

API base path: `/api/v1/`. Sync endpoint: `POST /api/v1/todos/sync` for offline batch changes.

### Authentication Flow
Access token (JWT, 15min) + refresh token (random hex, 7 days, single-use rotation stored in DB). Passwords hashed with bcrypt (12 rounds). Axios interceptor auto-refreshes on 401. Socket.IO authenticates via `socket.handshake.auth.token`.

### Real-Time Sync
Socket.IO broadcasts to user-specific rooms (`user:{userId}`). Sender exclusion via `X-Socket-Id` header to prevent echo. Events: `todo:created`, `todo:updated`, `todo:deleted`, `sync:request`/`sync:response`.

### Offline-First
Client queues changes in localStorage (offlineQueue Zustand store). On reconnect, batch sync via `/todos/sync`. Server processes idempotently (checks if todo already exists by client-generated UUID). Conflict resolution: server timestamp wins.

### Database
PostgreSQL 17 via Prisma. Models: User, Todo (soft deletes via `deletedAt`), RefreshToken. Composite indices on `[userId, deletedAt]`, `[userId, updatedAt]`, `[userId, dueDate]`. Migrations in `apps/server/prisma/migrations/`.

### Web Frontend (apps/web)
- Zustand stores: `authStore.ts` (JWT/user state in localStorage), `offlineQueue.ts` (offline changes)
- TanStack React Query for server state with optimistic updates
- Vite proxies `/api` and `/socket.io` to localhost:3001 in dev

### Shared Package (packages/shared)
Zod schemas validate on both client and server. Exports: `API_PATHS`, `SOCKET_EVENTS`, `LIMITS` constants. Utilities: `sortTodos`, `filterActiveTodos`.

## Key Conventions

- All UI text and Zod validation error messages are in **Chinese (Simplified)**
- Package names scoped as `@todo-sync/{name}`
- API routes versioned: `/api/v1/{resource}`
- Socket events named: `{entity}:{action}` (e.g. `todo:created`)
- Todos use soft deletes (`deletedAt` field) and `position` field for ordering
- Client generates UUIDs for todos created offline (passed as `input.id`)
- Turbo task dependencies: `test` depends on `build`; `build` depends on `^build`
- Environment variables: see `.env.example` for required vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `VITE_API_URL`, `VITE_WS_URL`)
