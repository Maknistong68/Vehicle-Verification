export type UserRole = 'owner' | 'admin' | 'inspector' | 'contractor' | 'verifier'

export type InspectionResult = 'pass' | 'fail' | 'pending'
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type VehicleStatus = 'verified' | 'inspection_overdue' | 'updated_inspection_required' | 'rejected' | 'blacklisted'
export type AssignmentStatus = 'assigned' | 'rescheduled' | 'done' | 'delayed'
export type NotificationType = 'assignment_new' | 'assignment_rescheduled' | 'assignment_delayed' | 'assignment_done' | 'general'
export type EquipmentCategory = 'vehicle' | 'heavy_equipment'
export type InspectionType = 'new' | 'follow_up' | 're_inspection'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  company_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  code: string | null
  project: string | null
  gate: string | null
  is_active: boolean
  created_at: string
}

export interface EquipmentType {
  id: string
  name: string
  category: EquipmentCategory
  classification: string | null
  is_active: boolean
  created_at: string
}

export interface VehicleEquipment {
  id: string
  plate_number: string
  driver_name: string | null
  national_id: string | null
  company_id: string | null
  equipment_type_id: string | null
  year_of_manufacture: number | null
  project: string | null
  gate: string | null
  status: VehicleStatus
  next_inspection_date: string | null
  blacklisted: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  company?: Company
  equipment_type?: EquipmentType
}

export interface Inspection {
  id: string
  vehicle_equipment_id: string
  inspection_type: InspectionType
  assigned_inspector_id: string | null
  assigned_by: string | null
  assignment_id: string | null
  scheduled_date: string
  started_at: string | null
  completed_at: string | null
  result: InspectionResult
  failure_reason: string | null
  notes: string | null
  verified_by: string | null
  verified_at: string | null
  status: InspectionStatus
  created_at: string
  updated_at: string
  // Joined fields
  vehicle_equipment?: VehicleEquipment
  inspector?: UserProfile
  verifier?: UserProfile
}

export interface Assignment {
  id: string
  company_id: string
  scheduled_date: string
  assigned_by: string | null
  inspector_id: string | null
  status: AssignmentStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  company?: Company
  inspector?: UserProfile
  assigner?: UserProfile
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  reference_id: string | null
  reference_table: string | null
  is_read: boolean
  created_at: string
}

export interface FailureReason {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface AuditLog {
  id: number
  user_id: string | null
  user_email: string | null
  user_role: string | null
  action: string
  table_name: string | null
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
