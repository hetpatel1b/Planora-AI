-- Planora AI — Database Migration: Distributed AI Rate Limiting & Abuse Prevention
-- Migration: 20261030000000_ai_rate_limits.sql
-- Description: Establishes public.ai_rate_limits table and public.check_ai_rate_limit RPC.
-- Provides atomic, distributed sliding-window rate limiting across independent serverless instances
-- using transaction-scoped PostgreSQL advisory locks and strict tenant identity enforcement.

-- ============================================================================
-- 1. AI RATE LIMITS LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

COMMENT ON TABLE public.ai_rate_limits IS 
  'Stores rate limit timestamps for expensive AI operations (Copilot, Plan synthesis) across serverless instances.';

-- Composite index for fast sliding-window lookup and per-user/action cleanup
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_action_window
  ON public.ai_rate_limits (user_id, action, requested_at DESC);

-- Enable Row-Level Security
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Block direct client table access (SELECT/INSERT/UPDATE/DELETE).
-- All rate-limiting evaluations must proceed strictly through the SECURITY DEFINER RPC.
REVOKE ALL ON TABLE public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_rate_limits TO service_role, postgres;

-- ============================================================================
-- 2. ATOMIC SLIDING-WINDOW RATE LIMITER RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_reset_ms INTEGER;
BEGIN
  -- 1. Identity barrier: caller must be authenticated and match target user
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required.' USING ERRCODE = '22004';
  END IF;

  -- Verify authenticated session caller matches the requested user ID
  IF auth.role() = 'authenticated' AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Caller identity does not match p_user_id.' USING ERRCODE = '42501';
  END IF;

  -- Reject unauthenticated or anonymous callers
  IF auth.role() IS NULL OR auth.role() = 'anon' THEN
    RAISE EXCEPTION 'Unauthorized: Unauthenticated callers cannot evaluate rate limits.' USING ERRCODE = '42501';
  END IF;

  -- Verify that target user exists in auth.users to prevent arbitrary user impersonation
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Strict input parameter validation
  IF p_action NOT IN ('copilot', 'plan_generation') THEN
    RAISE EXCEPTION 'Invalid rate limit action "%". Allowed: copilot, plan_generation.' , p_action USING ERRCODE = '22023';
  END IF;

  IF p_max_requests IS NULL OR p_max_requests <= 0 OR p_max_requests > 1000 THEN
    RAISE EXCEPTION 'p_max_requests must be between 1 and 1000.' USING ERRCODE = '22023';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds <= 0 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'p_window_seconds must be between 1 and 86400.' USING ERRCODE = '22023';
  END IF;

  -- 3. Atomic Concurrency Serialization:
  -- Acquire transaction-scoped advisory lock on 64-bit hash of (user_id, action).
  -- Guarantees concurrent serverless lambdas cannot interleave reads and inserts.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_user_id::text || ':' || p_action)
  );

  v_cutoff := pg_catalog.now() - (p_window_seconds || ' seconds')::INTERVAL;

  -- 4. Bounded cleanup of expired timestamps for this specific user and action
  DELETE FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND requested_at < v_cutoff;

  -- 5. Count active requests within the current sliding window
  SELECT count(*), min(requested_at)
  INTO v_count, v_oldest
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND requested_at >= v_cutoff;

  -- 6. Enforce rate limit threshold
  IF v_count >= p_max_requests THEN
    v_reset_ms := pg_catalog.greatest(
      0,
      EXTRACT(EPOCH FROM (v_oldest + (p_window_seconds || ' seconds')::INTERVAL - pg_catalog.now())) * 1000
    )::INTEGER;

    RETURN pg_catalog.jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_ms', v_reset_ms
    );
  END IF;

  -- 7. Record request hit
  INSERT INTO public.ai_rate_limits (user_id, action, requested_at)
  VALUES (p_user_id, p_action, pg_catalog.now());

  RETURN pg_catalog.jsonb_build_object(
    'allowed', true,
    'remaining', p_max_requests - (v_count + 1),
    'reset_ms', p_window_seconds * 1000
  );
END;
$$;

COMMENT ON FUNCTION public.check_ai_rate_limit(UUID, TEXT, INTEGER, INTEGER) IS
  'Atomically checks and enforces distributed sliding-window AI rate limits using advisory locking.';

-- Explicit privilege restriction: deny PUBLIC and anon execution
REVOKE ALL ON FUNCTION public.check_ai_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;

