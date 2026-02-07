import { UserRole } from './types'

// Roles that see unmasked data
const UNMASKED_ROLES: UserRole[] = ['owner']

// Roles that see unmasked plate numbers (broader than UNMASKED_ROLES)
const PLATE_UNMASKED_ROLES: UserRole[] = ['owner', 'admin', 'inspector']

export function shouldMaskData(role: UserRole): boolean {
  return !UNMASKED_ROLES.includes(role)
}

export function maskName(name: string | null | undefined, role: UserRole): string {
  if (!name) return '—'
  if (!shouldMaskData(role)) return name
  const parts = name.trim().split(' ')
  if (parts.length === 0) return '—'
  if (parts.length === 1) {
    return parts[0].substring(0, 2) + '***'
  }
  const first = parts[0].substring(0, 2) + '***'
  const last = parts[parts.length - 1].substring(0, 2) + '***'
  return `${first} ${last}`
}

export function maskId(id: string | null | undefined, role: UserRole): string {
  if (!id) return '—'
  if (!shouldMaskData(role)) return id
  if (id.length <= 4) return '****'
  return '****-' + id.slice(-4)
}

export function maskPlateNumber(plate: string | null | undefined, role: UserRole): string {
  if (!plate) return '—'
  if (PLATE_UNMASKED_ROLES.includes(role)) return plate
  if (plate.length <= 4) return '****'
  return '***' + plate.slice(-4)
}

export function maskNationalId(nid: string | null | undefined, role: UserRole): string {
  if (!nid) return '—'
  if (!shouldMaskData(role)) return nid
  if (nid.length <= 4) return '****'
  return '****' + nid.slice(-4)
}

// For contractors and verifiers - extra restrictive
export function isMinimalDataRole(role: UserRole): boolean {
  return role === 'contractor' || role === 'verifier'
}

// ============================================================
// Server-side masking: apply BEFORE sending data to the client.
// This ensures sensitive PII is never transmitted unmasked.
// ============================================================

/** Mask sensitive fields on a single vehicle/equipment record (server-side) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function maskVehicleRecord(record: any, role: UserRole): any {
  if (!shouldMaskData(role)) return record

  const masked = { ...record }
  // Plate numbers are visible to owner/admin/inspector
  if ('plate_number' in masked && !PLATE_UNMASKED_ROLES.includes(role)) {
    masked.plate_number = maskPlateNumber(masked.plate_number, role)
  }
  if ('driver_name' in masked) {
    masked.driver_name = maskName(masked.driver_name, role)
  }
  if ('national_id' in masked) {
    masked.national_id = maskNationalId(masked.national_id, role)
  }
  return masked
}

/** Mask sensitive fields on an array of vehicle records (server-side) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function maskVehicleRecords(records: any[], role: UserRole): any[] {
  if (!shouldMaskData(role)) return records
  return records.map(r => maskVehicleRecord(r, role))
}
