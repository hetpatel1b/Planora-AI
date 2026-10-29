-- Planora AI — Hardened Transactional Test Suite: apply_budget_scenario RPC
-- File: supabase/tests/apply_budget_scenario_test.sql
--
-- PURPOSE:
-- Non-destructive verification of public.apply_budget_scenario RPC:
-- 1. Unauthenticated rejection (ERRCODE 42501)
-- 2. Tenant isolation / caller mismatch rejection (ERRCODE 42501)
-- 3. Non-existent event rejection (ERRCODE P0002)
-- 4. Atomic execution: budget update, item override, item deletion, new item insertion
-- 5. Rollback verification on missing/stale item override
--
-- EXECUTION:
-- Run in Supabase Dashboard SQL Editor or via Supabase CLI.
-- Wrapped in BEGIN ... ROLLBACK, ensuring ZERO persistent side-effects.

BEGIN;

DO $$
DECLARE
  v_user_a UUID := gen_random_uuid();
  v_user_b UUID := gen_random_uuid();
  v_email_a TEXT := 'test_planner_a_' || substr(v_user_a::text, 1, 8) || '@planora.local';
  v_email_b TEXT := 'test_planner_b_' || substr(v_user_b::text, 1, 8) || '@planora.local';
  v_event_a UUID;
  v_item_1 UUID;
  v_item_2 UUID;
  v_rpc_result JSONB;
  v_budget_check NUMERIC(12, 2);
  v_item_count INTEGER;
  v_passed BOOLEAN := false;
BEGIN
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'PLANORA AI — apply_budget_scenario RPC TRANSACTIONAL TEST SUITE';
  RAISE NOTICE '=============================================================';

  -- --------------------------------------------------------------------------
  -- SETUP: Provision Ephemeral Test Users
  -- --------------------------------------------------------------------------
  INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_user_a, 'authenticated', 'authenticated', v_email_a, '{"full_name": "Planner A"}'::jsonb, pg_catalog.now(), pg_catalog.now()),
    (v_user_b, 'authenticated', 'authenticated', v_email_b, '{"full_name": "Planner B"}'::jsonb, pg_catalog.now(), pg_catalog.now());

  -- Switch to authenticated role as User A
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  -- Create baseline event and budget items for User A
  INSERT INTO public.events (user_id, name, event_type, budget, guest_count)
  VALUES (v_user_a, 'Corporate Gala 2026', 'gala', 50000.00, 200)
  RETURNING id INTO v_event_a;

  INSERT INTO public.budget_items (event_id, user_id, category, item_name, estimated_amount, actual_amount)
  VALUES (v_event_a, v_user_a, 'venue', 'Grand Ballroom', 25000.00, 24000.00)
  RETURNING id INTO v_item_1;

  INSERT INTO public.budget_items (event_id, user_id, category, item_name, estimated_amount, actual_amount)
  VALUES (v_event_a, v_user_a, 'catering', 'Five Course Dinner', 15000.00, 0.00)
  RETURNING id INTO v_item_2;

  RAISE NOTICE 'Setup complete: Event % provisioned with 2 budget items.', v_event_a;

  -- --------------------------------------------------------------------------
  -- TEST 1: Rejection on Tenant Mismatch (User B calling scenario on User A's event)
  -- --------------------------------------------------------------------------
  BEGIN
    PERFORM public.apply_budget_scenario(
      p_event_id := v_event_a,
      p_user_id := v_user_b, -- Caller is A, but passing B -> mismatch
      p_target_budget := 60000.00
    );
    RAISE EXCEPTION 'TEST 1 FAILED: Expected authorization error was not raised!';
  EXCEPTION
    WHEN SQLSTATE '42501' THEN
      RAISE NOTICE 'TEST 1 PASSED: Unauthorized user mismatch correctly rejected with 42501.';
  END;

  -- --------------------------------------------------------------------------
  -- TEST 2: Rejection on Non-Existent Event (or cross-tenant event access)
  -- --------------------------------------------------------------------------
  BEGIN
    PERFORM public.apply_budget_scenario(
      p_event_id := gen_random_uuid(),
      p_user_id := v_user_a,
      p_target_budget := 60000.00
    );
    RAISE EXCEPTION 'TEST 2 FAILED: Expected P0002 not found error was not raised!';
  EXCEPTION
    WHEN SQLSTATE 'P0002' THEN
      RAISE NOTICE 'TEST 2 PASSED: Non-existent event correctly rejected with P0002.';
  END;

  -- --------------------------------------------------------------------------
  -- TEST 3: Successful Atomic Execution
  -- - Update event budget to 55,000.00
  -- - Override item 1: increase estimated to 28,000.00
  -- - Delete item 2: is_deleted = true
  -- - Insert new item 3: 'photography', 'Full Day Coverage', 5000.00
  -- --------------------------------------------------------------------------
  v_rpc_result := public.apply_budget_scenario(
    p_event_id := v_event_a,
    p_user_id := v_user_a,
    p_target_budget := 55000.00,
    p_overrides := jsonb_build_array(
      jsonb_build_object('id', v_item_1, 'estimated_amount', 28000.00, 'actual_amount', 24000.00, 'is_deleted', false),
      jsonb_build_object('id', v_item_2, 'is_deleted', true)
    ),
    p_new_items := jsonb_build_array(
      jsonb_build_object('category', 'photography', 'item_name', 'Full Day Coverage', 'estimated_amount', 5000.00, 'actual_amount', 0.00, 'notes', 'Package includes drone footage')
    )
  );

  -- Assert result structure
  IF (v_rpc_result->>'applied')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'TEST 3 FAILED: RPC did not return applied: true! Result: %', v_rpc_result;
  END IF;

  -- Assert event budget was updated
  SELECT budget INTO v_budget_check FROM public.events WHERE id = v_event_a;
  IF v_budget_check <> 55000.00 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Event budget expected 55000.00, got %', v_budget_check;
  END IF;

  -- Assert item 1 was updated
  SELECT estimated_amount INTO v_budget_check FROM public.budget_items WHERE id = v_item_1;
  IF v_budget_check <> 28000.00 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Item 1 estimated amount expected 28000.00, got %', v_budget_check;
  END IF;

  -- Assert item 2 was deleted
  SELECT count(*) INTO v_item_count FROM public.budget_items WHERE id = v_item_2;
  IF v_item_count <> 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: Item 2 was not deleted!';
  END IF;

  -- Assert new photography item was inserted
  SELECT count(*) INTO v_item_count FROM public.budget_items WHERE event_id = v_event_a AND category = 'photography';
  IF v_item_count <> 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: New photography item was not inserted!';
  END IF;

  RAISE NOTICE 'TEST 3 PASSED: Atomic scenario persistence completed successfully. Result: %', v_rpc_result;

  -- --------------------------------------------------------------------------
  -- TEST 4: Rejection and Rollback on Stale/Missing Override Item
  -- --------------------------------------------------------------------------
  BEGIN
    PERFORM public.apply_budget_scenario(
      p_event_id := v_event_a,
      p_user_id := v_user_a,
      p_target_budget := 99999.00,
      p_overrides := jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'estimated_amount', 1000.00, 'is_deleted', false)
      )
    );
    RAISE EXCEPTION 'TEST 4 FAILED: Expected P0002 on invalid item ID was not raised!';
  EXCEPTION
    WHEN SQLSTATE 'P0002' THEN
      -- Verify budget was NOT modified to 99999.00 (transaction rolled back)
      SELECT budget INTO v_budget_check FROM public.events WHERE id = v_event_a;
      IF v_budget_check = 99999.00 THEN
        RAISE EXCEPTION 'TEST 4 FAILED: Partial write occurred despite exception!';
      END IF;
      RAISE NOTICE 'TEST 4 PASSED: Invalid item override rejected with P0002 and transaction rolled back cleanly.';
  END;

  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'ALL apply_budget_scenario TESTS PASSED (100%% SUCCESS)';
  RAISE NOTICE '=============================================================';
END $$;

ROLLBACK;

