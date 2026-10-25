-- Planora AI — Database Migration: Tighten accept_plan_blueprint Authorization
-- Migration: 20261025183000_tighten_accept_plan_blueprint_auth.sql
-- Description: Hardens public.accept_plan_blueprint RPC entry authorization check to strictly
-- reject unauthenticated execution (auth.uid() IS NULL), missing p_user_id, or caller/tenant mismatch.

CREATE OR REPLACE FUNCTION public.accept_plan_blueprint(
  p_event_id UUID,
  p_user_id UUID,
  p_structured_plan JSONB,
  p_summary TEXT,
  p_tasks JSONB DEFAULT '[]'::jsonb,
  p_budget_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_next_rev INTEGER;
  v_new_revision_id UUID;
  v_inserted_revision RECORD;
  v_task RECORD;
  v_budget RECORD;
BEGIN
  -- 1. Strict authorization check: session must be authenticated and match p_user_id
  IF p_user_id IS NULL OR auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: User ID mismatch or session unauthenticated.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify event ownership and acquire exclusive row lock to serialize concurrent approvals
  PERFORM 1 FROM public.events
  WHERE id = p_event_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or access denied.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Determine next sequential revision number for this event
  SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_next_rev
  FROM public.plan_revisions
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 4. Deactivate any currently active revisions for this event
  UPDATE public.plan_revisions
  SET is_active = false
  WHERE event_id = p_event_id AND user_id = p_user_id AND is_active = true;

  -- 5. Insert new plan revision as active
  INSERT INTO public.plan_revisions (
    event_id,
    user_id,
    revision_number,
    structured_plan,
    summary,
    is_active
  )
  VALUES (
    p_event_id,
    p_user_id,
    v_next_rev,
    p_structured_plan,
    p_summary,
    true
  )
  RETURNING id, event_id, user_id, revision_number, structured_plan, summary, is_active, created_at
  INTO v_inserted_revision;

  v_new_revision_id := v_inserted_revision.id;

  -- 6. Atomically delete previous AI-generated tasks for this event (preserve manual tasks where plan_revision_id IS NULL)
  DELETE FROM public.tasks
  WHERE event_id = p_event_id
    AND user_id = p_user_id
    AND plan_revision_id IS NOT NULL;

  -- 7. Atomically delete previous AI-generated budget items for this event (preserve manual budget items where plan_revision_id IS NULL)
  DELETE FROM public.budget_items
  WHERE event_id = p_event_id
    AND user_id = p_user_id
    AND plan_revision_id IS NOT NULL;

  -- 8. Insert newly selected AI-generated tasks
  IF p_tasks IS NOT NULL AND jsonb_array_length(p_tasks) > 0 THEN
    FOR v_task IN SELECT * FROM jsonb_to_recordset(p_tasks) AS x(
      title TEXT,
      description TEXT,
      due_date TIMESTAMPTZ,
      priority TEXT,
      status TEXT,
      is_vendor_checklist BOOLEAN
    )
    LOOP
      INSERT INTO public.tasks (
        event_id,
        user_id,
        plan_revision_id,
        title,
        description,
        due_date,
        priority,
        status,
        is_vendor_checklist
      )
      VALUES (
        p_event_id,
        p_user_id,
        v_new_revision_id,
        v_task.title,
        v_task.description,
        v_task.due_date,
        COALESCE(v_task.priority, 'medium'),
        COALESCE(v_task.status, 'pending'),
        COALESCE(v_task.is_vendor_checklist, false)
      );
    END LOOP;
  END IF;

  -- 9. Insert newly selected AI-generated budget items
  IF p_budget_items IS NOT NULL AND jsonb_array_length(p_budget_items) > 0 THEN
    FOR v_budget IN SELECT * FROM jsonb_to_recordset(p_budget_items) AS x(
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
        plan_revision_id,
        category,
        item_name,
        estimated_amount,
        actual_amount,
        notes
      )
      VALUES (
        p_event_id,
        p_user_id,
        v_new_revision_id,
        v_budget.category,
        v_budget.item_name,
        COALESCE(v_budget.estimated_amount, 0),
        COALESCE(v_budget.actual_amount, 0),
        v_budget.notes
      );
    END LOOP;
  END IF;

  -- 10. Return the new revision record
  RETURN to_jsonb(v_inserted_revision);
END;
$$;

COMMENT ON FUNCTION public.accept_plan_blueprint(UUID, UUID, JSONB, TEXT, JSONB, JSONB) IS
  'Atomically establishes an approved plan revision, purges previous AI-generated tasks and budget items, preserves manual user records, and inserts newly selected items.';

GRANT EXECUTE ON FUNCTION public.accept_plan_blueprint(UUID, UUID, JSONB, TEXT, JSONB, JSONB) TO authenticated, service_role;
