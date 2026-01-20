'use server'

/**
 * Set Auth Session
 * 
 * Server action to sync the client-side Supabase session to server-side cookies.
 * This allows the server to authenticate requests.
 */

import { cookies } from 'next/headers'

export async function setAuthSession(accessToken: string, refreshToken: string) {
  const cookieStore = cookies()
  
  // Set auth cookies (Supabase uses these cookie names)
  cookieStore.set('sb-access-token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  
  cookieStore.set('sb-refresh-token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
}

