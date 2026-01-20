'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { SidebarInset } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

type Props = {
  children: React.ReactNode
}

export function AppContentShell({ children }: Props) {
  const pathname = usePathname()
  const isCalendar = pathname.startsWith('/calendar')

  const containerClasses = cn(
    'flex flex-1 flex-col gap-4 py-6 overflow-auto w-full mx-auto',
    isCalendar ? 'px-3 md:px-4 lg:px-6 max-w-none' : 'px-12 md:px-16 lg:px-20 max-w-5xl',
  )

  return (
    <SidebarInset className="flex flex-col">
      <div className={containerClasses}>{children}</div>
    </SidebarInset>
  )
}

