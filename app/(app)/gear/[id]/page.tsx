import { notFound, redirect } from 'next/navigation'
import { getGearById, getGearFacets } from '../actions'
import { GearDetailView } from '../components/GearDetailView'

interface GearDetailPageProps {
  params: {
    id: string
  }
}

export default async function GearDetailPage({ params }: GearDetailPageProps) {
  const [gearResult, facetsResult] = await Promise.all([getGearById(params.id), getGearFacets()])

  if ('error' in gearResult) {
    if (gearResult.error === 'AUTHENTICATION_REQUIRED') {
      redirect('/login')
    }
    if (gearResult.error === 'GEAR_NOT_FOUND') {
      notFound()
    }

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Gear</h1>
          <p className="text-muted-foreground mt-1">Manage your studio gear</p>
        </div>

        <div className="border rounded-lg bg-muted/50 p-8 text-center text-muted-foreground">
          <p>{gearResult.message}</p>
        </div>
      </div>
    )
  }

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

  return <GearDetailView gear={gearResult.gear} gearTypes={gearTypes} />
}

