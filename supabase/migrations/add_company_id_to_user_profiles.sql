-- Migration: Add company_id to user_profiles + update contractor/verifier RLS policies
-- Run this in Supabase SQL Editor

-- 1. Add company_id column to user_profiles
ALTER TABLE user_profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);

-- 2. Tighten contractor: only see own company's vehicles
DROP POLICY IF EXISTS "vehicles_equipment_contractor_select" ON vehicles_equipment;
CREATE POLICY "vehicles_equipment_contractor_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- 3. Expand verifier: can see ALL vehicles (previously limited to those with inspections)
DROP POLICY IF EXISTS "vehicles_equipment_verifier_select" ON vehicles_equipment;
CREATE POLICY "vehicles_equipment_verifier_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');
