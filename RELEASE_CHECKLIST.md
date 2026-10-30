# Planora AI — Production Release Checklist

This checklist defines the operational verification, configuration requirements, security gates, and deployment procedures for releasing Planora AI to production.

---

## 1. Environment Variables & Secret Configuration

Before deploying to the production host, verify that the following environment variables are set in the production environment settings (e.g. Vercel Project Settings, AWS/GCP secrets manager).

| Variable | Description | Target Scope | Status / Verification |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase project URL (`https://<project-id>.supabase.co`) | Client & Server | Required before boot |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production Supabase anon/publishable key | Client & Server | Required before boot |
| `GROQ_API_KEY` | Production Groq Cloud API key (`gsk_...`) | **Server-side only** | Required for AI Copilot (graceful fallback to deterministic engine if absent) |
| `GROQ_MODEL` | Production Groq model identifier (`openai/gpt-oss-120b`) | **Server-side only** | Optional (defaults to `openai/gpt-oss-120b`) |
| `NEXT_PUBLIC_APP_URL` | Canonical production domain URL (e.g. `https://planora.ai`) | Client & Server | Required for auth redirect callbacks |

### Secret Handling Rules
- [ ] Ensure `GROQ_API_KEY` is **never** prefixed with `NEXT_PUBLIC_`.
- [ ] Ensure Supabase `service_role` key is **not** injected or used anywhere in application runtime or client bundles.
- [ ] Confirm `.env` and `.env.local` files are ignored by git (`.gitignore` verified).
- [ ] Confirm no live production API keys or tokens are present in any repository commits or pull requests.

---

## 2. Supabase Authentication & Callback Configuration

- [ ] In the production Supabase Dashboard under **Authentication > URL Configuration**:
  - **Site URL**: Set to canonical production URL (e.g. `https://planora.ai`).
  - **Redirect URLs**: Add `https://planora.ai/auth/callback` and `https://planora.ai/dashboard`.
  - For preview/staging environments, add explicit preview domains (`https://*-org.vercel.app/**`).
- [ ] Confirm OAuth providers (e.g. GitHub, Google) have authorized the production callback URL: `https://<project-id>.supabase.co/auth/v1/callback`.
- [ ] Verify that open-redirect defenses (`getSafeRedirectUrl`) are active on auth callbacks.

---

## 3. Database Migrations & RLS Verification

Ensure the production PostgreSQL database has all sequential migrations applied up to the current release:

1. `20261022193000_initial_schema.sql` (Tables: `profiles`, `events`, `budget_items`, `tasks`, `risks`, `plan_revisions`, triggers, and base RLS).
2. `20261025130000_plan_revision_provenance.sql` (Plan provenance tracking & `accept_plan_blueprint` RPC).
3. `20261025183000_tighten_accept_plan_blueprint_auth.sql` (Hardened RPC caller authentication).
4. `20261025193000_performance_composite_indexes_and_rpc.sql` (Performance composite indexes).
5. `20261029000000_apply_budget_scenario_rpc.sql` (Atomic `apply_budget_scenario` RPC for What-If Simulator).
6. `20261030000000_ai_rate_limits.sql` (Table: `ai_rate_limits` and `check_ai_rate_limit` RPC for distributed AI rate limiting).

### Verification Steps
- [ ] Run Supabase migration verification:
  ```bash
  npx supabase migration list --db-url "$PRODUCTION_DB_URL"
  ```
- [ ] Verify that all 7 application tables (`profiles`, `events`, `budget_items`, `tasks`, `risks`, `plan_revisions`, `ai_rate_limits`) have Row Level Security enabled (`ENABLE ROW LEVEL SECURITY`).
- [ ] Ensure anonymous access cannot query or insert records into any user-scoped tables.
- [ ] Confirm `public.accept_plan_blueprint`, `public.apply_budget_scenario`, and `public.check_ai_rate_limit` RPCs execute with `SECURITY INVOKER` and empty search path (`SET search_path = ''`).

---

## 4. Quality Gates & Continuous Integration

Prior to initiating any production deployment, execute the project quality gates:

```bash
# 1. Static Type Checking
npx tsc --noEmit

# 2. ESLint
npm run lint

# 3. Unit, Component, and Action Tests
npm test

# 4. Coverage Threshold Enforcement (Statements >=90%, Branches >=85%, Functions >=95%, Lines >=90%)
npm run test:coverage

# 5. Playwright Real-Browser E2E Tests
npm run test:e2e

# 6. Production Build Compilation
npm run build
```

- [ ] All 61 Vitest test suites (767 tests) pass with zero failures.
- [ ] All 15 Playwright E2E browser tests pass with zero failures.
- [ ] Next.js production build (`next build`) completes cleanly with all routes optimized.

---

## 5. Deployment Procedure

Planora AI is built as a standard Next.js 16 App Router application with Turbopack and `@supabase/ssr`.

### Deployment Target
- **Primary Hosting Platform**: Vercel (or Node.js 20+ standalone container).
- **Runtime**: Node.js 20.x LTS.
- **Build Command**: `next build` (or `npm run build`).
- **Output Directory**: Default Next.js `.next`.

### Deployment Steps
1. Verify GitHub Actions CI workflow (`verify`, `db-security`, `e2e`) runs and succeeds on `main`.
2. Connect production deployment repository to production project on hosting provider.
3. Supply required environment variables (Section 1).
4. Trigger production deployment from `main`.

---

## 6. Post-Deployment Smoke Test (Manual Verification)

Perform the following smoke tests on the live production URL using an isolated test account:

- [ ] **Landing Page**: Verify hero section, navigation bar, feature cards, and accessible skip-link load.
- [ ] **Sign-In / Sign-Up**: Test email authentication and confirm session token cookie creation (`sb-*-auth-token`).
- [ ] **Route Protection**: Verify that unauthenticated requests to `/dashboard` immediately redirect to `/sign-in`.
- [ ] **Event Creation**: Create an event with realistic INR budget (e.g. ₹5,00,000), date, and guest count. Confirm persistence.
- [ ] **Event Command Center**: Open the created event workspace and confirm summary bar metrics, countdown, and tabs render.
- [ ] **Dynamic Timeline & Tasks**: Create a new task, toggle completion, and verify optimistic update + database persistence.
- [ ] **Smart Budget Manager**: Add a budget line item, enter estimated and actual expenses, and verify real-time variance calculation.
- [ ] **What-If Budget Simulator**: Adjust hypothetical amounts, add a candidate line item, review scenario diff, and apply scenario via atomic RPC.
- [ ] **AI Plan Generator**: Click "Generate Plan". Confirm either live Groq GenAI response or deterministic rule-based blueprint renders with zero crash.
- [ ] **Conversational AI Copilot**: Open Copilot drawer, submit a query (e.g. "Suggest 3 catering tips"), verify response rendering and rate limiting.
- [ ] **Event Risk Radar**: Verify computed risk metrics (overdue tasks, budget cushion, unallocated expenses) render properly.
- [ ] **PDF Export**: Navigate to `/dashboard/events/[id]/export/pdf`, verify executive dossier layout, tables, and print trigger.
- [ ] **CSV Exports**: Download budget CSV and task CSV; inspect output in text viewer to verify RFC 4180 CRLF line endings, UTF-8 BOM, and formula sanitization (leading single quote on trigger characters).
- [ ] **Tenant Isolation Check**: Verify attempting to load another user's event UUID displays the "Event Not Found" error rather than data.
- [ ] **Sign Out**: Sign out and verify session termination and redirect to `/sign-in`.

---

## 7. Monitoring, Incident Response & Rollback

### Current Operational Status
> [!NOTE]
> Application-level error boundaries, structured error logging, and client-safe error envelopes are implemented in the codebase. However, external centralized APM / observability (e.g., Sentry, Datadog) and automated database point-in-time recovery (PITR) depend on the external cloud hosting and Supabase tiers.

### Recommended Infrastructure Setup
- [ ] **Sentry / Error Tracking**: Configure Sentry Next.js SDK (`@sentry/nextjs`) to capture unhandled client and server exceptions.
- [ ] **Supabase Backups**: Enable Daily Automatic Backups or Point-In-Time Recovery (PITR) in Supabase project settings.
- [ ] **Uptime Monitoring**: Configure an external HTTP ping monitor (e.g. Better Uptime, Checkly) targeting `/` and `/sign-in`.

### Rollback Procedure
If a critical production defect or security regression is detected post-deployment:
1. **Immediate Traffic Rollback**: In hosting dashboard (e.g. Vercel Deployments), select the previous stable deployment and click **"Promote to Production"** (instant zero-downtime rollback).
2. **Database Schema Compatibility**: All migrations in `supabase/migrations/` are additive and backward-compatible with previous application code. If a database rollback is strictly necessary, execute targeted rollback scripts in Supabase Dashboard SQL Editor.
3. **Session Invalidation**: If credentials or tokens are suspected to be compromised, trigger `supabase.auth.admin.signOut(user_id)` or rotate API keys in Supabase/Groq dashboards.

