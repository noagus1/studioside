'use client'

import * as React from 'react'
import { Bell, Check, Monitor, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

/**
 * Notification bell placeholder for the header.
 * Hook this up to real notifications later.
 */
export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const [actionsOpen, setActionsOpen] = React.useState(false)

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setActionsOpen(false)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full p-0 border border-border/70"
        >
          <Bell className="h-4 w-4" />
          <span className="sr-only">Open notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="w-[360px] p-0 rounded-2xl shadow-lg border"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <Popover open={actionsOpen} onOpenChange={setActionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Notification actions</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={6}
              className="w-56 p-1.5 rounded-lg shadow-md border"
            >
              <div className="space-y-0.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <Check className="h-4 w-4" />
                  <span>Mark all as read</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <Settings className="h-4 w-4" />
                  <span>Notification settings</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Open Notifications</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Separator />
        <div className="px-3 pb-4 pt-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <Bell className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

