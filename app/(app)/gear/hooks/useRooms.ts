'use client'

import * as React from 'react'
import { getRooms, type Room } from '../../settings/rooms/actions'

export function useRooms() {
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchRooms() {
      setLoading(true)
      setError(null)
      try {
        const result = await getRooms()
        if ('success' in result && result.success) {
          setRooms(result.rooms)
        } else {
          setError('error' in result ? result.message : 'Failed to load rooms')
          setRooms([])
        }
      } catch (err) {
        setError('Failed to load rooms')
        setRooms([])
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchRooms()
  }, [])

  return { rooms, loading, error }
}

