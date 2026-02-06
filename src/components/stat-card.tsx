interface StatCardProps {
  label: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan'
  subtitle?: string
  emptyMessage?: string
}

const iconBgMap = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
  yellow: 'bg-yellow-50',
  purple: 'bg-purple-50',
  cyan: 'bg-cyan-50',
}

const iconColorMap = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  red: 'text-red-500',
  yellow: 'text-yellow-500',
  purple: 'text-purple-500',
  cyan: 'text-cyan-500',
}

const topBarColors = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
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
    <div className="glass-card overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Top color bar */}
      <div className={`h-0.5 ${topBarColors[color]}`} />

      <div className="p-3.5 md:p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgMap[color]}`}>
            <svg className={`w-4 h-4 ${iconColorMap[color]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
            </svg>
          </div>
        </div>
        <p className={`text-2xl font-bold animate-count-up ${isZero ? 'text-gray-300' : 'text-gray-900'}`}>
          {formatValue(value)}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        {isZero && emptyMessage && <p className="text-xs text-gray-400 mt-0.5">{emptyMessage}</p>}
      </div>
    </div>
  )
}
