interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
      <div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-gray-500 text-sm">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
