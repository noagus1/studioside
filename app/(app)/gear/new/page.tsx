import { redirect } from 'next/navigation'
import { getGearFacets } from '../actions'
import { GearDetailForm } from '../components/GearDetailForm'

export default async function NewGearPage() {
  const facetsResult = await getGearFacets()

  if ('error' in facetsResult) {
    if (facetsResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Gear</h1>
          <p className="text-muted-foreground mt-1">Manage your studio gear</p>
        </div>

        <div className="border rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
          <p>{facetsResult.message}</p>
        </div>
      </div>
    )
  }

  const gearTypes = facetsResult.success ? facetsResult.facets.types : []

  return (
    <div className="space-y-6">
      <GearDetailForm gear={null} gearTypes={gearTypes} />
    </div>
  )
}

