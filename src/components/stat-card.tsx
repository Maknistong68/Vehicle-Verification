interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan'
  subtitle?: string
}

const gradientMap = {
  blue: 'gradient-blue-purple',
  green: 'gradient-green-cyan',
  red: 'gradient-red-orange',
  yellow: 'gradient-yellow-orange',
  purple: 'gradient-purple-pink',
  cyan: 'gradient-cyan-blue',
}

export function StatCard({ label, value, icon, color, subtitle }: StatCardProps) {
  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white/50">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${gradientMap[color]}`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
    </div>
  )
}
