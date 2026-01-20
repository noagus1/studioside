'use client'

import * as React from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { type Client } from '../actions'

interface ClientListProps {
  clients: Client[]
}

/**
 * Formats a date string to a readable format
 * Example: "January 15, 2024"
 */
function formatClientDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Generates initials from a client name
 * Examples: "John Doe" -> "JD", "Playboi Carti" -> "PC", "Madonna" -> "MA"
 */
function getClientInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    // Take first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase()
  } else if (words.length === 1 && words[0].length >= 2) {
    // Take first two letters if single word
    return words[0].substring(0, 2).toUpperCase()
  } else if (words.length === 1) {
    // Single character name
    return words[0].toUpperCase()
  }
  return '??'
}

export function ClientList({ clients }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No clients yet — create one to begin booking sessions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/clients/${client.id}`}
          className="block"
        >
          <div className="bg-card border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getClientInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{client.name}</p>
                <p className="text-sm text-muted-foreground">
                  Added on {formatClientDate(client.created_at)}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}








