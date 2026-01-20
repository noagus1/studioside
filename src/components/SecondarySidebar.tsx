'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

interface SecondarySidebarItem {
  title: string
  url: string
  id: string
  category?: string
}

interface SecondarySidebarProps {
  items: SecondarySidebarItem[]
  title?: string
  allowedCategories?: string[]
}

const SIDEBAR_WIDTH = '13rem'
const SIDEBAR_WIDTH_ICON = '3rem'
const SECONDARY_SIDEBAR_WIDTH = '16rem' // 64 * 0.25rem = 16rem

/**
 * Secondary Sidebar Component
 * 
 * A nested sidebar that appears to the right of the main sidebar.
 * Used for pages that require further navigation (e.g., Settings).
 */
export default function SecondarySidebar({ items, title = 'Navigation', allowedCategories }: SecondarySidebarProps) {
  const pathname = usePathname()
  const safePathname = pathname ?? ''
  const { state } = useSidebar()
  const [pendingUrl, setPendingUrl] = React.useState<string | null>(null)

  const normalizedAllowedCategories = React.useMemo(
    () => allowedCategories?.map((cat) => cat.toUpperCase()),
    [allowedCategories]
  )

  const filteredItems = React.useMemo(() => {
    if (!normalizedAllowedCategories || normalizedAllowedCategories.length === 0) return items
    return items.filter((item) => {
      const category = (item.category || 'uncategorized').toUpperCase()
      return normalizedAllowedCategories.includes(category)
    })
  }, [items, normalizedAllowedCategories])
  
  // Clear pending URL when navigation completes
  React.useEffect(() => {
    setPendingUrl(null)
  }, [safePathname])
  
  // Calculate left position based on main sidebar state
  // The main sidebar container has width --sidebar-width with p-2 padding
  // With box-sizing: border-box, the total width is --sidebar-width
  // When expanded: --sidebar-width (13rem) - this is the right edge of the main sidebar
  // When collapsed (inset variant): --sidebar-width-icon + theme(spacing.4) + 2px
  // Position flush with the main sidebar (no gap)
  const leftPosition = state === 'expanded' 
    ? `var(--sidebar-width)` 
    : `calc(var(--sidebar-width-icon) + 1rem + 2px)`

  return (
    <>
      <aside 
        className="fixed top-16 bottom-0 w-64 border-r border-sidebar-border bg-background text-foreground z-30 hidden md:block transition-[left] duration-200 ease-in-out"
        style={{ 
          left: leftPosition,
          boxShadow: 'none',
          filter: 'none',
          WebkitFilter: 'none',
        }}
      >
        <div className="flex h-full w-full flex-col">
          <nav className="flex-1 overflow-y-auto p-2">
            {(() => {
              // Group items by category
              const groupedItems: Record<string, SecondarySidebarItem[]> = {}
              filteredItems.forEach((item) => {
                const category = item.category || 'uncategorized'
                if (!groupedItems[category]) {
                  groupedItems[category] = []
                }
                groupedItems[category].push(item)
              })

              // Get categories in order (maintain order of first appearance)
              const categoryOrder: string[] = []
              filteredItems.forEach((item) => {
                const category = item.category || 'uncategorized'
                if (!categoryOrder.includes(category)) {
                  categoryOrder.push(category)
                }
              })

              // Separate account settings and studio sections
              const accountCategories = categoryOrder.filter(cat => cat !== 'STUDIO' && cat !== 'uncategorized')
              const studioCategories = categoryOrder.filter(cat => cat === 'STUDIO')

              return (
                <>
                  {/* Account Settings Section */}
                  {accountCategories.length > 0 && (
                    <div className="mb-2">
                      <ul className="flex flex-col gap-1">
                        {accountCategories.map((category) => {
                          const categoryItems = groupedItems[category]
                          return (
                            <React.Fragment key={category}>
                              {/* Category Label */}
                              <li className="px-3 pt-3 pb-2 first:pt-2">
                                <span className="text-xs font-light text-muted-foreground uppercase tracking-wide">
                                  {category === 'STUDIO' ? 'STUDIO SETTINGS' : category}
                                </span>
                              </li>
                              {/* Category Items */}
                              {categoryItems.map((item) => {
                                // For account, also check if we're on /settings (which now redirects to /account/profile)
                                const isPathActive = safePathname === item.url || 
                                  safePathname?.startsWith(item.url + '/') ||
                                  (item.id === 'account' && safePathname === '/settings')
                                
                                // If there's a pending navigation, only show that item as active
                                // Otherwise, use the pathname-based active state
                                const isActive = pendingUrl 
                                  ? pendingUrl === item.url
                                  : isPathActive
                                
                                const handleClick = (e: React.MouseEvent) => {
                                  // Optimistically update UI immediately - this will deactivate old tab and activate new one
                                  setPendingUrl(item.url)
                                  // Dispatch event to show loading state immediately
                                  if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('settings-navigation-start', {
                                      detail: { targetUrl: item.url }
                                    }))
                                  }
                                }
                                
                                return (
                                  <li key={item.id}>
                                    <Link
                                      href={item.url}
                                      onClick={handleClick}
                                      prefetch={true}
                                      className={cn(
                                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                        'hover:bg-accent hover:text-accent-foreground',
                                        isActive
                                          ? 'bg-accent text-accent-foreground font-normal'
                                          : 'text-foreground font-normal'
                                      )}
                                    >
                                      {item.title}
                                    </Link>
                                  </li>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Divider between sections */}
                  {accountCategories.length > 0 && studioCategories.length > 0 && (
                    <div className="border-t border-border -mx-2 my-2" />
                  )}

                  {/* Studio Section */}
                  {studioCategories.length > 0 && (
                    <div>
                      <ul className="flex flex-col gap-1">
                        {studioCategories.map((category) => {
                          const categoryItems = groupedItems[category]
                          return (
                            <React.Fragment key={category}>
                              {/* Category Label */}
                              <li className="px-3 pt-3 pb-2 first:pt-2">
                                <span className="text-xs font-light text-muted-foreground uppercase tracking-wide">
                                  {category === 'STUDIO' ? 'STUDIO SETTINGS' : category}
                                </span>
                              </li>
                              {/* Category Items */}
                              {categoryItems.map((item) => {
                                const isPathActive = safePathname === item.url || 
                                  safePathname?.startsWith(item.url + '/')
                                
                                // If there's a pending navigation, only show that item as active
                                // Otherwise, use the pathname-based active state
                                const isActive = pendingUrl 
                                  ? pendingUrl === item.url
                                  : isPathActive
                                
                                const handleClickStudio = (e: React.MouseEvent) => {
                                  // Optimistically update UI immediately - this will deactivate old tab and activate new one
                                  setPendingUrl(item.url)
                                  // Dispatch event to show loading state immediately
                                  if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('settings-navigation-start', {
                                      detail: { targetUrl: item.url }
                                    }))
                                  }
                                }
                                
                                return (
                                  <li key={item.id}>
                                    <Link
                                      href={item.url}
                                      onClick={handleClickStudio}
                                      prefetch={true}
                                      className={cn(
                                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                                        'hover:bg-accent hover:text-accent-foreground',
                                        isActive
                                          ? 'bg-accent text-accent-foreground font-normal'
                                          : 'text-foreground font-normal'
                                      )}
                                    >
                                      {item.title}
                                    </Link>
                                  </li>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )
            })()}
          </nav>
        </div>
      </aside>
    </>
  )
}

