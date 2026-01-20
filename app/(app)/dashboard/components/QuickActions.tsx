'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar, UserPlus, AudioLines, Users } from 'lucide-react'
import { CreateClientSheet } from '../../clients/components/CreateClientSheet'
import { GearDetailDrawer } from '../../gear/components/GearDetailDrawer'
import type { Client } from '../../clients/actions'
import type { Gear } from '../../gear/actions'

export function QuickActions() {
  const router = useRouter()
  const [createClientOpen, setCreateClientOpen] = React.useState(false)
  const [createGearOpen, setCreateGearOpen] = React.useState(false)

  const handleClientCreated = React.useCallback((client: Client) => {
    // Refresh the page to update stats
    router.refresh()
  }, [router])

  const handleGearAdded = React.useCallback((gear: Gear) => {
    // Refresh the page to update stats
    router.refresh()
  }, [router])

  return (
    <>
      <section className="mb-6 lg:mb-0">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="bg-card border rounded-lg p-4">
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => router.push('/sessions/new')}
              className="w-full"
              size="sm"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Create Session
            </Button>
            <Button
              onClick={() => setCreateClientOpen(true)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
            <Button
              onClick={() => setCreateGearOpen(true)}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <AudioLines className="h-4 w-4 mr-2" />
              Add Gear
            </Button>
            <Button
              onClick={() => router.push('/settings/team')}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Manage Team
            </Button>
          </div>
        </div>
      </section>

      <CreateClientSheet
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onClientCreated={handleClientCreated}
      />

      <GearDetailDrawer
        gear={null}
        open={createGearOpen}
        onOpenChange={setCreateGearOpen}
        onGearAdded={handleGearAdded}
      />
    </>
  )
}
