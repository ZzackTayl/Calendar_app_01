'use client'

import { useEffect } from 'react'

/**
 * Service Worker Registration Component
 * Handles service worker registration based on runtime configuration and environment
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register service worker in browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service workers not supported')
      return
    }

    // Check if PWA is disabled via environment variable
    const pwaEnabled = process.env.NEXT_PUBLIC_PWA_ENABLED !== 'false'
    if (!pwaEnabled) {
      console.log('[SW] PWA disabled via environment variable')
      return
    }

    // Enhanced environment detection
    const isDevelopment =
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local') ||
      window.location.port === '3000'

    // Check security profile if available
    const securityProfile = process.env.NEXT_PUBLIC_SECURITY_PROFILE || 'development'
    const isProductionLike = securityProfile === 'production' || securityProfile === 'staging'

    // In development, skip service worker registration by default
    if (isDevelopment && !isProductionLike) {
      console.log('[SW] Development environment detected - skipping service worker registration')
      console.log('[SW] Set NEXT_PUBLIC_PWA_ENABLED=true to enable PWA in development')
      return
    }

    console.log(`[SW] Registering service worker [Profile: ${securityProfile}]`)

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: isDevelopment ? 'none' : 'imports'
        })

        console.log('[SW] Service worker registered successfully', registration.scope)

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              console.log('[SW] New service worker available')

              // In development or staging, auto-update for faster iteration
              if (isDevelopment || securityProfile === 'staging') {
                newWorker.postMessage({ type: 'SKIP_WAITING' })
                window.location.reload()
              } else {
                // In production, notify user about update
                console.log('[SW] Update available - user action required')
                // You could dispatch a custom event here for the UI to handle
                window.dispatchEvent(new CustomEvent('sw-update-available'))
              }
            }
          })
        })

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
            console.log('[SW] Update available')
          }
        })

        // Handle service worker controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[SW] Controller changed, reloading page')
          if (isProductionLike) {
            window.location.reload()
          }
        })

      } catch (error) {
        console.error('[SW] Service worker registration failed:', error)

        // Only show production errors to avoid development noise
        if (isProductionLike) {
          console.error('[SW] This may affect offline functionality')
        } else {
          console.log('[SW] Registration failure in development is normal if PWA is disabled')
        }
      }
    }

    // Register service worker after a short delay to not block initial rendering
    // Use longer delay in development to avoid interfering with hot reload
    const delay = isDevelopment ? 1000 : 100
    const timeoutId = setTimeout(registerServiceWorker, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  // This component doesn't render anything
  return null;
}

export default ServiceWorkerRegister;