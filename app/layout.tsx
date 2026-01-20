import { Suspense } from 'react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthCallbackHandler } from '@/components/AuthCallbackHandler'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'studioside',
  description: 'Multi-tenant studio management SaaS',
}

/**
 * Root Layout
 * 
 * Global layout that wraps all pages with theme and settings providers.
 * This layout is public and does not require authentication.
 * Authenticated routes in the (app) group have their own layout for sidebar and auth.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Blocking script to check for auth tokens before React hydrates
                // This prevents the landing page from flashing when email confirmation links are clicked
                if (typeof window !== 'undefined' && window.location.hash) {
                  var hash = window.location.hash.substring(1);
                  if (hash) {
                    var params = new URLSearchParams(hash);
                    var hasAccessToken = params.has('access_token');
                    var hasRefreshToken = params.has('refresh_token');
                    var hasType = params.has('type');
                    
                    // If auth tokens are detected, redirect immediately before React loads
                    if (hasAccessToken || hasRefreshToken || hasType) {
                      window.location.replace('/auth/callback' + window.location.hash);
                    }
                  }
                }
              })();
            `,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
        <Suspense fallback={null}>
          <AuthCallbackHandler />
        </Suspense>
      </body>
    </html>
  )
}
