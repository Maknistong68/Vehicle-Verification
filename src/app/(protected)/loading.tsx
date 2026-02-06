export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/10 rounded-lg" />
        <div className="h-4 w-72 bg-white/5 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-3">
            <div className="h-4 w-24 bg-white/10 rounded" />
            <div className="h-8 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
      <div className="glass-card p-6 space-y-4">
        <div className="h-5 w-36 bg-white/10 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded" />
        ))}
      </div>
    </div>
  )
}
