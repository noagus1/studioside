import { redirect } from 'next/navigation'
import AccountSection from '@/components/settings/sections/AccountSection'
import { getUserSettings } from '@/actions/getUserSettings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AccountProfilePage() {
  const result = await getUserSettings()

  if ('error' in result) {
    if (result.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    return null
  }

  return <AccountSection userSettings={result} />
}

