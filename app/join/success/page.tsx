import Link from 'next/link'

interface SuccessPageProps {
  searchParams: Promise<{ studioName?: string; role?: string }>
}

/**
 * Join Success Page
 * 
 * Shown after successfully accepting a studio invitation.
 * Displays confirmation message and allows user to continue to dashboard.
 */
export default async function JoinSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const studioName = params.studioName || 'the studio'
  const role = params.role || 'member'

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">You&apos;ve joined {studioName}</h1>
          <p className="text-gray-600 mt-2">Welcome aboard!</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div>
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-semibold capitalize">{role}</p>
          </div>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Continue to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

















