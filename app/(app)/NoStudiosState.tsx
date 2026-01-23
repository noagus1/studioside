'use client'

import CreateStudioForm from './dashboard/CreateStudioForm'

export default function NoStudiosState() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create your first studio</h1>
          <p className="text-muted-foreground">
            You don&apos;t have any studios yet. Create one to get started.
          </p>
        </div>
        <CreateStudioForm />
      </div>
    </div>
  )
}
