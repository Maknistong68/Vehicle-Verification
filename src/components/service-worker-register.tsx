'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker on mount.
 * Placed in the root layout so it runs on every page.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for updates periodically (every 60 minutes)
          setInterval(() => {
            reg.update()
          }, 60 * 60 * 1000)
        })
        .catch((err) => {
          console.warn('SW registration failed:', err)
        })
    }
  }, [])

  return null
}
