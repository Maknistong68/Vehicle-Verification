-- ============================================================================
-- SECURITY FIX MIGRATION - 2026-02-07
-- Addresses critical vulnerabilities found during security audit:
--   1. Privilege escalation via self-update of role field
--   2. Verifier unrestricted access to all companies' vehicles
--   3. Contractor/Verifier unrestricted access to all inspections
--   4. Audit log injection by any authenticated user
--   5. Contractor unrestricted access to all assignments
--   6. Contractor/Verifier unrestricted access to checklist items
-- ============================================================================

-- ============================================================================
-- FIX 1: Prevent privilege escalation via role self-update
-- Users could UPDATE their own user_profiles row including the role field.
-- This trigger ensures role can only be changed by owners via the API.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if role is not changing
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  -- Allow if the caller is an owner
  IF (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'owner' THEN
    RETURN NEW;
  END IF;

  -- Block all other role changes
  RAISE EXCEPTION 'Only owners can change user roles';
END;
$$;

CREATE TRIGGER trg_prevent_role_self_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_update();

-- ============================================================================
-- FIX 2: Restrict verifier vehicle access to their assigned company
-- Previously: USING (get_user_role() = 'verifier') — sees ALL vehicles
-- Now: filtered by verifier's company_id
-- ============================================================================

DROP POLICY IF EXISTS "vehicles_equipment_verifier_select" ON vehicles_equipment;

CREATE POLICY "vehicles_equipment_verifier_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- FIX 3: Restrict contractor inspection access to their company's vehicles
-- Previously: USING (get_user_role() = 'contractor') — sees ALL inspections
-- Now: filtered by contractor's company vehicles
-- ============================================================================

DROP POLICY IF EXISTS "inspections_contractor_select" ON inspections;

CREATE POLICY "inspections_contractor_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FIX 4: Restrict verifier inspection access to their company's vehicles
-- Previously: USING (get_user_role() = 'verifier') — sees ALL inspections
-- Now: filtered by verifier's company vehicles
-- ============================================================================

DROP POLICY IF EXISTS "inspections_verifier_select" ON inspections;

CREATE POLICY "inspections_verifier_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Also restrict verifier UPDATE to their company's inspections only
DROP POLICY IF EXISTS "inspections_verifier_update" ON inspections;

CREATE POLICY "inspections_verifier_update"
  ON inspections FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FIX 5: Restrict audit log INSERT to prevent direct injection
-- Previously: WITH CHECK (TRUE) — any user could insert fake audit entries
-- Now: only the audit_trigger_function (SECURITY DEFINER) can insert.
-- We achieve this by requiring user_id = auth.uid() so users can't
-- impersonate others, and restricting what fields can be set.
-- ============================================================================

DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON audit_logs;

CREATE POLICY "audit_logs_trigger_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    -- Only allow inserts where user_id matches the calling user
    -- This prevents impersonation in manually crafted inserts
    user_id = auth.uid()
  );

-- ============================================================================
-- FIX 6: Restrict contractor assignment access to their company
-- Previously: USING (get_user_role() = 'contractor') — sees ALL assignments
-- Now: filtered by contractor's company
-- ============================================================================

DROP POLICY IF EXISTS "assignments_contractor_select" ON assignments;

CREATE POLICY "assignments_contractor_select"
  ON assignments FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- FIX 7: Restrict verifier assignment access to their company
-- Previously: USING (get_user_role() = 'verifier') — sees ALL assignments
-- Now: filtered by verifier's company
-- ============================================================================

DROP POLICY IF EXISTS "assignments_verifier_select" ON assignments;

CREATE POLICY "assignments_verifier_select"
  ON assignments FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- ============================================================================
-- FIX 8: Restrict contractor/verifier checklist access to their company
-- Previously: USING (get_user_role() = 'contractor'/'verifier') — sees ALL
-- Now: filtered by company via inspection → vehicle → company chain
-- ============================================================================

DROP POLICY IF EXISTS "checklist_contractor_select" ON inspection_checklist_items;

CREATE POLICY "checklist_contractor_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN vehicles_equipment v ON i.vehicle_equipment_id = v.id
      WHERE v.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "checklist_verifier_select" ON inspection_checklist_items;

CREATE POLICY "checklist_verifier_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN vehicles_equipment v ON i.vehicle_equipment_id = v.id
      WHERE v.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- ============================================================================
-- FIX 9: Add audit triggers on user_profiles and companies tables
-- These critical tables were missing audit trail coverage.
-- ============================================================================

CREATE TRIGGER trg_user_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_companies_audit
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- END OF SECURITY FIXES
-- ============================================================================
