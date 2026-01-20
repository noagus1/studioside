'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Logo Header Button Component
 *
 * Displays the Studioside logo in the sidebar header with a soft hover background.
 */
export default function LogoHeaderButton({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-[color:var(--sidebar-hover)]",
        className,
      )}
    >
      <Image
        src="/logo.svg"
        alt="Studioside Logo"
        width={24}
        height={24}
        className="dark:invert shrink-0"
      />
      <span className="sr-only">Go to Dashboard</span>
    </Link>
  )
}
