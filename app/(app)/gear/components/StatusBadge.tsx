'use client'

import { cn } from '@/lib/utils'
import type { GearStatus } from '@/types/db'

interface StatusBadgeProps {
  status: GearStatus
  className?: string
}

const statusConfig: Record<GearStatus, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  in_use: {
    label: 'In Use',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  maintenance: {
    label: 'Maintenance',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  missing: {
    label: 'Missing',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Add safety check - default to 'available' if status is invalid
  const config = statusConfig[status] || statusConfig.available

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

