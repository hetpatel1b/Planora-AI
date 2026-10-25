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
   Context-aware interactive assistant to brainstorm ideas, refine vendor criteria, draft agenda drafts, and answer operational planning questions.

6. **What-If Budget Simulator**  
   Scenario modeling engine to simulate financial impact prior to commitments—such as adjusting attendee headcounts, upgrading venues, or reallocating line items.

7. **Event Risk Radar**  
   Proactive risk detection analyzing lead times, vendor dependencies, and budget cushion to flag potential bottlenecks and provide mitigation recommendations early.

8. **PDF/CSV Export**  
   One-click generation of professional run-of-show sheets, vendor briefs, and budget summaries formatted for clients, collaborators, and venue coordinators.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) powered by [@base-ui/react](https://base-ui.com/) and [class-variance-authority](https://cva.style/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Package Manager**: npm

---

## Current Development Status

> **Phases 1–4: Core Platform & Planning Workflows (Implemented)**
>
> The project has completed its initial architectural foundation, Supabase database and authentication integration, intelligent event setup, and core planning engines:
> - **Foundation & Application Shell (Phase 1)**: Next.js 16 App Router architecture, responsive UI components, and design system.
> - **Database & Authentication (Phase 2)**: PostgreSQL schema, Row Level Security (RLS) policies, and session verification.
> - **Intelligent Event Setup (Phase 3)**: Workspace creation, parameter management, and event profile editing.
> - **Core Planning Features (Phase 4)**: Deterministic AI Event Plan Generator, Smart Budget Manager with integer-cent variance tracking, Dynamic Timeline & Checklist, and versioned plan revisions with atomic replacement.
>
> **Next Planned Phase: Phase 5 — Conversational AI Copilot**
> Interactive assistant for contextual planning queries, vendor inquiry drafting, and iterative plan refinement.

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

   Fill in placeholder variables as features are connected. For core planning workflows (Phases 1–4), Supabase database and authentication credentials are required. Groq API keys are reserved for the upcoming Phase 5 Conversational AI Copilot.

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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (Phase 2+) | Client & Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous public key (Phase 2+) | Client & Server |
| `GROQ_API_KEY` | Groq API authentication key for AI services (Phase 5 Copilot) | **Server-side only** |
| `GROQ_MODEL` | Groq LLM model identifier for Phase 5 Copilot (default: `openai/gpt-oss-120b`) | Server-side only |
| `NEXT_PUBLIC_APP_URL` | Base canonical application URL (default: `http://localhost:3000`) | Client & Server |

---

## Testing and Verification Commands

Run the following commands to verify code quality and build validity:

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
- **Server-side isolation**: Artificial intelligence keys (`GROQ_API_KEY`) and elevated database credentials must remain strictly within server-side execution environments (Next.js Server Actions / API Route Handlers) and must never use the `NEXT_PUBLIC_` prefix.

---

## License

The license for this project has not yet been selected. All rights reserved.
