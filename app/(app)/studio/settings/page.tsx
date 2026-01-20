import { redirect } from 'next/navigation'

const tabToSection: Record<string, string> = {
  general: 'overview',
  scheduling: 'preferences',
  rooms: 'overview',
  members: 'team',
}

export default function StudioSettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const tabParam = searchParams.tab
  const tab = Array.isArray(tabParam) ? tabParam[0] : tabParam
  const section = tab && tabToSection[tab] ? tabToSection[tab] : 'overview'

  const params = new URLSearchParams()
  params.set('section', section)

  redirect(`/studio?${params.toString()}`)
}
