-- ============================================================================
-- Medium Security Fixes: Restrict status transitions by role
-- ============================================================================

-- 1. Restrict inspection status changes by role
-- Only owner/admin can set status to 'cancelled'
-- Only inspectors can set status to 'completed' (via submit)
-- Only verifiers can set verified_by/verified_at
CREATE OR REPLACE FUNCTION enforce_inspection_status_rules()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE id = auth.uid();

  -- Only owner/admin can cancel inspections
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF current_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Only owners and admins can cancel inspections';
    END IF;
  END IF;

  -- Only inspectors can complete inspections (submit results)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF current_role NOT IN ('owner', 'admin', 'inspector') THEN
      RAISE EXCEPTION 'Only inspectors can submit inspection results';
    END IF;
  END IF;

  -- Only verifiers (and owner/admin) can set verified_by
  IF NEW.verified_by IS NOT NULL AND OLD.verified_by IS NULL THEN
    IF current_role NOT IN ('owner', 'admin', 'verifier') THEN
      RAISE EXCEPTION 'Only verifiers can verify inspections';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_inspection_status ON inspections;
CREATE TRIGGER trg_enforce_inspection_status
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION enforce_inspection_status_rules();

-- 2. Restrict assignment status changes by role
-- Only owner/admin can set any status freely
-- Inspectors can only set 'done' or 'delayed' (not 'assigned' or 'rescheduled')
CREATE OR REPLACE FUNCTION enforce_assignment_status_rules()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE id = auth.uid();

  -- Validate status is a known value
  IF NEW.status NOT IN ('assigned', 'rescheduled', 'done', 'delayed') THEN
    RAISE EXCEPTION 'Invalid assignment status: %', NEW.status;
  END IF;

  -- Inspectors can only mark as done or delayed
  IF current_role = 'inspector' THEN
    IF NEW.status NOT IN ('done', 'delayed') AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Inspectors can only mark assignments as done or delayed';
    END IF;
  END IF;

  -- Contractors and verifiers cannot update assignments at all (RLS blocks this,
  -- but belt-and-suspenders)
  IF current_role IN ('contractor', 'verifier') THEN
    RAISE EXCEPTION 'Contractors and verifiers cannot modify assignments';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_assignment_status ON assignments;
CREATE TRIGGER trg_enforce_assignment_status
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_assignment_status_rules();

-- 3. Restrict inspection result values to valid enum
CREATE OR REPLACE FUNCTION enforce_inspection_result_values()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result IS NOT NULL AND NEW.result NOT IN ('pending', 'pass', 'fail') THEN
    RAISE EXCEPTION 'Invalid inspection result: %', NEW.result;
  END IF;

  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('scheduled', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid inspection status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_inspection_values ON inspections;
CREATE TRIGGER trg_enforce_inspection_values
  BEFORE INSERT OR UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION enforce_inspection_result_values();
