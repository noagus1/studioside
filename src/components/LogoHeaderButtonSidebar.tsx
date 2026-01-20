'use client'

import { cn } from '@/lib/utils'
import LogoHeaderButton from '@/components/LogoHeaderButton'
import { useSidebar } from '@/components/ui/sidebar'

export default function LogoHeaderButtonSidebar() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <div className="group/sidebar-logo relative flex items-center gap-2 px-0.5 py-0.5">
      <LogoHeaderButton
        className={cn(
          isCollapsed &&
            'transition-opacity duration-150 group-hover/sidebar-logo:opacity-0 group-hover/sidebar-logo:pointer-events-none',
        )}
      />
    </div>
  )
}
