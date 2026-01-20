import Link from 'next/link'
import { DoorOpen, Users, AudioLines, Calendar } from 'lucide-react'
import type { StudioOverviewStats } from '../actions'

interface StudioOverviewProps {
  stats: StudioOverviewStats
  studioName?: string
}

export function StudioOverview({ stats, studioName }: StudioOverviewProps) {
  const cards = [
    {
      label: 'Rooms',
      count: stats.roomsCount,
      icon: DoorOpen,
      href: '/settings/rooms',
    },
    {
      label: 'Clients',
      count: stats.clientsCount,
      icon: Users,
      href: '/clients',
    },
    {
      label: 'Gear',
      count: stats.gearCount,
      icon: AudioLines,
      href: '/gear',
    },
    {
      label: 'Sessions',
      count: stats.sessionsThisMonth,
      icon: Calendar,
      href: '/sessions',
      suffix: 'this month',
    },
  ]

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">{studioName || 'Studio Overview'}</h3>
      <div className="bg-card border rounded-lg p-4">
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card) => {
            const Icon = card.icon
            const content = (
              <div className="bg-muted/50 rounded p-3 text-center hover:bg-muted transition-colors">
                <Icon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                <div className="text-2xl font-semibold mb-1 text-foreground">{card.count}</div>
                <div className="text-xs text-muted-foreground">{card.label}</div>
                {card.suffix && (
                  <div className="text-xs text-muted-foreground/70 mt-0.5">{card.suffix}</div>
                )}
              </div>
            )

            return card.href ? (
              <Link key={card.label} href={card.href}>
                {content}
              </Link>
            ) : (
              <div key={card.label}>{content}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
