'use client'

import { useState, useEffect } from 'react'

interface TimeBasedGreetingProps {
  userName?: string | null
}

/**
 * Client component that displays a time-based greeting using the browser's local time.
 * This ensures the greeting is accurate for the user's timezone.
 */
export function TimeBasedGreeting({ userName }: TimeBasedGreetingProps) {
  const [greeting, setGreeting] = useState<string>('')

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours()
      const firstName = userName ? userName.split(' ')[0] : ''
      
      if (hour >= 5 && hour < 12) {
        setGreeting(`Good morning${firstName ? ` ${firstName}` : ''}`)
      } else if (hour >= 12 && hour < 17) {
        setGreeting(`Good afternoon${firstName ? ` ${firstName}` : ''}`)
      } else {
        setGreeting(`Good evening${firstName ? ` ${firstName}` : ''}`)
      }
    }

    // Set initial greeting
    updateGreeting()

    // Update greeting every minute to handle hour transitions
    const interval = setInterval(updateGreeting, 60000)

    return () => clearInterval(interval)
  }, [userName])

  return <>{greeting}</>
}
