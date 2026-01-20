import { redirect } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getOnboardingRedirectPath } from '@/actions/getOnboardingRedirectPath'
import { getUserProfile } from '@/data/getUserProfile'
import CompleteAccountForm from './CompleteAccountForm'

export default async function CompleteAccountPage() {
  const supabase = await getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/complete-account')
  }

  const profile = await getUserProfile()
  const nextPath = await getOnboardingRedirectPath()

  // If the user is already complete, send them along
  if (nextPath !== '/complete-account') {
    redirect(nextPath)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Finish setting up</h1>
          <p className="text-muted-foreground">
            Add your name and create a password to continue.
          </p>
        </div>

        <CompleteAccountForm
          initialName={profile?.full_name || ''}
          email={profile?.email || user?.email || ''}
          hasPassword={profile?.has_password ?? null}
        />
      </div>
    </div>
  )
}
