import { redirect } from 'next/navigation'

export default function LegacyPeopleRedirect() {
  redirect('/clients')
}
