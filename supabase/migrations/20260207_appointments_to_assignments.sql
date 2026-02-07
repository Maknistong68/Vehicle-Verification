-- ============================================================================
-- Migration: Appointments → Assignments
-- Date: 2026-02-07
-- Description: Rename appointments to assignments, simplify to company-level
--              scheduling, add notifications table with realtime
-- ============================================================================

-- ============================================================================
-- 1. CREATE NEW ENUM TYPES
-- ============================================================================

CREATE TYPE assignment_status AS ENUM ('assigned', 'rescheduled', 'done', 'delayed');

CREATE TYPE notification_type AS ENUM (
  'assignment_new',
  'assignment_rescheduled',
  'assignment_delayed',
  'assignment_done',
  'general'
);

-- ============================================================================
-- 2. CREATE ASSIGNMENTS TABLE (replaces appointments)
-- ============================================================================

CREATE TABLE assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scheduled_date  TIMESTAMPTZ NOT NULL,
  assigned_by     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  inspector_id    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  status          assignment_status NOT NULL DEFAULT 'assigned',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ADD assignment_id TO INSPECTIONS
-- ============================================================================

ALTER TABLE inspections
  ADD COLUMN assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type            notification_type NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  message         TEXT,
  reference_id    UUID,
  reference_table TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- assignments
CREATE INDEX idx_assign_company_id ON assignments(company_id);
CREATE INDEX idx_assign_assigned_by ON assignments(assigned_by);
CREATE INDEX idx_assign_inspector_id ON assignments(inspector_id);
CREATE INDEX idx_assign_status ON assignments(status);
CREATE INDEX idx_assign_scheduled_date ON assignments(scheduled_date);

-- inspections.assignment_id
CREATE INDEX idx_insp_assignment_id ON inspections(assignment_id);

-- notifications
CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_is_read ON notifications(is_read);
CREATE INDEX idx_notif_created_at ON notifications(created_at);
CREATE INDEX idx_notif_reference ON notifications(reference_id, reference_table);

-- ============================================================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES - ASSIGNMENTS
-- ============================================================================

-- Owner: full access
CREATE POLICY "assignments_owner_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "assignments_owner_insert"
  ON assignments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "assignments_owner_update"
  ON assignments FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "assignments_owner_delete"
  ON assignments FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

-- Admin: full access
CREATE POLICY "assignments_admin_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "assignments_admin_insert"
  ON assignments FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "assignments_admin_update"
  ON assignments FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "assignments_admin_delete"
  ON assignments FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- Inspector: select own + update own (for marking done/delayed)
CREATE POLICY "assignments_inspector_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector' AND inspector_id = auth.uid());

CREATE POLICY "assignments_inspector_update"
  ON assignments FOR UPDATE TO authenticated
  USING (get_user_role() = 'inspector' AND inspector_id = auth.uid())
  WITH CHECK (get_user_role() = 'inspector' AND inspector_id = auth.uid());

-- Contractor: read-only
CREATE POLICY "assignments_contractor_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor');

-- Verifier: read-only
CREATE POLICY "assignments_verifier_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');

-- ============================================================================
-- 8. RLS POLICIES - NOTIFICATIONS
-- ============================================================================

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark read) their own notifications
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System/triggers insert notifications (via security definer functions)
CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Owner can delete notifications
CREATE POLICY "notifications_owner_delete"
  ON notifications FOR DELETE TO authenticated
  USING (get_user_role() = 'owner' OR user_id = auth.uid());

-- ============================================================================
-- 9. AUDIT TRIGGER ON ASSIGNMENTS
-- ============================================================================

CREATE TRIGGER trg_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 10. UPDATED_AT TRIGGER ON ASSIGNMENTS
-- ============================================================================

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 11. NOTIFICATION TRIGGER ON ASSIGNMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION assignment_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_assigner_name TEXT;
  v_notif_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Only notify if there is an inspector assigned
  IF NEW.inspector_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get company name
  SELECT name INTO v_company_name
  FROM companies WHERE id = NEW.company_id;

  -- Get assigner name
  SELECT full_name INTO v_assigner_name
  FROM user_profiles WHERE id = NEW.assigned_by;

  IF TG_OP = 'INSERT' THEN
    v_notif_type := 'assignment_new';
    v_title := 'New Assignment';
    v_message := format('You have been assigned to inspect %s on %s',
      COALESCE(v_company_name, 'Unknown Company'),
      to_char(NEW.scheduled_date, 'Mon DD, YYYY HH12:MI AM'));

  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine notification type based on what changed
    IF NEW.status = 'rescheduled' AND OLD.status != 'rescheduled' THEN
      v_notif_type := 'assignment_rescheduled';
      v_title := 'Assignment Rescheduled';
      v_message := format('Your assignment for %s has been rescheduled to %s',
        COALESCE(v_company_name, 'Unknown Company'),
        to_char(NEW.scheduled_date, 'Mon DD, YYYY HH12:MI AM'));
    ELSIF NEW.status = 'delayed' AND OLD.status != 'delayed' THEN
      v_notif_type := 'assignment_delayed';
      v_title := 'Assignment Delayed';
      v_message := format('Assignment for %s has been marked as delayed',
        COALESCE(v_company_name, 'Unknown Company'));
    ELSIF NEW.status = 'done' AND OLD.status != 'done' THEN
      v_notif_type := 'assignment_done';
      v_title := 'Assignment Completed';
      v_message := format('Assignment for %s has been marked as done',
        COALESCE(v_company_name, 'Unknown Company'));
    ELSIF NEW.inspector_id != OLD.inspector_id THEN
      -- Inspector changed - notify new inspector
      v_notif_type := 'assignment_new';
      v_title := 'New Assignment';
      v_message := format('You have been assigned to inspect %s on %s',
        COALESCE(v_company_name, 'Unknown Company'),
        to_char(NEW.scheduled_date, 'Mon DD, YYYY HH12:MI AM'));
    ELSE
      -- No relevant change for notification
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, reference_id, reference_table)
  VALUES (NEW.inspector_id, v_notif_type, v_title, v_message, NEW.id, 'assignments');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assignment_notifications
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION assignment_notification_trigger();

-- ============================================================================
-- 12. DROP OLD APPOINTMENTS TABLE AND RELATED OBJECTS
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_appointments_audit ON appointments;
DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;

-- Drop indexes
DROP INDEX IF EXISTS idx_appt_vehicle_equipment_id;
DROP INDEX IF EXISTS idx_appt_scheduled_by;
DROP INDEX IF EXISTS idx_appt_inspector_id;
DROP INDEX IF EXISTS idx_appt_status;
DROP INDEX IF EXISTS idx_appt_scheduled_date;

-- Drop policies
DROP POLICY IF EXISTS "appointments_owner_select" ON appointments;
DROP POLICY IF EXISTS "appointments_owner_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_owner_update" ON appointments;
DROP POLICY IF EXISTS "appointments_owner_delete" ON appointments;
DROP POLICY IF EXISTS "appointments_admin_select" ON appointments;
DROP POLICY IF EXISTS "appointments_admin_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_admin_update" ON appointments;
DROP POLICY IF EXISTS "appointments_admin_delete" ON appointments;
DROP POLICY IF EXISTS "appointments_inspector_select" ON appointments;
DROP POLICY IF EXISTS "appointments_contractor_select" ON appointments;
DROP POLICY IF EXISTS "appointments_verifier_select" ON appointments;

-- Drop table
DROP TABLE IF EXISTS appointments;

-- Drop old enum
DROP TYPE IF EXISTS appointment_status;

-- ============================================================================
-- 13. ENABLE REALTIME ON NOTIFICATIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
