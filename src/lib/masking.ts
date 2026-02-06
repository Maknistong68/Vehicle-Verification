import { UserRole } from './types'

// Roles that see unmasked data
const UNMASKED_ROLES: UserRole[] = ['owner']

export function shouldMaskData(role: UserRole): boolean {
  return !UNMASKED_ROLES.includes(role)
}

export function maskName(name: string | null, role: UserRole): string {
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

export function maskId(id: string | null, role: UserRole): string {
  if (!id) return '—'
  if (!shouldMaskData(role)) return id
  if (id.length <= 4) return '****'
  return '****-' + id.slice(-4)
}

export function maskPlateNumber(plate: string | null, role: UserRole): string {
  if (!plate) return '—'
  if (!shouldMaskData(role)) return plate
  if (plate.length <= 4) return '****'
  return '***' + plate.slice(-4)
}

export function maskNationalId(nid: string | null, role: UserRole): string {
  if (!nid) return '—'
  if (!shouldMaskData(role)) return nid
  if (nid.length <= 4) return '****'
  return '****' + nid.slice(-4)
}

// For contractors and verifiers - extra restrictive
export function isMinimalDataRole(role: UserRole): boolean {
  return role === 'contractor' || role === 'verifier'
}
