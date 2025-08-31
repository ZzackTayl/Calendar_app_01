'use client';

import { useEffect, useState, useCallback } from 'react';

export function ServiceWorkerRegister() {
  const [registrationStatus, setRegistrationStatus] = useState<'loading' | 'registered' | 'failed' | 'unavailable'>('loading');

  const showUpdateNotification = useCallback((registration: ServiceWorkerRegistration) => {
    // Enhanced update notification with better UX
    const updateAvailable = () => {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const shouldUpdate = confirm('A new version of PolyHarmony is available. Would you like to update now?');
        if (shouldUpdate) {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          // Give the service worker time to take control before reloading
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    };

    // Delay the notification slightly to avoid interrupting user interactions
    setTimeout(updateAvailable, 1000);
  }, []);

  const registerServiceWorker = useCallback(async () => {
    try {
      // Enhanced file availability check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const swResponse = await fetch('/sw.js', { 
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);

      if (!swResponse.ok) {
        console.log('Service Worker file not found (status:', swResponse.status, '), skipping registration');
        setRegistrationStatus('unavailable');
        return;
      }

      // Verify content type
      const contentType = swResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('javascript')) {
        console.log('Service Worker file has incorrect content type:', contentType);
        setRegistrationStatus('failed');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      console.log('Service Worker registered successfully:', registration);
      setRegistrationStatus('registered');

      // Handle updates with better error handling
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification(registration);
            } else if (newWorker.state === 'redundant') {
              console.log('New service worker became redundant');
            }
          });
        }
      });

      // Enhanced message handling
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }
      });

      // Check for existing waiting service worker
      if (registration.waiting) {
        showUpdateNotification(registration);
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Service Worker registration timed out');
        } else if (error.name === 'SecurityError') {
          console.log('Service Worker registration blocked by security policy');
        } else {
          console.log('Service Worker registration failed:', error.message);
        }
      } else {
        console.log('Service Worker registration failed with unknown error');
      }
      setRegistrationStatus('failed');
    }
  }, [showUpdateNotification]);

  useEffect(() => {
    // Enhanced environment checks
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register in secure contexts (HTTPS or localhost)
      if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
        registerServiceWorker();
      } else {
        console.log('Service Worker requires HTTPS or localhost');
        setRegistrationStatus('unavailable');
      }
    } else {
      console.log('Service Worker not supported in this browser');
      setRegistrationStatus('unavailable');
    }
  }, [registerServiceWorker]);

  return null; // This component doesn't render anything
}

// Hook for checking online/offline status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Enhanced hook for service worker status
export function useServiceWorkerStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if we're in a secure context
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setStatus('unavailable');
        return;
      }

      navigator.serviceWorker.ready
        .then((reg) => {
          setRegistration(reg);
          setStatus('ready');
        })
        .catch((error) => {
          console.log('Service Worker ready check failed:', error);
          setStatus('error');
        });

      // Listen for controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setStatus('ready');
      });
    } else {
      setStatus('unavailable');
    }
  }, []);

  return { status, registration };
}

export default ServiceWorkerRegister;
