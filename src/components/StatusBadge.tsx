import { LeftoverStatus, statusLabels, statusColors } from '@/lib/types'

interface StatusBadgeProps {
  status: LeftoverStatus | string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const knownStatus = status as LeftoverStatus
  const label = statusLabels[knownStatus] ?? status
  const colorClass = statusColors[knownStatus] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
