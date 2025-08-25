'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  threshold?: number;
  longPressDelay?: number;
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onRotate,
    onLongPress,
    onDoubleTap,
    threshold = 50,
    longPressDelay = 500
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const multiTouchRef = useRef<{ distance: number; angle: number } | null>(null);

  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getAngle = useCallback((touch1: Touch, touch2: Touch) => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * 180 / Math.PI;
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress();
      }, longPressDelay);
    }

    // Handle multi-touch gestures
    if (event.touches.length === 2 && (onPinch || onRotate)) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      multiTouchRef.current = {
        distance: getDistance(touch1, touch2),
        angle: getAngle(touch1, touch2)
      };
    }
  }, [onLongPress, onPinch, onRotate, longPressDelay, getDistance, getAngle]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    // Cancel long press on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle multi-touch gestures
    if (event.touches.length === 2 && multiTouchRef.current && (onPinch || onRotate)) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const currentDistance = getDistance(touch1, touch2);
      const currentAngle = getAngle(touch1, touch2);

      if (onPinch) {
        const scale = currentDistance / multiTouchRef.current.distance;
        onPinch(scale);
      }

      if (onRotate) {
        const angleDelta = currentAngle - multiTouchRef.current.angle;
        onRotate(angleDelta);
      }

      multiTouchRef.current = { distance: currentDistance, angle: currentAngle };
    }
  }, [onPinch, onRotate, getDistance, getAngle]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Cancel long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const start = touchStartRef.current;
    const end = touchEndRef.current;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const deltaTime = end.time - start.time;

    // Check for double tap
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (onDoubleTap) {
        onDoubleTap();
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }

    // Determine swipe direction
    if (deltaTime < 300 && Math.abs(deltaX) > threshold && Math.abs(deltaY) < threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (deltaTime < 300 && Math.abs(deltaY) > threshold && Math.abs(deltaX) < threshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    // Reset refs
    touchStartRef.current = null;
    touchEndRef.current = null;
    multiTouchRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, threshold]);

  useEffect(() => {
    const element = document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}

// Component for swipe navigation
export function SwipeNavigation({ 
  onSwipeLeft, 
  onSwipeRight, 
  children 
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children: React.ReactNode;
}) {
  useTouchGestures({
    onSwipeLeft,
    onSwipeRight
  });

  return <>{children}</>;
}

// Component for pinch-to-zoom
export function PinchToZoom({ 
  onPinch, 
  children 
}: {
  onPinch: (scale: number) => void;
  children: React.ReactNode;
}) {
  useTouchGestures({
    onPinch
  });

  return <>{children}</>;
}

// Component for long press actions
export function LongPress({ 
  onLongPress, 
  children 
}: {
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  useTouchGestures({
    onLongPress
  });

  return <>{children}</>;
}

// Component for double tap actions
export function DoubleTap({ 
  onDoubleTap, 
  children 
}: {
  onDoubleTap: () => void;
  children: React.ReactNode;
}) {
  useTouchGestures({
    onDoubleTap
  });

  return <>{children}</>;
}

export default useTouchGestures;
