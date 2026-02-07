'use client'

import { VehicleStatus } from '@/lib/types'

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'verified', label: 'Verified' },
  { value: 'updated_inspection_required', label: 'Update Required' },
  { value: 'inspection_overdue', label: 'Inspection Overdue' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'blacklisted', label: 'Blacklisted' },
]

const variantStyles: Record<string, string> = {
  verified: 'bg-green-50 text-green-700 border-green-200',
  updated_inspection_required: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  inspection_overdue: 'bg-red-50 text-red-700 border-red-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  blacklisted: 'bg-red-50 text-red-700 border-red-200',
}

interface Props {
  vehicleId: string
  currentStatus: string
  disabled?: boolean
  onUpdate: (vehicleId: string, newStatus: VehicleStatus) => void
}

export function InlineStatusDropdown({ vehicleId, currentStatus, disabled, onUpdate }: Props) {
  return (
    <select
      value={currentStatus}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation()
        const newStatus = e.target.value as VehicleStatus
        if (newStatus !== currentStatus) {
          onUpdate(vehicleId, newStatus)
        }
      }}
      className={`text-xs font-medium rounded-full border px-2.5 py-1 cursor-pointer outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-6 bg-[length:12px] bg-[right_6px_center] bg-no-repeat ${variantStyles[currentStatus] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
      }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
