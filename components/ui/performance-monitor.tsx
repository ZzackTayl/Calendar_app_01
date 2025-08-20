'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(!isVisible);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    // Measure First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, fcp: fcp.startTime }));
    });

    // Measure Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lcp.startTime }));
    });

    // Measure First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fid = entries[0] as PerformanceEventTiming;
      setMetrics(prev => ({ ...prev, fid: fid.processingStart - fid.startTime }));
    });

    // Measure Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });

    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('Performance Observer not supported');
    }

    // Measure Time to First Byte
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      setMetrics(prev => ({ ...prev, ttfb: navigationEntry.responseStart - navigationEntry.requestStart }));
    }

    return () => {
      fcpObserver.disconnect();
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getMetricColor = (value: number | null, thresholds: { good: number; needsImprovement: number }) => {
    if (value === null) return 'bg-gray-500';
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.needsImprovement) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-sm">Performance Monitor (Ctrl+Shift+P)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs">FCP:</span>
            <Badge 
              variant="secondary" 
              className={getMetricColor(metrics.fcp, { good: 1800, needsImprovement: 3000 })}
            >
              {metrics.fcp ? `${Math.round(metrics.fcp)}ms` : 'N/A'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">LCP:</span>
            <Badge 
              variant="secondary" 
              className={getMetricColor(metrics.lcp, { good: 2500, needsImprovement: 4000 })}
            >
              {metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'N/A'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">FID:</span>
            <Badge 
              variant="secondary" 
              className={getMetricColor(metrics.fid, { good: 100, needsImprovement: 300 })}
            >
              {metrics.fid ? `${Math.round(metrics.fid)}ms` : 'N/A'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">CLS:</span>
            <Badge 
              variant="secondary" 
              className={getMetricColor(metrics.cls, { good: 0.1, needsImprovement: 0.25 })}
            >
              {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs">TTFB:</span>
            <Badge 
              variant="secondary" 
              className={getMetricColor(metrics.ttfb, { good: 800, needsImprovement: 1800 })}
            >
              {metrics.ttfb ? `${Math.round(metrics.ttfb)}ms` : 'N/A'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
