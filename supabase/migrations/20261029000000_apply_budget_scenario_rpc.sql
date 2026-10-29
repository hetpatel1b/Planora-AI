-- Planora AI — Database Migration: Atomic Budget Scenario Application RPC
-- Migration: 20261029000000_apply_budget_scenario_rpc.sql
-- Description: Creates public.apply_budget_scenario RPC for atomic transaction persistence
-- of what-if budget simulation scenarios. Ensures serialization, row locking, and all-or-nothing
-- rollback on any constraint or authorization violation.

CREATE OR REPLACE FUNCTION public.apply_budget_scenario(
  p_event_id UUID,
  p_user_id UUID,
  p_target_budget NUMERIC(12, 2) DEFAULT NULL,
  p_overrides JSONB DEFAULT '[]'::jsonb,
  p_new_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_override RECORD;
  v_new_item RECORD;
  v_overrides_count INTEGER := 0;
  v_new_items_count INTEGER := 0;
BEGIN
  -- 1. Strict authorization check: session must be authenticated and caller must match p_user_id
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch or session unauthenticated.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify event ownership and acquire exclusive row lock to serialize concurrent updates
  PERFORM 1 FROM public.events
  WHERE id = p_event_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or access denied.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Update target budget on the event record if specified
  IF p_target_budget IS NOT NULL THEN
    UPDATE public.events
    SET
      budget = p_target_budget,
      updated_at = pg_catalog.now()
    WHERE id = p_event_id AND user_id = p_user_id;
  END IF;

  -- 4. Process item overrides (amount adjustments and line-item deletions)
  IF p_overrides IS NOT NULL AND jsonb_array_length(p_overrides) > 0 THEN
    FOR v_override IN SELECT * FROM jsonb_to_recordset(p_overrides) AS x(
      id UUID,
      estimated_amount NUMERIC(12, 2),
      actual_amount NUMERIC(12, 2),
      is_deleted BOOLEAN
    )
    LOOP
      IF v_override.is_deleted IS TRUE THEN
        DELETE FROM public.budget_items
        WHERE id = v_override.id
          AND event_id = p_event_id
          AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Budget item % not found in event or access denied.' , v_override.id USING ERRCODE = 'P0002';
        END IF;

        v_overrides_count := v_overrides_count + 1;
      ELSE
        UPDATE public.budget_items
        SET
          estimated_amount = COALESCE(v_override.estimated_amount, estimated_amount),
          actual_amount = COALESCE(v_override.actual_amount, actual_amount),
          updated_at = pg_catalog.now()
        WHERE id = v_override.id
          AND event_id = p_event_id
          AND user_id = p_user_id;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Budget item % not found in event or access denied.' , v_override.id USING ERRCODE = 'P0002';
        END IF;

        v_overrides_count := v_overrides_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- 5. Insert newly proposed scenario items
  IF p_new_items IS NOT NULL AND jsonb_array_length(p_new_items) > 0 THEN
    FOR v_new_item IN SELECT * FROM jsonb_to_recordset(p_new_items) AS x(
      category TEXT,
      item_name TEXT,
      estimated_amount NUMERIC(12, 2),
      actual_amount NUMERIC(12, 2),
      notes TEXT
    )
    LOOP
      INSERT INTO public.budget_items (
        event_id,
        user_id,
        category,
        item_name,
        estimated_amount,
        actual_amount,
        notes
      )
      VALUES (
        p_event_id,
        p_user_id,
        v_new_item.category,
        v_new_item.item_name,
        COALESCE(v_new_item.estimated_amount, 0.00),
        COALESCE(v_new_item.actual_amount, 0.00),
        v_new_item.notes
      );

      v_new_items_count := v_new_items_count + 1;
    END LOOP;
  END IF;

  -- 6. Return confirmation summary
  RETURN jsonb_build_object(
    'applied', true,
    'event_id', p_event_id,
    'overrides_applied', v_overrides_count,
    'items_inserted', v_new_items_count
  );
END;
$$;

COMMENT ON FUNCTION public.apply_budget_scenario(UUID, UUID, NUMERIC, JSONB, JSONB) IS
  'Atomically applies a what-if budget simulation scenario to the persistent event workspace in a single transaction.';

GRANT EXECUTE ON FUNCTION public.apply_budget_scenario(UUID, UUID, NUMERIC, JSONB, JSONB) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.apply_budget_scenario(UUID, UUID, NUMERIC, JSONB, JSONB) FROM anon, public;

