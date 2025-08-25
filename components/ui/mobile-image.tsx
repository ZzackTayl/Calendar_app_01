'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MobileImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function MobileImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder,
  onLoad,
  onError
}: MobileImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate WebP src if supported
  const getOptimizedSrc = (originalSrc: string) => {
    if (typeof window !== 'undefined' && 'WebP' in window) {
      // Check if WebP is supported
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 1, 1);
        const dataURL = canvas.toDataURL('image/webp');
        if (dataURL.indexOf('data:image/webp') === 0) {
          // WebP is supported, return original src (assuming server handles WebP)
          return originalSrc;
        }
      }
    }
    return originalSrc;
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-muted/20',
        className
      )}
      style={{
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto'
      }}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/50 animate-pulse" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <div className="text-center text-muted-foreground">
            <div className="w-8 h-8 mx-auto mb-2 bg-muted/50 rounded" />
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <Image
          src={getOptimizedSrc(src)}
          alt={alt}
          width={width || 400}
          height={height || 300}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            willChange: 'opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        />
      )}
    </div>
  );
}
