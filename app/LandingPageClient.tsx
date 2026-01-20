'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LandingNav from '@/components/LandingNav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Users, Calendar, Settings, ArrowRight, ArrowUpRight } from 'lucide-react'

const features = [
  {
    title: 'Multi-tenant Management',
    description: 'Manage multiple studios from a single dashboard with seamless switching between them.',
    icon: Settings,
  },
  {
    title: 'Session Tracking',
    description: 'Track and manage all your studio sessions in one organized calendar view.',
    icon: Calendar,
  },
  {
    title: 'Team Collaboration',
    description: 'Invite team members and collaborate on studio operations in real-time.',
    icon: Users,
  },
  {
    title: 'Gear Management',
    description: 'Keep track of all your studio equipment and gear inventory effortlessly.',
    icon: Music,
  },
]

/**
 * Landing Page Client Component
 * 
 * Handles OAuth callback tokens in URL hash and renders the landing page.
 * This component is only rendered when user is not authenticated.
 */
export default function LandingPageClient() {
  const router = useRouter()
  const [isCheckingTokens, setIsCheckingTokens] = React.useState(true)
  const [hasTokens, setHasTokens] = React.useState(false)

  React.useEffect(() => {
    // Check for auth tokens in URL hash immediately
    if (typeof window === 'undefined') {
      setIsCheckingTokens(false)
      return
    }

    const hash = window.location.hash.substring(1)
    
    // If no hash, no tokens - safe to render landing page
    if (!hash) {
      setIsCheckingTokens(false)
      return
    }

    // Parse hash to check for auth tokens
    const params = new URLSearchParams(hash)
    const hasAccessToken = params.has('access_token')
    const hasRefreshToken = params.has('refresh_token')
    const hasType = params.has('type')
    
    // If auth tokens are detected, redirect to callback handler immediately
    if (hasAccessToken || hasRefreshToken || hasType) {
      setHasTokens(true)
      // Preserve the hash when redirecting to callback handler
      router.push('/auth/callback' + window.location.hash)
      return
    }

    // No auth tokens found - safe to render landing page
    setIsCheckingTokens(false)
  }, [router])

  // Show loading state while checking for tokens (prevents landing page flash)
  if (isCheckingTokens || hasTokens) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">Opening Studioside…</p>
        </div>
      </div>
    )
  }

  // Render landing page only if no auth tokens are detected
  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />

      <div className="grid h-[calc(100vh-4rem)] grid-rows-[0.3fr_auto_0.3fr] relative z-10">
        {/* Top spacing */}
        <div></div>

        {/* Your actual landing content in the middle */}
        <div className="px-6 text-center">
          <div className="mx-auto flex max-w-[980px] flex-col items-start gap-6">
            <h1 className="text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1] text-left">
              <span className="inline-block animate-[fadeUp_0.8s_ease-out_0s_both]">Manage</span>
              {' '}
              <span className="inline-block animate-[fadeUp_0.8s_ease-out_0.15s_both]">Your</span>
              {' '}
              <span className="inline-block animate-[fadeUp_0.8s_ease-out_0.3s_both]">Studio</span>
              <br />
              <span className="inline-block animate-[fadeUp_0.8s_ease-out_0.45s_both]">with</span>
              {' '}
              <span className="inline-block animate-[fadeUp_0.8s_ease-out_0.6s_both]">Ease.</span>
            </h1>
            <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl text-left animate-[fadeIn_0.8s_ease-out_1.1s_both]">
              All you need—in one place.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link href="/login" className="group relative inline-flex items-center gap-3 px-6 py-4 bg-primary/90 text-primary-foreground border border-primary/20 rounded-full font-medium text-sm backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-background hover:text-primary overflow-hidden animate-[fadeUp_0.8s_ease-out_2.3s_both] hover:scale-105">
                <span className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1">
                  Create a Studio
                </span>
                <ArrowUpRight className="relative z-10 h-4 w-4 transition-all duration-300 group-hover:translate-x-1" />
              </Link>

            </div>
          </div>
        </div>

        {/* Bottom spacing */}
        <div></div>
      </div>

      {/* Features Section */}
      <section id="features" className="container mx-auto space-y-4 py-12 md:py-16">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-4xl">
            Everything You Need
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Powerful features designed to help you manage your studio operations
            efficiently and effectively.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-3 sm:grid-cols-2 lg:grid-cols-4 md:max-w-[64rem]">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="relative overflow-hidden">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto space-y-4 py-12 md:py-16">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold leading-[1.1] sm:text-3xl md:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Join studios around the world who are already using Studioside to
            streamline their operations.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/login">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Login to Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              © 2026 Studioside. Streamlining studio operations worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
