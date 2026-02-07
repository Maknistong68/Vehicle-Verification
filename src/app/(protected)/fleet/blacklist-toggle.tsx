'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface Props {
  vehicleId: string
  isBlacklisted: boolean
  disabled?: boolean
  onToggle: (vehicleId: string, blacklist: boolean) => void
}

export function BlacklistToggle({ vehicleId, isBlacklisted, disabled, onToggle }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <button
        type="button"
        title={isBlacklisted ? 'Remove from blacklist' : 'Blacklist vehicle'}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          setShowConfirm(true)
        }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isBlacklisted
            ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
            : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
        }`}
      >
        {/* Ban icon */}
        <svg className="w-4 h-4" fill={isBlacklisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isBlacklisted ? 0 : 1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </button>

      <ConfirmDialog
        open={showConfirm}
        title={isBlacklisted ? 'Remove from Blacklist' : 'Blacklist Vehicle'}
        message={
          isBlacklisted
            ? 'This vehicle will be allowed to return to normal status. It will need a new inspection.'
            : 'This vehicle will be permanently barred from operation. This action is visible in audit logs.'
        }
        confirmLabel={isBlacklisted ? 'Remove Blacklist' : 'Blacklist'}
        confirmVariant="danger"
        onConfirm={() => {
          setShowConfirm(false)
          onToggle(vehicleId, !isBlacklisted)
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
