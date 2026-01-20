import { redirect } from 'next/navigation'

interface LegacyClientRedirectProps {
  params: Promise<{ id: string }>
}

export default async function LegacyClientRedirect({ params }: LegacyClientRedirectProps) {
  const { id } = await params
  redirect(`/clients/${id}`)
}