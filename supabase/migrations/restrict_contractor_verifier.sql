-- Migration: Restrict Contractor & Verifier to Lookup Only
-- Verifier sees ALL vehicles/inspections/assignments (not just their company)
-- Verification update capability removed

-- 1. Verifier can see ALL vehicles (remove company restriction)
DROP POLICY IF EXISTS "vehicles_equipment_verifier_select" ON vehicles_equipment;
CREATE POLICY "vehicles_equipment_verifier_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');

-- 2. Verifier can see ALL inspections (remove company restriction)
DROP POLICY IF EXISTS "inspections_verifier_select" ON inspections;
CREATE POLICY "inspections_verifier_select"
  ON inspections FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');

-- 3. Remove verifier update capability on inspections (verification removed)
DROP POLICY IF EXISTS "inspections_verifier_update" ON inspections;

-- 4. Verifier can see ALL assignments (remove company restriction)
DROP POLICY IF EXISTS "assignments_verifier_select" ON assignments;
CREATE POLICY "assignments_verifier_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');
