type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/15 text-green-200 border-green-500/25 shadow-green-500/10',
  danger: 'bg-red-500/15 text-red-200 border-red-500/25 shadow-red-500/10',
  warning: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/25 shadow-yellow-500/10',
  info: 'bg-blue-500/15 text-blue-200 border-blue-500/25 shadow-blue-500/10',
  neutral: 'bg-white/10 text-white/70 border-white/15 shadow-white/5',
  purple: 'bg-purple-500/15 text-purple-200 border-purple-500/25 shadow-purple-500/10',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green-400',
  danger: 'bg-red-400',
  warning: 'bg-yellow-400',
  info: 'bg-blue-400',
  neutral: 'bg-white/50',
  purple: 'bg-purple-400',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border backdrop-blur-sm shadow-sm capitalize ${variantStyles[variant]}`}>
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
