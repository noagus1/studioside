import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type PageContainerProps = {
  children: ReactNode
  className?: string
}

type PageColumnsVariant = 'single' | 'two'

type PageColumnsProps = {
  children: ReactNode
  className?: string
  variant?: PageColumnsVariant
}

type ColumnProps = {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('w-full max-w-6xl mx-auto px-4 lg:px-8', className)}>
      {children}
    </div>
  )
}

export function PageColumns({
  children,
  className,
  variant = 'single',
}: PageColumnsProps) {
  const variantClasses: Record<PageColumnsVariant, string> = {
    single: 'grid-cols-1',
    two: 'grid-cols-1 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)] items-start',
  }

  return (
    <div className={cn('grid gap-8', variantClasses[variant], className)}>
      {children}
    </div>
  )
}

export function MainColumn({ children, className }: ColumnProps) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

export function SideColumn({ children, className }: ColumnProps) {
  return (
    <div
      className={cn(
        'space-y-4 text-muted-foreground [&_h2]:text-foreground [&_h3]:text-foreground',
        className
      )}
    >
      {children}
    </div>
  )
}
