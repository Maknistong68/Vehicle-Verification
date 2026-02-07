-- ============================================================================
-- Migration: Inspection Expiry Detection
-- Date: 2026-02-07
-- Description:
--   1. Trigger to sync inspection results (pass/fail) to vehicle status
--   2. Function to mark overdue vehicles (verified + past next_inspection_date)
-- ============================================================================

-- ============================================================================
-- 1. Trigger: Sync inspection result to vehicle status
-- When an inspection is completed:
--   pass  → vehicle status = 'verified', next_inspection_date = NOW() + 1 year
--   fail  → vehicle status = 'rejected'
-- Never overrides 'blacklisted' vehicles
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_inspection_result_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    IF NEW.result = 'pass' THEN
      UPDATE vehicles_equipment
      SET status = 'verified', next_inspection_date = NOW() + INTERVAL '1 year'
      WHERE id = NEW.vehicle_equipment_id AND status != 'blacklisted';
    ELSIF NEW.result = 'fail' THEN
      UPDATE vehicles_equipment
      SET status = 'rejected'
      WHERE id = NEW.vehicle_equipment_id AND status != 'blacklisted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inspection_result_sync
  AFTER INSERT OR UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION handle_inspection_result_sync();


-- ============================================================================
-- 2. Function: Mark overdue vehicles
-- Updates vehicles from 'verified' to 'inspection_overdue' when
-- next_inspection_date has passed. Can be called manually or by pg_cron.
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_overdue_vehicles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vehicles_equipment
  SET status = 'inspection_overdue'
  WHERE next_inspection_date < NOW()
    AND status = 'verified';
END;
$$;

-- Run once immediately to fix all currently-stale vehicles
SELECT mark_overdue_vehicles();

-- If pg_cron is available (Supabase Pro), uncomment to schedule daily:
-- SELECT cron.schedule('mark-overdue-vehicles', '5 0 * * *', $$SELECT mark_overdue_vehicles()$$);
