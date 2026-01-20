'use client'

import * as React from 'react'
import RoomsSection from '@/components/settings/sections/RoomsSection'
import { useStudioAccess } from '@/components/settings/useStudioAccess'

export function RoomsPageClient() {
  const { role: userRole, loading } = useStudioAccess()

  if (loading) {
    return (
      <div className="pl-10 pr-10 pt-6 pb-6 space-y-6">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return <RoomsSection userRole={userRole} />
}
