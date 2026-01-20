'use server'

/**
 * Invite Token Cookie Helpers
 *
 * Stores a pending invite token so onboarding can route invitees directly to the
 * join flow instead of the welcome screen. Use only in server contexts.
 */

import { cookies } from 'next/headers'

const COOKIE_NAME = 'pending_invite_token'

export async function getInviteToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    throw new Error('getInviteToken() can only be used server-side')
  }
  const cookieStore = cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function setInviteToken(token: string): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('setInviteToken() can only be used server-side')
  }
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // short-ish duration; can extend if needed
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearInviteToken(): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('clearInviteToken() can only be used server-side')
  }
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}




