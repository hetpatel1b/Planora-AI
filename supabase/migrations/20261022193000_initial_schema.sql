-- Planora AI — Phase 2, Step 8: PostgreSQL Schema and Row Level Security Migration
-- Migration: 20261022193000_initial_schema.sql
-- Description: Establishes profiles, events, budget_items, tasks, risks, and plan_revisions tables with comprehensive RLS and composite integrity constraints.

-- ============================================================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ============================================================================

-- Reusable timestamp updater
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Automatically updates updated_at column to current timestamp on row modification.';

-- ============================================================================
-- 2. USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.profiles IS 'Public user profile information linked 1:1 with Supabase auth.users.';

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile trigger on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      pg_catalog.split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Prevent signup failure if metadata parsing or profile insertion encounters an unexpected issue
    RAISE WARNING 'handle_new_user trigger encountered an error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create a default profile when a new user registers via Supabase Auth.';

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  location TEXT,
  guest_count INTEGER NOT NULL DEFAULT 0,
  budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  preferences TEXT,
  constraints TEXT,
  cultural_requirements TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

  -- Validation constraints
  CONSTRAINT chk_events_guest_count_nonnegative CHECK (guest_count >= 0),
  CONSTRAINT chk_events_budget_nonnegative CHECK (budget >= 0),
  CONSTRAINT chk_events_status_valid CHECK (
    status IN ('draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled')
  ),
  -- Unique composite constraint enabling secure child ownership enforcement
  CONSTRAINT uq_events_id_user_id UNIQUE (id, user_id)
);

COMMENT ON TABLE public.events IS 'Top-level event records owned by authenticated users.';

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. BUDGET ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  estimated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  actual_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

  -- Validation constraints
  CONSTRAINT chk_budget_items_estimated_nonnegative CHECK (estimated_amount >= 0),
  CONSTRAINT chk_budget_items_actual_nonnegative CHECK (actual_amount >= 0),
  -- Composite foreign key guarantees child item cannot reference an event belonging to another user
  CONSTRAINT fk_budget_items_event_user FOREIGN KEY (event_id, user_id)
    REFERENCES public.events(id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.budget_items IS 'Line-item expenses and cost tracking belonging to an event and owner.';

CREATE TRIGGER trg_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. TASKS & CHECKLIST ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  is_vendor_checklist BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

  -- Validation constraints
  CONSTRAINT chk_tasks_priority_valid CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  CONSTRAINT chk_tasks_status_valid CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  -- Composite foreign key guarantees child task cannot reference another user's event
  CONSTRAINT fk_tasks_event_user FOREIGN KEY (event_id, user_id)
    REFERENCES public.events(id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.tasks IS 'Milestones, operational tasks, and vendor checklist items for an event.';

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. RISKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  mitigation TEXT,
  status TEXT NOT NULL DEFAULT 'identified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

  -- Validation constraints
  CONSTRAINT chk_risks_severity_valid CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT chk_risks_status_valid CHECK (
    status IN ('identified', 'monitoring', 'mitigated', 'accepted', 'resolved')
  ),
  -- Composite foreign key guarantees child risk cannot reference another user's event
  CONSTRAINT fk_risks_event_user FOREIGN KEY (event_id, user_id)
    REFERENCES public.events(id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.risks IS 'Event Risk Radar log items tracking potential issues and mitigation strategies.';

CREATE TRIGGER trg_risks_updated_at
  BEFORE UPDATE ON public.risks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. PLAN REVISIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plan_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  structured_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),

  -- Validation constraints
  CONSTRAINT chk_plan_revisions_number_positive CHECK (revision_number > 0),
  CONSTRAINT uq_plan_revisions_event_revision UNIQUE (event_id, revision_number),
  -- Composite foreign key guarantees plan revision cannot reference another user's event
  CONSTRAINT fk_plan_revisions_event_user FOREIGN KEY (event_id, user_id)
    REFERENCES public.events(id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE public.plan_revisions IS 'Immutable versioned blueprints generated by AI or updated by event planner.';

-- ============================================================================
-- 8. PERFORMANCE INDEXES
-- ============================================================================

-- profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- events indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_created_at_desc ON public.events(created_at DESC);

-- budget_items indexes
CREATE INDEX IF NOT EXISTS idx_budget_items_event_id ON public.budget_items(event_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_user_id ON public.budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON public.budget_items(category);

-- tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_vendor_checklist ON public.tasks(is_vendor_checklist);

-- risks indexes
CREATE INDEX IF NOT EXISTS idx_risks_event_id ON public.risks(event_id);
CREATE INDEX IF NOT EXISTS idx_risks_user_id ON public.risks(user_id);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON public.risks(severity);
CREATE INDEX IF NOT EXISTS idx_risks_status ON public.risks(status);

-- plan_revisions indexes
CREATE INDEX IF NOT EXISTS idx_plan_revisions_event_id ON public.plan_revisions(event_id);
CREATE INDEX IF NOT EXISTS idx_plan_revisions_user_id ON public.plan_revisions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_revisions_event_revision ON public.plan_revisions(event_id, revision_number DESC);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_revisions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- EVENTS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "events_select_own"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "events_insert_own"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_update_own"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "events_delete_own"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- BUDGET ITEMS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "budget_items_select_own"
  ON public.budget_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "budget_items_insert_own"
  ON public.budget_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "budget_items_update_own"
  ON public.budget_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "budget_items_delete_own"
  ON public.budget_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- TASKS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "tasks_select_own"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_own"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_own"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- RISKS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "risks_select_own"
  ON public.risks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "risks_insert_own"
  ON public.risks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "risks_update_own"
  ON public.risks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "risks_delete_own"
  ON public.risks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PLAN REVISIONS POLICIES
-- ----------------------------------------------------------------------------

CREATE POLICY "plan_revisions_select_own"
  ON public.plan_revisions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "plan_revisions_insert_own"
  ON public.plan_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

-- Plan revisions are versioned historical records; only the owner can update if necessary
CREATE POLICY "plan_revisions_update_own"
  ON public.plan_revisions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "plan_revisions_delete_own"
  ON public.plan_revisions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- 10. LEAST-PRIVILEGE ROLE GRANTS & SUPABASE COMPATIBILITY
-- ============================================================================

-- Ensure the public schema is usable by Supabase client roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Revoke all table data manipulation permissions from anonymous (unauthenticated) users
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant table data permissions to authenticated users (governed strictly by RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Ensure service_role and database administrators retain administrative access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated;

-- Explicitly grant execute on auth trigger function to the auth administrator and service roles
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, postgres, service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, postgres, service_role;
