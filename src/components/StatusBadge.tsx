import { LeftoverStatus, statusLabels, statusColors } from '@/lib/types'

interface StatusBadgeProps {
  status: LeftoverStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = statusLabels[status]
  const colorClass = statusColors[status]

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
