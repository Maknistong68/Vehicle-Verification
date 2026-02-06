-- Trigger: Auto-update vehicle status when inspection is submitted or verified
-- Logic:
--   completed + fail → vehicle = 'rejected'
--   completed + pass + not verified → vehicle = 'updated_inspection_required'
--   verified + pass → vehicle = 'verified'

CREATE OR REPLACE FUNCTION update_vehicle_status_on_inspection()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- Get the vehicle_equipment_id from the inspection
  v_vehicle_id := NEW.vehicle_equipment_id;

  -- Case 1: Inspection completed with fail result
  IF NEW.status = 'completed' AND NEW.result = 'fail' THEN
    UPDATE vehicles_equipment
    SET status = 'rejected', updated_at = NOW()
    WHERE id = v_vehicle_id;

  -- Case 2: Inspection verified with pass result
  ELSIF NEW.verified_at IS NOT NULL AND NEW.result = 'pass' THEN
    UPDATE vehicles_equipment
    SET status = 'verified', updated_at = NOW()
    WHERE id = v_vehicle_id;

  -- Case 3: Inspection completed with pass but not yet verified
  ELSIF NEW.status = 'completed' AND NEW.result = 'pass' AND NEW.verified_at IS NULL THEN
    UPDATE vehicles_equipment
    SET status = 'updated_inspection_required', updated_at = NOW()
    WHERE id = v_vehicle_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS trigger_update_vehicle_status ON inspections;

CREATE TRIGGER trigger_update_vehicle_status
  AFTER UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_status_on_inspection();
