'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Props {
  email: string
}

export function ResetPasswordButton({ email }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleReset = async () => {
    setLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setShowConfirm(false)
    setLoading(false)

    if (error) {
      setToast({ message: `Failed to send reset email: ${error.message}`, type: 'error' })
    } else {
      setToast({ message: `Password reset email sent to ${email}`, type: 'success' })
    }

    // Auto-dismiss toast after 4 seconds
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-amber-600 hover:text-amber-500 font-medium"
      >
        Reset Password
      </button>

      <ConfirmDialog
        open={showConfirm}
        title="Reset Password"
        message={`Send a password reset email to ${email}? They will receive a link to set a new password.`}
        confirmLabel="Send Reset Email"
        onConfirm={handleReset}
        onCancel={() => setShowConfirm(false)}
        loading={loading}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </>
  )
}
