'use client'

import { useState, useEffect } from 'react'

/**
 * iOS Safari "Add to Home Screen" prompt.
 * Only shows on iOS Safari when NOT already installed as a PWA.
 * Dismissible, remembers dismissal for 7 days via localStorage.
 */
export function PWAInstallPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Only show on iOS Safari, not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(navigator.userAgent)

    if (!isIOS || isStandalone || !isSafari) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedAt < sevenDays) return
    }

    // Show after a short delay so the user sees the page first
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up safe-bottom">
      <div className="mx-3 mb-3 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">Install VVS Inspect</h3>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                Add to your home screen for quick access and a full-screen experience.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
            <span className="font-medium text-gray-700">How:</span>
            <span>Tap</span>
            {/* iOS Share icon */}
            <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>then <strong>&quot;Add to Home Screen&quot;</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
