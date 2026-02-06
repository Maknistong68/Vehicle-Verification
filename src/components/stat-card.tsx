interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan'
  subtitle?: string
  emptyMessage?: string
}

const gradientMap = {
  blue: 'gradient-blue-purple',
  green: 'gradient-green-cyan',
  red: 'gradient-red-orange',
  yellow: 'gradient-yellow-orange',
  purple: 'gradient-purple-pink',
  cyan: 'gradient-cyan-blue',
}

const topBarGradients = {
  blue: 'from-blue-500 to-purple-500',
  green: 'from-green-500 to-cyan-500',
  red: 'from-red-500 to-orange-500',
  yellow: 'from-yellow-500 to-orange-500',
  purple: 'from-purple-500 to-pink-500',
  cyan: 'from-cyan-500 to-blue-500',
}

const hoverGlows = {
  blue: 'hover:glow-blue',
  green: 'hover:glow-green',
  red: 'hover:glow-red',
  yellow: 'hover:glow-yellow',
  purple: 'hover:glow-purple',
  cyan: 'hover:glow-cyan',
}

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  const num = Number(value)
  if (!isNaN(num) && value === String(num)) {
    return num.toLocaleString()
  }
  return value
}

export function StatCard({ label, value, icon, color, subtitle, emptyMessage }: StatCardProps) {
  const isZero = value === 0 || value === '0'

  return (
    <div className={`glass-card overflow-hidden transition-shadow duration-200 ${hoverGlows[color]}`}>
      {/* Top gradient bar */}
      <div className={`h-0.5 bg-gradient-to-r ${topBarGradients[color]}`} />

      <div className="p-3.5 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50 font-medium">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${gradientMap[color]}`}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
            </svg>
          </div>
        </div>
        <p className={`text-2xl font-bold animate-count-up ${isZero ? 'text-white/30' : 'text-white'}`}>
          {formatValue(value)}
        </p>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        {isZero && emptyMessage && <p className="text-xs text-white/30 mt-0.5">{emptyMessage}</p>}
      </div>
    </div>
  )
}
