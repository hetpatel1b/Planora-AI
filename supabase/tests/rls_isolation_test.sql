-- Planora AI — Hardened Transactional RLS Isolation Test Suite
-- File: supabase/tests/rls_isolation_test.sql
-- 
-- PURPOSE:
-- Rigorous, non-destructive verification of Row Level Security (RLS),
-- cross-tenant isolation, child-record ownership integrity, and anonymous access.
--
-- EXECUTION:
-- Run this script in the Supabase Dashboard SQL Editor.
-- Wrapped entirely in a transaction that ends with ROLLBACK, ensuring ZERO
-- persistent records remain in your database.
--
-- IMPORTANT SAFETY NOTE:
-- In PostgreSQL, an unhandled exception also causes the transaction to abort
-- and roll back. An error output must NEVER be mistaken for a passing test.
-- The test has passed ONLY if every assertion outputs 'PASSED' and the final
-- summary notice is displayed before the ROLLBACK.

BEGIN;

DO $$
DECLARE
  v_user_a UUID := gen_random_uuid();
  v_user_b UUID := gen_random_uuid();
  v_email_a TEXT;
  v_email_b TEXT;
  v_event_a UUID;
  v_event_b UUID;
  v_task_b UUID;
  v_count INTEGER;
  v_rows_affected INTEGER;
  v_blocked BOOLEAN;
  v_err_code TEXT;
  v_err_msg TEXT;
  v_users_in_auth INTEGER;
  v_trg_count INTEGER;
  v_diag_err TEXT;
BEGIN
  v_email_a := 'test_planner_a_' || substr(v_user_a::text, 1, 8) || '@planora.local';
  v_email_b := 'test_planner_b_' || substr(v_user_b::text, 1, 8) || '@planora.local';

  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'PLANORA AI — RLS SECURITY & CROSS-TENANT ISOLATION TEST SUITE';
  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'Generated Ephemeral User A: % (%)', v_user_a, v_email_a;
  RAISE NOTICE 'Generated Ephemeral User B: % (%)', v_user_b, v_email_b;

  -- ==========================================================================
  -- SETUP: Provision Ephemeral Test Users in auth.users (as postgres)
  -- ==========================================================================
  BEGIN
    INSERT INTO auth.users (
      id,
      aud,
      role,
      email,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES 
      (v_user_a, 'authenticated', 'authenticated', v_email_a, '{"full_name": "Test Planner A"}'::jsonb, pg_catalog.now(), pg_catalog.now()),
      (v_user_b, 'authenticated', 'authenticated', v_email_b, '{"full_name": "Test Planner B"}'::jsonb, pg_catalog.now(), pg_catalog.now());
    RAISE NOTICE 'Setup OK: Ephemeral auth.users provisioned.';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'SETUP FAILED: Unable to provision mock auth.users for test: % (%)', SQLERRM, SQLSTATE;
  END;

  -- --------------------------------------------------------------------------
  -- TEST 0: Profile Creation Trigger Verification (handle_new_user)
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.profiles WHERE id IN (v_user_a, v_user_b);
  IF v_count <> 2 THEN
    -- Collect deep diagnostic telemetry to surface the exact root cause
    SELECT count(*) INTO v_users_in_auth FROM auth.users WHERE id IN (v_user_a, v_user_b);
    SELECT count(*) INTO v_trg_count 
    FROM pg_catalog.pg_trigger trg
    JOIN pg_catalog.pg_class cls ON cls.oid = trg.tgrelid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'auth' AND cls.relname = 'users' 
      AND trg.tgname = 'on_auth_user_created' 
      AND trg.tgenabled = 'O';

    BEGIN
      INSERT INTO public.profiles (id, display_name, avatar_url)
      VALUES (
        v_user_a,
        COALESCE('Test Planner A', pg_catalog.split_part(v_email_a, '@', 1)),
        NULL
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        v_diag_err := SQLERRM || ' (SQLSTATE ' || SQLSTATE || ')';
    END;

    RAISE EXCEPTION 'TEST 0 FAILED: on_auth_user_created trigger did not create profiles for both test users (found % expected 2). Diagnostics: auth.users count=%, trigger on_auth_user_created enabled=%, direct profile insert test error="%"',
      v_count, v_users_in_auth, (v_trg_count > 0), COALESCE(v_diag_err, 'None (direct insert succeeds; trigger function handle_new_user failed during auth.users insert)');
  END IF;
  RAISE NOTICE 'TEST 0 PASSED: handle_new_user trigger correctly provisioned public.profiles for both users.';

  -- ==========================================================================
  -- ACTIVATE RLS: Switch Role to 'authenticated'
  -- (Crucial: postgres role bypasses RLS; switching role to authenticated forces
  -- PostgreSQL to actively evaluate table RLS policies)
  -- ==========================================================================
  EXECUTE 'SET LOCAL ROLE authenticated';

  -- --------------------------------------------------------------------------
  -- STEP 1: User A Creates Event A and Child Records
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  INSERT INTO public.events (user_id, name, event_type, budget, guest_count)
  VALUES (v_user_a, 'Annual Horizon Summit (User A)', 'conference', 75000.00, 350)
  RETURNING id INTO v_event_a;

  IF v_event_a IS NULL THEN
    RAISE EXCEPTION 'STEP 1 FAILED: v_event_a was not generated!';
  END IF;

  INSERT INTO public.budget_items (event_id, user_id, category, item_name, estimated_amount)
  VALUES (v_event_a, v_user_a, 'venue', 'Convention Center Grand Hall', 30000.00);

  INSERT INTO public.tasks (event_id, user_id, title, priority, status)
  VALUES (v_event_a, v_user_a, 'Countersign AV Contract', 'high', 'pending');

  INSERT INTO public.risks (event_id, user_id, risk_type, title, severity)
  VALUES (v_event_a, v_user_a, 'vendor', 'Main Stage LED Delivery Delay', 'high');

  INSERT INTO public.plan_revisions (event_id, user_id, revision_number, structured_plan, summary)
  VALUES (v_event_a, v_user_a, 1, '{"milestones": 8}'::jsonb, 'Initial AI Draft');

  -- Verify baseline visibility for User A (proves records actually exist)
  SELECT count(*) INTO v_count FROM public.events WHERE id = v_event_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'STEP 1 FAILED: User A cannot read their own newly created event!';
  END IF;

  SELECT count(*) INTO v_count FROM public.budget_items WHERE event_id = v_event_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'STEP 1 FAILED: User A cannot read their own budget item!';
  END IF;

  RAISE NOTICE 'Step 1 OK: User A created Event % and 4 associated child records (baseline verified).', v_event_a;

  -- --------------------------------------------------------------------------
  -- STEP 2: Switch Context to User B & Create Event B
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);

  INSERT INTO public.events (user_id, name, event_type, budget, guest_count)
  VALUES (v_user_b, 'Executive Partner Meetup (User B)', 'meetup', 12000.00, 45)
  RETURNING id INTO v_event_b;

  IF v_event_b IS NULL THEN
    RAISE EXCEPTION 'STEP 2 FAILED: v_event_b was not generated!';
  END IF;

  -- User B creates a legitimate task on Event B (for re-parenting test later)
  INSERT INTO public.tasks (event_id, user_id, title)
  VALUES (v_event_b, v_user_b, 'User B Catering Tasting')
  RETURNING id INTO v_task_b;

  IF v_task_b IS NULL THEN
    RAISE EXCEPTION 'STEP 2 FAILED: v_task_b was not generated!';
  END IF;

  RAISE NOTICE 'Step 2 OK: User B created Event % and Task %.', v_event_b, v_task_b;

  -- --------------------------------------------------------------------------
  -- TEST 1: User B Cross-Tenant SELECT on User A Event
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.events WHERE id = v_event_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: User B was able to view User A event! RLS events_select_own failed.';
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: User B cannot select User A event (count = 0).';

  -- --------------------------------------------------------------------------
  -- TEST 2: User B Cross-Tenant SELECT on User A Child Records
  -- --------------------------------------------------------------------------
  SELECT count(*) INTO v_count FROM public.budget_items WHERE event_id = v_event_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B was able to view User A budget items!';
  END IF;

  SELECT count(*) INTO v_count FROM public.tasks WHERE event_id = v_event_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B was able to view User A tasks!';
  END IF;

  SELECT count(*) INTO v_count FROM public.risks WHERE event_id = v_event_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B was able to view User A risks!';
  END IF;

  SELECT count(*) INTO v_count FROM public.plan_revisions WHERE event_id = v_event_a;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User B was able to view User A plan revisions!';
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: User B cannot select any User A child records (count = 0 across all 4 tables).';

  -- --------------------------------------------------------------------------
  -- TEST 3: User B Cross-Tenant UPDATE on User A Event
  -- --------------------------------------------------------------------------
  UPDATE public.events SET name = 'Compromised by User B' WHERE id = v_event_a;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: User B update reported % affected rows on User A event!', v_rows_affected;
  END IF;

  -- Confirm original event name remains uncorrupted
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.events WHERE id = v_event_a AND name = 'Annual Horizon Summit (User A)';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: User A event was altered or missing!';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  RAISE NOTICE 'TEST 3 PASSED: User B UPDATE on User A event was blocked (0 rows affected; record unchanged).';

  -- --------------------------------------------------------------------------
  -- TEST 4: User B Cross-Tenant DELETE on User A Event
  -- --------------------------------------------------------------------------
  DELETE FROM public.events WHERE id = v_event_a;
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected <> 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: User B delete reported % affected rows on User A event!', v_rows_affected;
  END IF;

  -- Confirm User A event still exists
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO v_count FROM public.events WHERE id = v_event_a;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: User A event was deleted!';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_b, 'role', 'authenticated')::text, true);
  RAISE NOTICE 'TEST 4 PASSED: User B DELETE on User A event was blocked (0 rows affected; record intact).';

  -- --------------------------------------------------------------------------
  -- TEST 5: User B Cross-Tenant Task Attachment (INSERT)
  -- User B attempts to attach a new task to User A's event.
  -- --------------------------------------------------------------------------
  v_blocked := false;
  v_err_code := '';
  v_err_msg := '';
  BEGIN
    INSERT INTO public.tasks (event_id, user_id, title)
    VALUES (v_event_a, v_user_b, 'Unauthorized Task on User A Event');
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := true;
      v_err_code := SQLSTATE;
      v_err_msg := SQLERRM;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST 5 FAILED: User B was able to attach a task to User A event! RLS/FK failed.';
  ELSE
    IF v_err_code NOT IN ('42501', '23503') THEN
      RAISE EXCEPTION 'TEST 5 FAILED: Unexpected error code % (expected 42501 or 23503): %', v_err_code, v_err_msg;
    END IF;
    RAISE NOTICE 'TEST 5 PASSED: Cross-tenant task insert correctly blocked (SQLSTATE %, Error: %)', v_err_code, v_err_msg;
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 6: User B Cross-Tenant Budget Item Attachment (INSERT)
  -- User B attempts to attach a new budget item to User A's event.
  -- --------------------------------------------------------------------------
  v_blocked := false;
  v_err_code := '';
  v_err_msg := '';
  BEGIN
    INSERT INTO public.budget_items (event_id, user_id, category, item_name, estimated_amount)
    VALUES (v_event_a, v_user_b, 'catering', 'Unauthorized Catering Expense', 2500.00);
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := true;
      v_err_code := SQLSTATE;
      v_err_msg := SQLERRM;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST 6 FAILED: User B was able to attach a budget item to User A event! RLS/FK failed.';
  ELSE
    IF v_err_code NOT IN ('42501', '23503') THEN
      RAISE EXCEPTION 'TEST 6 FAILED: Unexpected error code % (expected 42501 or 23503): %', v_err_code, v_err_msg;
    END IF;
    RAISE NOTICE 'TEST 6 PASSED: Cross-tenant budget item insert correctly blocked (SQLSTATE %, Error: %)', v_err_code, v_err_msg;
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 7: Task Re-Parenting on UPDATE
  -- User B attempts to move an existing task (Task B) onto User A's Event A.
  -- --------------------------------------------------------------------------
  v_blocked := false;
  v_err_code := '';
  v_err_msg := '';
  BEGIN
    UPDATE public.tasks SET event_id = v_event_a WHERE id = v_task_b;
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := true;
      v_err_code := SQLSTATE;
      v_err_msg := SQLERRM;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST 7 FAILED: User B was able to re-parent a task onto User A event!';
  ELSE
    IF v_err_code NOT IN ('42501', '23503') THEN
      RAISE EXCEPTION 'TEST 7 FAILED: Unexpected error code %: %', v_err_code, v_err_msg;
    END IF;
    RAISE NOTICE 'TEST 7 PASSED: Task re-parenting update correctly blocked (SQLSTATE %, Error: %)', v_err_code, v_err_msg;
  END IF;

  -- --------------------------------------------------------------------------
  -- TEST 8: Event Ownership Hijack Attack on UPDATE
  -- User A attempts to reassign user_id on their event to User B.
  -- --------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a, 'role', 'authenticated')::text, true);

  v_blocked := false;
  v_err_code := '';
  v_err_msg := '';
  BEGIN
    UPDATE public.events SET user_id = v_user_b WHERE id = v_event_a;
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := true;
      v_err_code := SQLSTATE;
      v_err_msg := SQLERRM;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'TEST 8 FAILED: User A was able to reassign event user_id to User B!';
  ELSE
    IF v_err_code NOT IN ('42501', '23503') THEN
      RAISE EXCEPTION 'TEST 8 FAILED: Unexpected error code % (expected 42501 or 23503): %', v_err_code, v_err_msg;
    END IF;
    RAISE NOTICE 'TEST 8 PASSED: Event ownership reassignment update correctly blocked by RLS/FK (SQLSTATE %)', v_err_code;
  END IF;

  -- ==========================================================================
  -- TEST 9: Anonymous (Unauthenticated) Access Probe
  -- ==========================================================================
  EXECUTE 'RESET ROLE';
  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);

  v_blocked := false;
  v_err_code := '';
  v_err_msg := '';
  BEGIN
    SELECT count(*) INTO v_count FROM public.events;
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := true;
      v_err_code := SQLSTATE;
      v_err_msg := SQLERRM;
  END;

  IF v_blocked THEN
    -- DAC Table grant revocation blocked the query (expected behavior under REVOKE ALL ON ALL TABLES ... FROM anon)
    IF v_err_code = '42501' THEN
      RAISE NOTICE 'TEST 9 PASSED: Anonymous table query blocked by DAC privilege revocation (SQLSTATE 42501: %)', v_err_msg;
    ELSE
      RAISE EXCEPTION 'TEST 9 FAILED: Anonymous query failed with unexpected code %: %', v_err_code, v_err_msg;
    END IF;
  ELSE
    -- If table select had been granted, RLS default deny must return 0 rows
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TEST 9 FAILED: Anonymous user was able to read % rows!', v_count;
    END IF;
    RAISE NOTICE 'TEST 9 PASSED: Anonymous query returned 0 rows via RLS default deny.';
  END IF;

  -- Restore role before transaction ends
  EXECUTE 'RESET ROLE';

  RAISE NOTICE '=============================================================';
  RAISE NOTICE 'SUCCESS: ALL 10 TESTS PASSED — RLS & INTEGRITY ARE VERIFIED';
  RAISE NOTICE '=============================================================';
END $$;

-- Transaction rollback guarantees zero test data persists
ROLLBACK;
