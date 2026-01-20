import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getUserStudios } from '@/data/getUserStudios'
import { getCurrentStudio } from '@/data/getCurrentStudio'
import { getUserProfile } from '@/data/getUserProfile'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'
import StudioSwitcher from '@/components/StudioSwitcher'
import { PageColumns, PageContainer, MainColumn, SideColumn } from '@/components/layout/PageColumns'
import { AutoSelectStudio } from './components/AutoSelectStudio'

import { getRecentActivity, getStudioOverview, getTodaySessions, getUpcomingSessions } from './actions'
import { SessionsPanel } from './components/SessionsPanel'
import { RecentActivity } from './components/RecentActivity'
import { StudioOverview } from './components/StudioOverview'
import { SetupChecklist } from './components/SetupChecklist'
import { TimeBasedGreeting } from './components/TimeBasedGreeting'
import { WelcomeStudioModal } from '@/components/WelcomeStudioModal'
import { getRooms } from '../settings/rooms/actions'
import { getTeamData } from '@/actions/getTeamData'
import type { Session } from '@/types/session'

/**
 * Dashboard Page
 * 
 * Two-column layout showing today's sessions, upcoming sessions, activity feed, and studio overview.
 */

export default async function DashboardPage() {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile and studios
  const userProfile = await getUserProfile()
  
  // Redirect to onboarding if user has no full_name
  if (!userProfile?.full_name || userProfile.full_name.trim() === '') {
    redirect('/onboarding/profile')
  }
  
  const studios = await getUserStudios()
  
  // Redirect to join flow if user has no studios
  if (studios.length === 0) {
    redirect('/join')
  }
  
  // Check if a studio is selected
  const currentStudioId = await getCurrentStudioId()
  
  // Get current studio - getCurrentStudio() will ensure RLS context is set
  // The getSupabaseClient() call inside getCurrentStudio() already sets RLS context
  // from the cookie, but we explicitly set it again in getCurrentStudio() for safety
  let currentStudio = await getCurrentStudio()
  
  // If no studio is selected, use client component to auto-select (faster than redirect)
  const needsAutoSelect = !currentStudioId && studios.length > 0

  // Check if onboarding is complete (has rooms OR team members beyond owner)
  let showWelcomeModal = false
  if (currentStudio) {
    const [roomsResult, teamDataResult] = await Promise.all([
      getRooms(),
      getTeamData(),
    ])

    // Check if studio has rooms
    const hasRooms = 'success' in roomsResult && roomsResult.success && roomsResult.rooms.length > 0

    // Check if studio has team members beyond owner
    let hasTeamMembers = false
    if ('members' in teamDataResult) {
      // Studio has team members if there's more than 1 member (owner + others) OR has pending invites
      hasTeamMembers = teamDataResult.members.length > 1 || teamDataResult.pendingInvites.length > 0
    }

    // Show welcome modal if onboarding is NOT complete (no rooms AND no team members)
    showWelcomeModal = !hasRooms && !hasTeamMembers
  }

  // Fetch data in parallel
  let todaySessions: Session[] = []
  let upcomingSessions: Session[] = []
  let activities: any[] = []
  let overviewStats = {
    roomsCount: 0,
    clientsCount: 0,
    gearCount: 0,
    sessionsThisMonth: 0,
  }

  if (currentStudio) {
    const [todayResult, upcomingResult, activityResult, overviewResult] = await Promise.all([
      getTodaySessions(),
      getUpcomingSessions({ limit: 3 }),
      getRecentActivity(),
      getStudioOverview(),
    ])

    // Process today's sessions
    if ('success' in todayResult && todayResult.success) {
      todaySessions = todayResult.sessions
    }

    // Process upcoming sessions
    if ('success' in upcomingResult && upcomingResult.success) {
      upcomingSessions = upcomingResult.sessions
    }

    // Process activity
    if ('success' in activityResult && activityResult.success) {
      activities = activityResult.activities
    }

    // Process overview stats
    if ('success' in overviewResult && overviewResult.success) {
      overviewStats = overviewResult.stats
    }
  }

  return (
    <PageContainer className="pb-10">
      {currentStudio && (
        <WelcomeStudioModal
          open={showWelcomeModal}
          studioName={currentStudio.name}
        />
      )}

      {needsAutoSelect && <AutoSelectStudio studios={studios} />}

      <PageColumns variant="two">
        <MainColumn>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold leading-tight">
                  <TimeBasedGreeting userName={userProfile?.full_name || user.email?.split('@')[0] || null} />
                </h1>
                {studios.length > 1 && (
                  <div className="hidden sm:block">
                    <StudioSwitcher studios={studios} currentStudioId={currentStudio?.id || null} />
                  </div>
                )}
              </div>
            </div>

            {studios.length > 1 && (
              <div className="sm:hidden">
                <StudioSwitcher studios={studios} currentStudioId={currentStudio?.id || null} />
              </div>
            )}
          </div>

          {currentStudio ? (
            <>
              <SessionsPanel todaySessions={todaySessions} upcomingSessions={upcomingSessions} />
              <RecentActivity activities={activities} />
            </>
          ) : needsAutoSelect ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading studio...</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No studio selected</p>
            </div>
          )}
        </MainColumn>

        {currentStudio && (
          <SideColumn className="lg:sticky lg:top-8 lg:self-start">
            <StudioOverview stats={overviewStats} studioName={currentStudio?.name} />
            <SetupChecklist stats={overviewStats} />
          </SideColumn>
        )}
      </PageColumns>
    </PageContainer>
  )
}

