import Link from 'next/link'
import { Clock, Calendar, User, AudioLines, Users, Settings } from 'lucide-react'
import type { ActivityItem } from '../actions'

interface RecentActivityProps {
  activities: ActivityItem[]
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'session_created':
    case 'session_completed':
      return Calendar
    case 'client_created':
      return User
    case 'gear_created':
    case 'gear_updated':
      return AudioLines
    case 'member_joined':
      return Users
    case 'studio_settings_updated':
      return Settings
    default:
      return Clock
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function getActivityHref(activity: ActivityItem): string | null {
  const { type, metadata } = activity

  switch (type) {
    case 'session_created':
    case 'session_completed':
      // If we have a session id, go directly to the session detail page
      if (metadata?.session_id) {
        return `/sessions/${metadata.session_id}`
      }
      // Fallback to sessions hub if no id
      return '/sessions'
    case 'client_created':
      // Navigate to client detail page if client_id exists
      if (metadata?.client_id) {
        return `/clients/${metadata.client_id}`
      }
      // Fallback to clients page
      return '/clients'
    case 'gear_created':
    case 'gear_updated':
      // Navigate to gear page
      return '/gear'
    case 'member_joined':
      // Navigate to team settings for member updates
      return '/settings/team'
    case 'studio_settings_updated':
      // Navigate to settings page
      return '/settings'
    default:
      return null
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
      </div>
      <div className="bg-card border rounded-lg p-6">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No recent activity</p>
            <p className="text-sm text-muted-foreground/70">
              Activity will appear here as you use the studio
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const href = getActivityHref(activity)
              const content = (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              )

              if (href) {
                return (
                  <Link
                    key={activity.id}
                    href={href}
                    className="block rounded-lg p-2 -m-2 hover:bg-accent transition-colors cursor-pointer"
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <div key={activity.id}>
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
