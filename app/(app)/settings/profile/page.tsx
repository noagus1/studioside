import { redirect } from 'next/navigation'
// Force dynamic to always reflect latest profile data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfileSettingsPage() {
  redirect('/account/profile')
}
