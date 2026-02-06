type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/15 text-green-300 border-green-500/25 shadow-green-500/10',
  danger: 'bg-red-500/15 text-red-300 border-red-500/25 shadow-red-500/10',
  warning: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25 shadow-yellow-500/10',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/25 shadow-blue-500/10',
  neutral: 'bg-white/10 text-white/60 border-white/15 shadow-white/5',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/25 shadow-purple-500/10',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border backdrop-blur-sm shadow-sm capitalize ${variantStyles[variant]}`}>
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
