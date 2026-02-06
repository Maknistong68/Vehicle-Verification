type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
  purple: 'bg-purple-500',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border shadow-sm capitalize ${variantStyles[variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      {label}
    </span>
  )
}

export function getInspectionResultVariant(result: string): BadgeVariant {
  switch (result) {
    case 'pass': return 'success'
    case 'fail': return 'danger'
    case 'pending': return 'warning'
    default: return 'neutral'
  }
}

export function getInspectionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed': return 'success'
    case 'in_progress': return 'info'
    case 'scheduled': return 'warning'
    case 'cancelled': return 'neutral'
    default: return 'neutral'
  }
}

export function getVehicleStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'verified': return 'success'
    case 'inspection_overdue': return 'danger'
    case 'updated_inspection_required': return 'warning'
    case 'rejected': return 'danger'
    case 'blacklisted': return 'danger'
    default: return 'neutral'
  }
}

export function getAppointmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'completed': return 'success'
    case 'confirmed': return 'info'
    case 'scheduled': return 'warning'
    case 'cancelled': return 'neutral'
    default: return 'neutral'
  }
}
