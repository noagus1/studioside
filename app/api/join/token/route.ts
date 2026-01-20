import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'pending_invite_token'

/**
 * Route Handler for managing invite token cookies
 * 
 * This handler is used because cookies can only be modified in Route Handlers
 * or Server Actions called from client components, not in Server Components.
 * 
 * Query params:
 * - token: Set the invite token cookie and redirect to /join?token={token}
 * - action=clear: Clear the invite token cookie
 * - returnToken: If provided with action=clear, redirect to /join?token={returnToken} to show error
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const action = searchParams.get('action')
  const returnToken = searchParams.get('returnToken')

  const cookieStore = cookies()

  if (action === 'clear') {
    // Clear the cookie
    cookieStore.delete(COOKIE_NAME)
    // If returnToken is provided, redirect back with that token to show error
    if (returnToken) {
      return NextResponse.redirect(
        new URL(`/join?token=${encodeURIComponent(returnToken)}`, request.url)
      )
    } else {
      return NextResponse.redirect(new URL('/join', request.url))
    }
  } else if (token) {
    // Set the cookie
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return NextResponse.redirect(
      new URL(`/join?token=${encodeURIComponent(token)}`, request.url)
    )
  } else {
    // No action specified, just redirect to join
    return NextResponse.redirect(new URL('/join', request.url))
  }
}
