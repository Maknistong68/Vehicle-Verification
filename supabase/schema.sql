-- ============================================================================
-- VVS1 - Vehicle & Equipment Inspection Management System
-- Complete Database Schema for Supabase (PostgreSQL)
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
-- 3. TABLES (must be created BEFORE functions that reference them)
-- ============================================================================

-- 3.1 user_profiles
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

-- 3.2 companies
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT,
  project     TEXT,
  gate        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 equipment_types
CREATE TABLE equipment_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        equipment_category NOT NULL,
  classification  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 vehicles_equipment
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

-- 3.5 assignments (replaces appointments - company-level scheduling)
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

-- 3.6 inspections
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

-- 3.7 inspection_checklist_items
CREATE TABLE inspection_checklist_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_name         TEXT NOT NULL,
  item_description  TEXT,
  passed            BOOLEAN,
  notes             TEXT,
  checked_at        TIMESTAMPTZ
);

-- 3.8 notifications
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

-- 3.9 audit_logs (immutable - no UPDATE or DELETE ever permitted)
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
-- 4. HELPER FUNCTIONS (tables exist now, safe to reference them)
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
CREATE INDEX idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_company_id ON user_profiles(company_id);

-- companies
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- equipment_types
CREATE INDEX idx_equipment_types_category ON equipment_types(category);
CREATE INDEX idx_equipment_types_is_active ON equipment_types(is_active);

-- vehicles_equipment
CREATE INDEX idx_ve_company_id ON vehicles_equipment(company_id);
CREATE INDEX idx_ve_equipment_type_id ON vehicles_equipment(equipment_type_id);
CREATE INDEX idx_ve_status ON vehicles_equipment(status);
CREATE INDEX idx_ve_plate_number ON vehicles_equipment(plate_number);
CREATE INDEX idx_ve_blacklisted ON vehicles_equipment(blacklisted);
CREATE INDEX idx_ve_next_inspection_date ON vehicles_equipment(next_inspection_date);
CREATE INDEX idx_ve_created_by ON vehicles_equipment(created_by);

-- inspections
CREATE INDEX idx_insp_vehicle_equipment_id ON inspections(vehicle_equipment_id);
CREATE INDEX idx_insp_assigned_inspector_id ON inspections(assigned_inspector_id);
CREATE INDEX idx_insp_assigned_by ON inspections(assigned_by);
CREATE INDEX idx_insp_verified_by ON inspections(verified_by);
CREATE INDEX idx_insp_status ON inspections(status);
CREATE INDEX idx_insp_result ON inspections(result);
CREATE INDEX idx_insp_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_insp_inspection_type ON inspections(inspection_type);

-- inspections.assignment_id
CREATE INDEX idx_insp_assignment_id ON inspections(assignment_id);

-- inspection_checklist_items
CREATE INDEX idx_checklist_inspection_id ON inspection_checklist_items(inspection_id);

-- assignments
CREATE INDEX idx_assign_company_id ON assignments(company_id);
CREATE INDEX idx_assign_assigned_by ON assignments(assigned_by);
CREATE INDEX idx_assign_inspector_id ON assignments(inspector_id);
CREATE INDEX idx_assign_status ON assignments(status);
CREATE INDEX idx_assign_scheduled_date ON assignments(scheduled_date);

-- notifications
CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_is_read ON notifications(is_read);
CREATE INDEX idx_notif_created_at ON notifications(created_at);
CREATE INDEX idx_notif_reference ON notifications(reference_id, reference_table);

-- audit_logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_record_id ON audit_logs(record_id);


-- ============================================================================
-- 6. ROW LEVEL SECURITY - ENABLE ON ALL TABLES
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

-- **************************************************************************
-- 7.1 user_profiles POLICIES
-- **************************************************************************

CREATE POLICY "user_profiles_owner_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "user_profiles_owner_insert"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "user_profiles_owner_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "user_profiles_owner_delete"
  ON user_profiles FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "user_profiles_admin_select"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "user_profiles_inspector_select_own"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector' AND id = auth.uid());

CREATE POLICY "user_profiles_contractor_select_own"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor' AND id = auth.uid());

CREATE POLICY "user_profiles_verifier_select_own"
  ON user_profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier' AND id = auth.uid());

CREATE POLICY "user_profiles_self_insert"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_self_update"
  ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- NOTE: Role field is protected from self-update by the
-- trg_prevent_role_self_update trigger (see section 9).


-- **************************************************************************
-- 7.2 companies POLICIES
-- **************************************************************************

CREATE POLICY "companies_owner_select"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "companies_owner_insert"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "companies_owner_update"
  ON companies FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "companies_owner_delete"
  ON companies FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "companies_admin_select"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "companies_admin_insert"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "companies_admin_update"
  ON companies FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "companies_admin_delete"
  ON companies FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "companies_inspector_select"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector');

CREATE POLICY "companies_contractor_select"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor');

CREATE POLICY "companies_verifier_select"
  ON companies FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');


-- **************************************************************************
-- 7.3 equipment_types POLICIES
-- **************************************************************************

CREATE POLICY "equipment_types_owner_select"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "equipment_types_owner_insert"
  ON equipment_types FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "equipment_types_owner_update"
  ON equipment_types FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "equipment_types_owner_delete"
  ON equipment_types FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "equipment_types_admin_select"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "equipment_types_admin_insert"
  ON equipment_types FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "equipment_types_admin_update"
  ON equipment_types FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "equipment_types_admin_delete"
  ON equipment_types FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "equipment_types_inspector_select"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() = 'inspector');

CREATE POLICY "equipment_types_contractor_select"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor');

CREATE POLICY "equipment_types_verifier_select"
  ON equipment_types FOR SELECT TO authenticated
  USING (get_user_role() = 'verifier');


-- **************************************************************************
-- 7.4 vehicles_equipment POLICIES
-- **************************************************************************

CREATE POLICY "vehicles_equipment_owner_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "vehicles_equipment_owner_insert"
  ON vehicles_equipment FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "vehicles_equipment_owner_update"
  ON vehicles_equipment FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "vehicles_equipment_owner_delete"
  ON vehicles_equipment FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "vehicles_equipment_admin_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "vehicles_equipment_admin_insert"
  ON vehicles_equipment FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "vehicles_equipment_admin_update"
  ON vehicles_equipment FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "vehicles_equipment_admin_delete"
  ON vehicles_equipment FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "vehicles_equipment_inspector_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'inspector'
    AND id IN (
      SELECT vehicle_equipment_id
      FROM inspections
      WHERE assigned_inspector_id = auth.uid()
    )
  );

CREATE POLICY "vehicles_equipment_contractor_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (get_user_role() = 'contractor'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "vehicles_equipment_verifier_select"
  ON vehicles_equipment FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );


-- **************************************************************************
-- 7.5 inspections POLICIES
-- **************************************************************************

CREATE POLICY "inspections_owner_select"
  ON inspections FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "inspections_owner_insert"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "inspections_owner_update"
  ON inspections FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "inspections_owner_delete"
  ON inspections FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "inspections_admin_select"
  ON inspections FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "inspections_admin_insert"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inspections_admin_update"
  ON inspections FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inspections_admin_delete"
  ON inspections FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "inspections_inspector_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'inspector'
    AND assigned_inspector_id = auth.uid()
  );

CREATE POLICY "inspections_inspector_update"
  ON inspections FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'inspector'
    AND assigned_inspector_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'inspector'
    AND assigned_inspector_id = auth.uid()
  );

CREATE POLICY "inspections_contractor_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'contractor'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "inspections_verifier_select"
  ON inspections FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND vehicle_equipment_id IN (
      SELECT id FROM vehicles_equipment
      WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

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


-- **************************************************************************
-- 7.6 inspection_checklist_items POLICIES
-- **************************************************************************

CREATE POLICY "inspection_checklist_items_owner_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "inspection_checklist_items_owner_insert"
  ON inspection_checklist_items FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "inspection_checklist_items_owner_update"
  ON inspection_checklist_items FOR UPDATE TO authenticated
  USING (get_user_role() = 'owner')
  WITH CHECK (get_user_role() = 'owner');

CREATE POLICY "inspection_checklist_items_owner_delete"
  ON inspection_checklist_items FOR DELETE TO authenticated
  USING (get_user_role() = 'owner');

CREATE POLICY "inspection_checklist_items_admin_select"
  ON inspection_checklist_items FOR SELECT TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "inspection_checklist_items_admin_insert"
  ON inspection_checklist_items FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inspection_checklist_items_admin_update"
  ON inspection_checklist_items FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "inspection_checklist_items_admin_delete"
  ON inspection_checklist_items FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

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
      SELECT i.id FROM inspections i
      JOIN vehicles_equipment v ON i.vehicle_equipment_id = v.id
      WHERE v.company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

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


-- **************************************************************************
-- 7.7 assignments POLICIES
-- **************************************************************************

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
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "assignments_verifier_select"
  ON assignments FOR SELECT TO authenticated
  USING (
    get_user_role() = 'verifier'
    AND company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- **************************************************************************
-- 7.8 notifications POLICIES
-- **************************************************************************

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

CREATE POLICY "notifications_owner_delete"
  ON notifications FOR DELETE TO authenticated
  USING (get_user_role() = 'owner' OR user_id = auth.uid());

-- **************************************************************************
-- 7.9 audit_logs POLICIES (IMMUTABLE - INSERT and SELECT only)
-- **************************************************************************

-- Owner: SELECT only
CREATE POLICY "audit_logs_owner_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (get_user_role() = 'owner');

-- Authenticated: INSERT only where user_id matches caller (prevents impersonation)
CREATE POLICY "audit_logs_trigger_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- NO UPDATE policy -> updates denied by RLS
-- NO DELETE policy -> deletes denied by RLS


-- ============================================================================
-- 8. AUDIT TRIGGER FUNCTION
-- ============================================================================

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
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old_values,
    v_new_values,
    COALESCE(current_setting('request.headers', TRUE)::json->>'x-forwarded-for', 'unknown'),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


-- ============================================================================
-- 9. AUDIT TRIGGERS ON TABLES
-- ============================================================================

CREATE TRIGGER trg_vehicles_equipment_audit
  AFTER INSERT OR UPDATE OR DELETE ON vehicles_equipment
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_inspections_audit
  AFTER INSERT OR UPDATE OR DELETE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_assignments_audit
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_user_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER trg_companies_audit
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Prevent privilege escalation: block role field changes except by owners
CREATE OR REPLACE FUNCTION prevent_role_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  IF (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'owner' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only owners can change user roles';
END;
$$;

CREATE TRIGGER trg_prevent_role_self_update
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_update();

-- ============================================================================
-- 10. UPDATED_AT AUTO-UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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
  v_notif_type notification_type;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.inspector_id IS NULL THEN
    RETURN NEW;
  END IF;

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

CREATE TRIGGER trg_assignment_notifications
  AFTER INSERT OR UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION assignment_notification_trigger();

-- ============================================================================
-- 12. ENABLE REALTIME ON NOTIFICATIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
