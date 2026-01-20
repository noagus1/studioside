import Link from 'next/link'
import ResetPasswordForm from './ResetPasswordForm'

/**
 * Password Reset Page
 * 
 * Allows users to reset their password after clicking the recovery link.
 * Extracts tokens from URL hash and passes them to the form component.
 */
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset Your Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        <div className="bg-white border rounded-md p-6">
          <ResetPasswordForm />
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
