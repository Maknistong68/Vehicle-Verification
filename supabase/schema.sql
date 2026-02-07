-- ============================================================================
-- VVS1 - Vehicle & Equipment Inspection Management System
-- Complete Database Schema for Supabase (PostgreSQL)
-- Version 2.0 - Clean rebuild
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'inspector',
  'contractor',
  'verifier'
);

CREATE TYPE equipment_category AS ENUM (
  'vehicle',
  'heavy_equipment'
);

CREATE TYPE vehicle_status AS ENUM (
  'verified',
  'inspection_overdue',
  'updated_inspection_required',
  'rejected',
  'blacklisted'
);

CREATE TYPE inspection_type AS ENUM (
  'routine',
  'follow_up',
  're_inspection'
);

CREATE TYPE inspection_result AS ENUM (
  'pass',
  'fail',
  'pending'
);

CREATE TYPE inspection_status AS ENUM (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE assignment_status AS ENUM (
  'assigned',
  'rescheduled',
  'done',
  'delayed'
);

CREATE TYPE notification_type AS ENUM (
  'assignment_new',
  'assignment_rescheduled',
  'assignment_delayed',
  'assignment_done',
  'general'
);


-- ============================================================================
-- 3. TABLES (ordered by dependency — no forward references)
-- ============================================================================

-- 3.1 companies (no FK dependencies)
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT,
  project     TEXT,
  gate        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 equipment_types (no FK dependencies)
CREATE TABLE equipment_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        equipment_category NOT NULL,
  classification  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 user_profiles (depends on: auth.users, companies)
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'contractor',
  phone       TEXT,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 vehicles_equipment (depends on: companies, equipment_types, auth.users)
CREATE TABLE vehicles_equipment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number          TEXT NOT NULL,
  driver_name           TEXT,
  national_id           TEXT,
  company_id            UUID REFERENCES companies(id) ON DELETE SET NULL,
  equipment_type_id     UUID REFERENCES equipment_types(id) ON DELETE SET NULL,
  year_of_manufacture   INTEGER,
  project               TEXT,
  gate                  TEXT,
  status                vehicle_status NOT NULL DEFAULT 'updated_inspection_required',
  next_inspection_date  TIMESTAMPTZ,
  blacklisted           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 assignments (depends on: companies, user_profiles)
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

-- 3.6 inspections (depends on: vehicles_equipment, user_profiles, assignments)
CREATE TABLE inspections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_equipment_id  UUID NOT NULL REFERENCES vehicles_equipment(id) ON DELETE CASCADE,
  inspection_type       inspection_type NOT NULL DEFAULT 'routine',
  assigned_inspector_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_by           UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  assignment_id         UUID REFERENCES assignments(id) ON DELETE SET NULL,
  scheduled_date        TIMESTAMPTZ,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  result                inspection_result NOT NULL DEFAULT 'pending',
  failure_reason        TEXT,
  notes                 TEXT,
  verified_by           UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  verified_at           TIMESTAMPTZ,
  status                inspection_status NOT NULL DEFAULT 'scheduled',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 inspection_checklist_items (depends on: inspections)
CREATE TABLE inspection_checklist_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_name         TEXT NOT NULL,
  item_description  TEXT,
  passed            BOOLEAN,
  notes             TEXT,
  checked_at        TIMESTAMPTZ
);

-- 3.8 notifications (depends on: user_profiles)
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

-- 3.9 audit_logs (immutable — no UPDATE or DELETE ever permitted)
CREATE TABLE audit_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID,
  user_email  TEXT,
  user_role   TEXT,
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Helper to get user's company_id (avoids RLS recursion in policies)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper to get vehicle IDs assigned to current inspector (avoids RLS recursion)
CREATE OR REPLACE FUNCTION get_inspector_vehicle_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT vehicle_equipment_id FROM inspections WHERE assigned_inspector_id = auth.uid();
$$;

-- Helper to get vehicle IDs for current user's company (avoids RLS recursion)
CREATE OR REPLACE FUNCTION get_company_vehicle_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM vehicles_equipment WHERE company_id = get_user_company_id();
$$;

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_role TEXT;
BEGIN
  SELECT email, role::TEXT
  INTO v_user_email, v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  INSERT INTO audit_logs (
    user_id, user_email, user_role, action, table_name,
    record_id, old_values, new_values, ip_address, created_at
  ) VALUES (
    auth.uid(),
    COALESCE(v_user_email, 'unknown'),
    COALESCE(v_user_role, 'unknown'),
    p_action, p_table_name, p_record_id,
    p_old_values, p_new_values,
    COALESCE(current_setting('request.headers', TRUE)::json->>'x-forwarded-for', 'unknown'),
    NOW()
  );
END;
$$;


-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- user_profiles
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);

-- companies
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_name ON companies(name);

-- equipment_types
CREATE INDEX idx_equipment_types_category ON equipment_types(category);
CREATE INDEX idx_equipment_types_name ON equipment_types(name);

-- vehicles_equipment
CREATE INDEX idx_ve_company_id ON vehicles_equipment(company_id);
CREATE INDEX idx_ve_equipment_type_id ON vehicles_equipment(equipment_type_id);
CREATE INDEX idx_ve_status ON vehicles_equipment(status);
CREATE INDEX idx_ve_plate_number ON vehicles_equipment(plate_number);
CREATE INDEX idx_ve_blacklisted ON vehicles_equipment(blacklisted) WHERE blacklisted = TRUE;
CREATE INDEX idx_ve_next_inspection_date ON vehicles_equipment(next_inspection_date);
CREATE INDEX idx_ve_created_at ON vehicles_equipment(created_at);

-- assignments
CREATE INDEX idx_assign_company_id ON assignments(company_id);
CREATE INDEX idx_assign_inspector_id ON assignments(inspector_id);
CREATE INDEX idx_assign_status ON assignments(status);
CREATE INDEX idx_assign_scheduled_date ON assignments(scheduled_date);

-- inspections
CREATE INDEX idx_insp_vehicle_equipment_id ON inspections(vehicle_equipment_id);
CREATE INDEX idx_insp_assigned_inspector_id ON inspections(assigned_inspector_id);
CREATE INDEX idx_insp_assignment_id ON inspections(assignment_id);
CREATE INDEX idx_insp_status ON inspections(status);
CREATE INDEX idx_insp_result ON inspections(result);
CREATE INDEX idx_insp_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_insp_created_at ON inspections(created_at);

-- inspection_checklist_items
CREATE INDEX idx_checklist_inspection_id ON inspection_checklist_items(inspection_id);

-- notifications
CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created_at ON notifications(created_at);

-- audit_logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);


-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles_equipment         ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs                 ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- 7.1 user_profiles
CREATE POLICY "user_profiles_owner_all"
  ON user_profiles FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "user_profiles_admin_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "user_profiles_self_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "user_profiles_self_insert"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_self_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- 7.2 companies
CREATE POLICY "companies_owner_all"
  ON companies FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "companies_admin_all"
  ON companies FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "companies_select_authenticated"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() IN ('inspector', 'contractor', 'verifier'));


-- 7.3 equipment_types
CREATE POLICY "equipment_types_owner_all"
  ON equipment_types FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "equipment_types_admin_all"
  ON equipment_types FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "equipment_types_select_authenticated"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() IN ('inspector', 'contractor', 'verifier'));


-- 7.4 vehicles_equipment
CREATE POLICY "vehicles_equipment_owner_all"
  ON vehicles_equipment FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "vehicles_equipment_admin_all"
  ON vehicles_equipment FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "vehicles_equipment_inspector_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'inspector'
    AND id IN (SELECT get_inspector_vehicle_ids())
  );

CREATE POLICY "vehicles_equipment_inspector_insert"
  ON vehicles_equipment FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'inspector');

CREATE POLICY "vehicles_equipment_contractor_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND company_id = get_user_company_id()
  );

CREATE POLICY "vehicles_equipment_verifier_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = get_user_company_id()
  );


-- 7.5 inspections
CREATE POLICY "inspections_owner_all"
  ON inspections FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "inspections_admin_all"
  ON inspections FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inspections_inspector_select"
  ON inspections FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector' AND assigned_inspector_id = auth.uid());

CREATE POLICY "inspections_inspector_insert"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'inspector');

CREATE POLICY "inspections_inspector_update"
  ON inspections FOR UPDATE TO authenticated
  USING (get_user_role() = 'inspector' AND assigned_inspector_id = auth.uid())
  WITH CHECK (get_user_role() = 'inspector' AND assigned_inspector_id = auth.uid());

CREATE POLICY "inspections_contractor_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
  );

CREATE POLICY "inspections_verifier_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
  );

CREATE POLICY "inspections_verifier_update"
  ON inspections FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
  )
  WITH CHECK (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
  );


-- 7.6 inspection_checklist_items
CREATE POLICY "checklist_owner_all"
  ON inspection_checklist_items FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "checklist_admin_all"
  ON inspection_checklist_items FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "checklist_inspector_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector' AND inspection_id IN (SELECT id FROM inspections WHERE assigned_inspector_id = auth.uid()));

CREATE POLICY "checklist_inspector_insert"
  ON inspection_checklist_items FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'inspector' AND inspection_id IN (SELECT id FROM inspections WHERE assigned_inspector_id = auth.uid()));

CREATE POLICY "checklist_inspector_update"
  ON inspection_checklist_items FOR UPDATE TO authenticated
  USING (get_user_role() = 'inspector' AND inspection_id IN (SELECT id FROM inspections WHERE assigned_inspector_id = auth.uid()))
  WITH CHECK (get_user_role() = 'inspector' AND inspection_id IN (SELECT id FROM inspections WHERE assigned_inspector_id = auth.uid()));

CREATE POLICY "checklist_contractor_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND inspection_id IN (
      SELECT id FROM inspections
      WHERE vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
    )
  );

CREATE POLICY "checklist_verifier_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND inspection_id IN (
      SELECT id FROM inspections
      WHERE vehicle_equipment_id IN (SELECT get_company_vehicle_ids())
    )
  );


-- 7.7 assignments
CREATE POLICY "assignments_owner_all"
  ON assignments FOR ALL TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "assignments_admin_all"
  ON assignments FOR ALL TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "assignments_inspector_select"
  ON assignments FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector' AND inspector_id = auth.uid());

CREATE POLICY "assignments_inspector_update"
  ON assignments FOR UPDATE TO authenticated
  USING (get_user_role() = 'inspector' AND inspector_id = auth.uid())
  WITH CHECK (get_user_role() = 'inspector' AND inspector_id = auth.uid());

CREATE POLICY "assignments_contractor_select"
  ON assignments FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND company_id = get_user_company_id()
  );

CREATE POLICY "assignments_verifier_select"
  ON assignments FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = get_user_company_id()
  );


-- 7.8 notifications
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_insert"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE TO authenticated
  USING (get_user_role() = 'owner' OR user_id = auth.uid());


-- 7.9 audit_logs (IMMUTABLE — INSERT and SELECT only)
CREATE POLICY "audit_logs_owner_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "audit_logs_trigger_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- 8. TRIGGER FUNCTIONS
-- ============================================================================

-- 8.1 Audit trigger
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_record_id TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
  v_user_email TEXT;
  v_user_role TEXT;
BEGIN
  v_action := TG_OP;

  SELECT email, role::TEXT
  INTO v_user_email, v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::TEXT;
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id::TEXT;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  END IF;

  INSERT INTO audit_logs (
    user_id, user_email, user_role, action, table_name,
    record_id, old_values, new_values, ip_address, created_at
  ) VALUES (
    auth.uid(),
    COALESCE(v_user_email, 'system'),
    COALESCE(v_user_role, 'system'),
    v_action, TG_TABLE_NAME, v_record_id,
    v_old_values, v_new_values,
    COALESCE(current_setting('request.headers', TRUE)::json->>'x-forwarded-for', 'unknown'),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- 8.2 updated_at auto-update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8.3 Prevent role self-escalation
CREATE OR REPLACE FUNCTION prevent_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = OLD.role THEN RETURN NEW; END IF;
  IF (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'owner' THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Only owners can change user roles';
END;
$$;

-- 8.4 Assignment notification trigger
CREATE OR REPLACE FUNCTION assignment_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_notif_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.inspector_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_company_name FROM companies WHERE id = NEW.company_id;

  IF TG_OP = 'INSERT' THEN
    v_notif_type := 'assignment_new';
    v_title := 'New Assignment';
    v_message := format('You have been assigned to inspect %s on %s',
      COALESCE(v_company_name, 'Unknown Company'),
      to_char(NEW.scheduled_date, 'Mon DD, YYYY HH12:MI AM'));
  ELSIF TG_OP = 'UPDATE' THEN
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
      v_notif_type := 'assignment_new';
      v_title := 'New Assignment';
      v_message := format('You have been assigned to inspect %s on %s',
        COALESCE(v_company_name, 'Unknown Company'),
        to_char(NEW.scheduled_date, 'Mon DD, YYYY HH12:MI AM'));
    ELSE
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

-- 8.5 Inspection status enforcement
CREATE OR REPLACE FUNCTION enforce_inspection_status_rules()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE id = auth.uid();

  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF current_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'Only owners and admins can cancel inspections';
    END IF;
  END IF;

  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF current_role NOT IN ('owner', 'admin', 'inspector') THEN
      RAISE EXCEPTION 'Only inspectors can submit inspection results';
    END IF;
  END IF;

  IF NEW.verified_by IS NOT NULL AND OLD.verified_by IS NULL THEN
    IF current_role NOT IN ('owner', 'admin', 'verifier') THEN
      RAISE EXCEPTION 'Only verifiers can verify inspections';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.6 Assignment status enforcement
CREATE OR REPLACE FUNCTION enforce_assignment_status_rules()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM user_profiles WHERE id = auth.uid();

  IF current_role = 'inspector' THEN
    IF NEW.status NOT IN ('done', 'delayed') AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Inspectors can only mark assignments as done or delayed';
    END IF;
  END IF;

  IF current_role IN ('contractor', 'verifier') THEN
    RAISE EXCEPTION 'Contractors and verifiers cannot modify assignments';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.7 Inspection result/status validation
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


-- ============================================================================
-- 9. TRIGGERS
-- ============================================================================

-- Audit triggers
CREATE TRIGGER trg_vehicles_equipment_audit
  AFTER INSERT OR UPDATE OR DELETE ON vehicles_equipment
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_inspections_audit
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_user_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_companies_audit
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- updated_at triggers
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicles_equipment_updated_at
  BEFORE UPDATE ON vehicles_equipment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Role protection
CREATE TRIGGER trg_prevent_role_self_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_update();

-- Assignment notifications
CREATE TRIGGER trg_assignment_notifications
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION assignment_notification_trigger();

-- Status enforcement
CREATE TRIGGER trg_enforce_inspection_status
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION enforce_inspection_status_rules();

CREATE TRIGGER trg_enforce_assignment_status
  BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_assignment_status_rules();

CREATE TRIGGER trg_enforce_inspection_values
  BEFORE INSERT OR UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION enforce_inspection_result_values();


-- ============================================================================
-- 10. REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
