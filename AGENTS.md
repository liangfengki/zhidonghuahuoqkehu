# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

B2B Lead Generation SaaS platform (企业全球获客平台). Multi-tenant system for lead discovery, email verification, email marketing campaigns, inbox reply monitoring, and funnel analytics. MVP target cost is ~$0/month using free tiers of email providers and Supabase.

## Commands

```bash
# Install (requires pnpm@10, node>=22)
pnpm install

# Local infrastructure
docker compose -f docker/docker-compose.yml up -d postgres redis

# Database (Prisma — schema lives in packages/shared/prisma/schema.prisma)
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm db:push       # Push schema to database (dev workflow)
pnpm db:migrate    # Create migration
pnpm db:studio     # Open Prisma Studio GUI

# Development (all services)
pnpm dev           # Frontend :3000 + API :3001 + Workers

# Single service
pnpm --filter @b2b-lead-gen/web dev
pnpm --filter @b2b-lead-gen/api dev
pnpm --filter @b2b-lead-gen/queue-workers dev

# Quality
pnpm build         # Build all packages (Turborepo, dependency-ordered)
pnpm lint          # ESLint across workspace
pnpm typecheck     # TypeScript checking across workspace
pnpm format        # Prettier (semi, singleQuote, trailingComma: all, printWidth: 100)
```

No test framework is configured yet — tests are planned in Phase 6 of the roadmap.

## Architecture

### Monorepo Layout

pnpm workspaces + Turborepo. Six workspace members:

| Package | Description |
|---------|-------------|
| `apps/web` | Next.js 15 App Router frontend (React 19, Tailwind v4, TanStack Query) |
| `apps/api` | NestJS backend (Express, Swagger at /api/docs) |
| `packages/shared` | Prisma schema (20 models) + shared TypeScript types/DTOs |
| `packages/email-engine` | Multi-provider email send/receive (nodemailer, imapflow) |
| `packages/data-sources` | Apollo.io / Hunter.io adapters + email verification pipeline |
| `packages/queue-workers` | 5 BullMQ workers (collect, verify, send, inbox-poll, stats) |

All inter-package deps use `workspace:*`. `shared` is the foundation — every other package depends on it.

### Multi-Tenancy

Every Prisma model has a `tenantId` field. The API scopes all queries via `@CurrentTenant()` decorator, which extracts `tenantId` from the JWT payload. Registration auto-creates a Tenant.

### Auth Flow

JWT (access + refresh tokens). `JwtAuthGuard` protects all non-auth routes. JWT payload contains `sub` (userId), `tenantId`, `email`, `role`. Frontend stores token in localStorage, attaches via `Authorization: Bearer` header. The `AuthContext` (`apps/web/src/context/`) manages client-side auth state.

### API Conventions

- All routes prefixed `/api/`
- Response envelope: `{ success: true, data: ... }`
- DTO validation via class-validator + ValidationPipe
- Rate limiting: 100 req/60s via @nestjs/throttler
- Swagger docs at `/api/docs`

### Frontend State

- Server state: TanStack React Query (QueryProvider wraps the app)
- Auth state: React Context (AuthContext)
- No global store (Redux/Zustand)
- API utility: `apps/web/src/lib/api.ts` — fetch wrapper with auto JWT injection and `{ success, data }` unwrapping
- Path alias: `@/*` maps to `src/*`

### Job Queues (BullMQ + Redis)

Five queues defined in `apps/api/src/queue/`, workers in `packages/queue-workers/src/index.ts`:

| Queue | Concurrency | Purpose |
|-------|-------------|---------|
| `collect-leads` | 2 | Fetch contacts from Apollo/Hunter APIs |
| `verify-email` | 5 | Three-tier email verification with retry |
| `send-email` | 10 | Multi-provider email sending via channel router |
| `inbox-poll` | 3 | IMAP inbox polling (recurring every 60s) |
| `stats-daily` | 1 | Daily stats aggregation (cron 1 AM) |

### Email System

**Sending**: `ChannelRouter` (`packages/email-engine/src/channel-router.ts`) selects provider based on recipient domain (Gmail→Brevo, Outlook→Resend) with fallback to any active channel with remaining quota. Providers: Brevo, Resend, Mailgun, Mailjet.

**Verification**: `EmailValidator` (`packages/data-sources/src/validators/`) runs a pipeline: local checks (format, disposable, role-based, free provider) → RapidEmailVerifier API → SniffmailVerifier API → SMTP verification.

**Templates**: `{{variable}}` interpolation via `packages/email-engine/src/template-renderer.ts`.

### UI Structure

Sidebar layout with 5 sections: Dashboard, Leads, Campaigns, Inbox, Settings. Components in `apps/web/src/components/` (layout + ui). CSS custom properties for theming with auto dark mode via `prefers-color-scheme`.

## Environment Variables

- `apps/api/.env` — JWT_SECRET, DATABASE_URL, REDIS_URL, API keys
- `apps/web/.env.local` — NEXT_PUBLIC_API_URL (defaults to http://localhost:3001/api)

See `apps/api/.env.example` for the full list.
