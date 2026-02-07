-- Migration: Allow inspectors to UPDATE vehicles they have inspections for
-- This enables inspectors to edit vehicle status from the vehicle edit page,
-- scoped only to vehicles they have been assigned inspections for.

CREATE POLICY "vehicles_equipment_inspector_update"
  ON vehicles_equipment FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'inspector'
    AND id IN (SELECT get_inspector_vehicle_ids())
  )
  WITH CHECK (
    get_user_role() = 'inspector'
    AND id IN (SELECT get_inspector_vehicle_ids())
  );
