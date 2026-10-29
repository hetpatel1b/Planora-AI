# Planora AI

> An intelligent, AI-assisted event-planning platform designed to simplify event creation, budgeting, timeline tracking, and risk analysis.

---

## Overview

**Planora AI** is a modern event-planning SaaS application that helps organizers transition seamlessly from initial concept to flawless execution. By combining structured event management tools with contextual AI assistance, Planora AI streamlines logistics, minimizes financial surprises, and keeps every phase of planning on schedule.

### Problem Statement

Planning events—whether corporate offsites, weddings, conferences, or private gatherings—is typically fragmented across spreadsheets, disconnected checklist apps, and static documents. Organizers frequently face:
- **Budget unpredictability**: Hidden expenses and difficulty modeling "what-if" scenarios before committing funds.
- **Logistical blind spots**: Unidentified timeline dependencies and late discovery of contingency risks.
- **Coordination friction**: Disjointed checklists and lack of cohesive, exportable documentation for stakeholders and vendors.

### Intended Users

- **Independent Event Planners**: Professionals managing multiple client events simultaneously who need consistent, rapid planning workflows.
- **Corporate & Community Coordinators**: Office managers, HR leads, and club organizers planning team offsites, meetups, or annual summits without dedicated full-time planning agencies.
- **Private Organizers**: Individuals coordinating milestones such as weddings, reunions, and celebrations who need guided structure without overwhelming complexity.

---

## Core Features

Planora AI is designed around eight core feature pillars:

1. **Intelligent Event Setup**  
   Guided intake workflow capturing event classification, attendee estimates, primary objectives, target dates, and initial budget constraints into a structured project workspace.

2. **AI Event Plan Generator**  
   Generates comprehensive, tailored event blueprints including high-level scheduling, milestone recommendations, and logistical checklists tuned to the specific event profile via deterministic rule-based algorithms.

3. **Smart Budget Manager**  
   Categorized cost allocation across venues, catering, audiovisual, talent, and contingencies, with real-time variance tracking between projected estimates and actual expenditures.

4. **Dynamic Timeline and Checklist**  
   Adaptive milestone countdown and prioritized operational checklists that adjust automatically to shifting deadlines and task dependencies.

5. **Conversational AI Copilot**  
   Context-aware interactive assistant grounded in real workspace data to brainstorm ideas, refine vendor criteria, draft agenda drafts, and answer operational planning questions.

6. **What-If Budget Simulator**  
   Scenario modeling engine to simulate financial impact prior to commitments—such as adjusting attendee headcounts, upgrading venues, or reallocating line items—with side-by-side scenario comparison.

7. **Event Risk Radar**  
   Proactive, deterministic risk detection analyzing lead times, vendor dependencies, and budget cushions to flag potential bottlenecks and provide mitigation recommendations early.

8. **PDF and CSV Export**
   One-click generation of professional run-of-show sheets, vendor briefs, and budget summaries formatted for clients, collaborators, and venue coordinators with RFC 4180 compliance and spreadsheet formula injection protection.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) `16.4.2` (App Router, React `19.3.0`, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/) `5.9` (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/turbopack`)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) powered by [@base-ui/react](https://base-ui.com/) and [class-variance-authority](https://cva.style/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/) PostgreSQL with Row Level Security (RLS) and `@supabase/ssr`
- **AI Engine**: [Groq](https://groq.com/) Cloud API (model: `openai/gpt-oss-120b`, native server-only fetch client)
- **Test Runner**: [Vitest](https://vitest.dev/) `3.2.7` with V8 coverage provider
- **Package Manager**: npm

---

## Current Development Status

> **Phases 1–8: Implemented & Verified**
>
> 1. **Foundation & Application Shell (Phase 1)**: Next.js 16 App Router architecture, responsive UI components, and design system.
> 2. **Database & Authentication (Phase 2)**: PostgreSQL schema, Row Level Security (RLS) policies, Next.js 16 `proxy.ts`, and session verification via `getUser()`.
> 3. **Intelligent Event Setup (Phase 3)**: Workspace creation, parameter management, and event profile editing.
> 4. **Core Planning Engines (Phase 4)**: Deterministic AI Event Plan Generator, Smart Budget Manager with integer-cent variance tracking, Dynamic Timeline & Checklist, and versioned plan revisions with atomic replacement.
> 5. **Conversational AI Copilot (Phase 5)**: Server-only Groq client, anti-injection prompt boundary delimiters, structured suggestions, and XSS-immune Markdown rendering.
> 6. **What-If Budget Simulator (Phase 6)**: Side-by-side scenario sandboxing, category delta comparisons, and atomic database transaction RPC.
> 7. **Event Risk Radar (Phase 7)**: 100% pure deterministic risk engine evaluating budget ceilings, overdue task dependencies, and checklist completeness.
> 8. **Hardening, Code Quality & Exports (Phase 8)**: Printable executive PDF dossier, RFC 4180 CSV exports with formula injection defense, modularized templates, and centralized utilities targeting a strict 10/10 Code Quality standard.

---

## Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.x` or later (LTS recommended)
- **npm**: `v10.x` or later
- **Git**

---

## Local Installation and Startup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hetpatel1b/Planora-AI.git
   cd Planora-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy the example environment template to create your local environment file:
   ```bash
   cp .env.example .env.local
   ```
   *(On Windows Command Prompt, use `copy .env.example .env.local`)*

   Fill in placeholder variables as features are connected. For core planning workflows, Supabase database and authentication credentials are required. A Groq API key is required for live AI Copilot features (gracefully falls back if unconfigured).

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Environment Variables

All environment configuration is specified in `.env.example`:

| Variable | Description | Exposure |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Client & Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous public key | Client & Server |
| `GROQ_API_KEY` | Groq API authentication key for AI Copilot | **Server-side only** |
| `GROQ_MODEL` | Groq LLM model identifier (default: `openai/gpt-oss-120b`) | Server-side only |
| `NEXT_PUBLIC_APP_URL` | Base canonical application URL (default: `http://localhost:3000`) | Client & Server |

---

## Testing and Verification Commands

Run the following commands to verify code quality, tests, and build validity:

- **Run all unit & integration tests**:
  ```bash
  npm test
  ```
- **Run tests with coverage**:
  ```bash
  npm run test:coverage
  ```
- **Lint code**:
  ```bash
  npm run lint
  ```
- **Type check**:
  ```bash
  npx tsc --noEmit
  ```
- **Production build**:
  ```bash
  npm run build
  ```

---

## Security Best Practices

- **Never commit secrets**: Real API credentials, Supabase service keys, and Groq keys must **never** be checked into git. `.gitignore` is configured to ignore `.env*` while tracking `.env.example`.
- **Server-side isolation**: Artificial intelligence keys (`GROQ_API_KEY`) and elevated database credentials remain strictly within server-side execution environments (Next.js Server Actions / API Route Handlers) and never use the `NEXT_PUBLIC_` prefix.
- **OWASP Spreadsheet Defense**: All CSV exports sanitize untrusted inputs against formula injection (CWE-1236).
- **Open-Redirect Guards**: Authentication callback redirects validate relative paths strictly to prevent arbitrary external redirects.

---

## License

All rights reserved. Heterogeneous event-planning platform.
