'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Settings Content Wrapper
 * 
 * Hides content immediately when navigation starts to prevent lag feeling.
 * Uses optimistic UI updates to hide old content before new content loads.
 */
export function SettingsContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = React.useState(false)
  const [targetPathname, setTargetPathname] = React.useState<string | null>(null)
  const previousPathnameRef = React.useRef(pathname)

  // When pathname changes, navigation has completed
  React.useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      // Navigation completed - clear loading state
      setIsNavigating(false)
      setTargetPathname(null)
      previousPathnameRef.current = pathname
    }
  }, [pathname])

  // Listen for navigation start via custom event from SecondarySidebar
  React.useEffect(() => {
    const handleNavigationStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUrl?: string }>
      const targetUrl = customEvent.detail?.targetUrl
      
      // Don't show loading state if clicking the same URL (Next.js won't navigate)
      if (targetUrl && targetUrl === pathname) {
        return
      }
      
      // Show loading state immediately - this replaces content instantly
      setIsNavigating(true)
      if (targetUrl) {
        setTargetPathname(targetUrl)
      }
    }

    window.addEventListener('settings-navigation-start', handleNavigationStart as EventListener)
    return () => {
      window.removeEventListener('settings-navigation-start', handleNavigationStart as EventListener)
    }
  }, [pathname])

  // Show skeleton loading state immediately when navigating
  // Keep showing loading until pathname actually changes (new page is ready)
  if (isNavigating) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Card className="shadow-none">
            <CardContent className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <div className="flex-1 max-w-md">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show content when navigation completes (pathname has changed)
  return <>{children}</>
}
