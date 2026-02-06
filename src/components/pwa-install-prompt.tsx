'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Cross-platform PWA install prompt.
 * - Android/Chrome: captures `beforeinstallprompt` and shows a custom "Install" button
 * - iOS Safari: detects non-standalone Safari and shows "Add to Home Screen" instructions
 * Dismissible, remembers dismissal for 7 days via localStorage.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10)
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedAt < sevenDays) return
    }

    // Android / Chrome: listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      setPlatform('android')
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for successful install
    const handleInstalled = () => {
      setShow(false)
      deferredPromptRef.current = null
    }
    window.addEventListener('appinstalled', handleInstalled)

    // iOS Safari: detect and show instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    const isSafari = /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(navigator.userAgent)

    if (isIOS && isSafari) {
      const timer = setTimeout(() => {
        setPlatform('ios')
        setShow(true)
      }, 2000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        window.removeEventListener('appinstalled', handleInstalled)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
  }

  const handleInstallClick = async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return
    setInstalling(true)
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setShow(false)
    }
    deferredPromptRef.current = null
    setInstalling(false)
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
                {platform === 'android'
                  ? 'Install for quick access, offline support, and a full-screen experience.'
                  : 'Add to your home screen for quick access and a full-screen experience.'}
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

          {/* Android: show Install button */}
          {platform === 'android' && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 btn-primary !py-2.5 !text-sm"
              >
                {installing ? 'Installing...' : 'Install App'}
              </button>
              <button
                onClick={dismiss}
                className="btn-secondary !py-2.5 !text-sm !px-4"
              >
                Not now
              </button>
            </div>
          )}

          {/* iOS: show instructions */}
          {platform === 'ios' && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5">
              <span className="font-medium text-gray-700">How:</span>
              <span>Tap</span>
              {/* iOS Share icon */}
              <svg className="w-5 h-5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v12M12 3l4 4M12 3L8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>then <strong>&quot;Add to Home Screen&quot;</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
