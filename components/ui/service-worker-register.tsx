'use client';

import { useEffect, useState, useCallback } from 'react';

export function ServiceWorkerRegister() {
  const registerServiceWorker = useCallback(async () => {
    try {
      // Check if service worker file exists before registering
      const swResponse = await fetch('/sw.js', { method: 'HEAD' });
      if (!swResponse.ok) {
        console.log('Service Worker file not found, skipping registration');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully:', registration);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification(registration);
            }
          });
        }
      });

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        }
      });

    } catch (error) {
      console.log('Service Worker registration skipped:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, [registerServiceWorker]);

  const showUpdateNotification = (registration: ServiceWorkerRegistration) => {
    // You can implement a toast notification here
    if (confirm('A new version of PolyHarmony is available. Would you like to update?')) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

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

// Hook for service worker status
export function useServiceWorkerStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setStatus('ready');
      }).catch(() => {
        setStatus('error');
      });
    } else {
      setStatus('error');
    }
  }, []);

  return status;
}

export default ServiceWorkerRegister;
