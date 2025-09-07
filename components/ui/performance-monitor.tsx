'use client';

import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  fcpScore: string;
  lcpScore: string;
  fidScore: string;
  clsScore: string;
  ttfbScore: string;
}

export function PerformanceMonitor() {
  const metricsRef = useRef<PerformanceMetrics | null>(null);

  const initializePerformanceMonitoring = useCallback(() => {
    // First Contentful Paint (FCP)
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        const fcp = fcpEntry.startTime;
        const fcpScore = getFcpScore(fcp);
        updateMetrics({ fcp, fcpScore });
        console.log('FCP:', fcp, 'Score:', fcpScore);
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const lcp = lastEntry.startTime;
        const lcpScore = getLcpScore(lcp);
        updateMetrics({ lcp, lcpScore });
        console.log('LCP:', lcp, 'Score:', lcpScore);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fid = (entry as any).processingStart - entry.startTime;
        const fidScore = getFidScore(fid);
        updateMetrics({ fid, fidScore });
        console.log('FID:', fid, 'Score:', fidScore);
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      const clsScore = getClsScore(clsValue);
      updateMetrics({ cls: clsValue, clsScore });
      console.log('CLS:', clsValue, 'Score:', clsScore);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to First Byte (TTFB)
    const navigationObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        const ttfb = entry.responseStart - entry.requestStart;
        const ttfbScore = getTtfbScore(ttfb);
        updateMetrics({ ttfb, ttfbScore });
        console.log('TTFB:', ttfb, 'Score:', ttfbScore);
      });
    });
    navigationObserver.observe({ entryTypes: ['navigation'] });

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        console.log('Memory Usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
      }, 10000);
    }

    // Monitor network conditions
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      console.log('Network Info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink + ' Mbps',
        rtt: connection.rtt + ' ms',
        saveData: connection.saveData
      });
    }

    // Monitor battery status
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        console.log('Battery Info:', {
          level: Math.round(battery.level * 100) + '%',
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        });
      });
    }

    // Monitor device orientation and motion
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', (event) => {
        // Log orientation changes for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Device Orientation:', {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma
          });
        }
      });
    }

    // Monitor touch events for performance
    let touchStartTime = 0;
    document.addEventListener('touchstart', () => {
      touchStartTime = performance.now();
    });

    document.addEventListener('touchend', () => {
      const touchDuration = performance.now() - touchStartTime;
      if (touchDuration > 100) {
        console.warn('Slow touch response:', touchDuration + 'ms');
      }
    });

    // Monitor scroll performance
    let scrollStartTime = 0;
    let scrollFrameCount = 0;
    
    document.addEventListener('scroll', () => {
      if (scrollStartTime === 0) {
        scrollStartTime = performance.now();
        scrollFrameCount = 0;
      }
      scrollFrameCount++;
    });

    document.addEventListener('scrollend', () => {
      if (scrollStartTime > 0) {
        const scrollDuration = performance.now() - scrollStartTime;
        const fps = scrollFrameCount / (scrollDuration / 1000);
        if (fps < 30) {
          console.warn('Low scroll FPS:', Math.round(fps));
        }
        scrollStartTime = 0;
        scrollFrameCount = 0;
      }
    });

    // Cleanup observers on unmount
    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      navigationObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      initializePerformanceMonitoring();
    }
  }, [initializePerformanceMonitoring]);

  const updateMetrics = (newMetrics: Partial<PerformanceMetrics>) => {
    if (!metricsRef.current) {
      metricsRef.current = {} as PerformanceMetrics;
    }
    metricsRef.current = { ...metricsRef.current, ...newMetrics };
    
    // Send metrics to analytics or monitoring service
    if (process.env.NODE_ENV === 'production') {
      // You can send metrics to your analytics service here
      // Example: analytics.track('performance_metrics', metricsRef.current);
    }
  };

  const getFcpScore = (fcp: number): string => {
    if (fcp < 1800) return 'good';
    if (fcp < 3000) return 'needs-improvement';
    return 'poor';
  };

  const getLcpScore = (lcp: number): string => {
    if (lcp < 2500) return 'good';
    if (lcp < 4000) return 'needs-improvement';
    return 'poor';
  };

  const getFidScore = (fid: number): string => {
    if (fid < 100) return 'good';
    if (fid < 300) return 'needs-improvement';
    return 'poor';
  };

  const getClsScore = (cls: number): string => {
    if (cls < 0.1) return 'good';
    if (cls < 0.25) return 'needs-improvement';
    return 'poor';
  };

  const getTtfbScore = (ttfb: number): string => {
    if (ttfb < 800) return 'good';
    if (ttfb < 1800) return 'needs-improvement';
    return 'poor';
  };

  return null; // This component doesn't render anything
}

export default PerformanceMonitor;
