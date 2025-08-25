'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OnboardingStepTransitionProps {
  currentStep: number;
  children: React.ReactElement[];
  className?: string;
  transitionDuration?: number;
}

export function OnboardingStepTransition({
  currentStep,
  children,
  className,
  transitionDuration = 300
}: OnboardingStepTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayStep, setDisplayStep] = useState(currentStep);

  useEffect(() => {
    if (displayStep !== currentStep) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        setDisplayStep(currentStep);
        
        const fadeInTimer = setTimeout(() => {
          setIsAnimating(false);
        }, 50);
        
        return () => clearTimeout(fadeInTimer);
      }, transitionDuration / 2);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, displayStep, transitionDuration]);

  const childToShow = children[displayStep] || children[0];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isAnimating 
            ? "opacity-0 transform translate-x-2" 
            : "opacity-100 transform translate-x-0"
        )}
        style={{ transitionDuration: `${transitionDuration}ms` }}
      >
        {childToShow}
      </div>
    </div>
  );
}

// Alternative slide transition component
export function OnboardingSlideTransition({
  currentStep,
  children,
  className,
  transitionDuration = 400
}: OnboardingStepTransitionProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="flex transition-transform duration-400 ease-out"
        style={{
          transform: `translateX(-${currentStep * 100}%)`,
          transitionDuration: `${transitionDuration}ms`
        }}
      >
        {children.map((child, index) => (
          <div key={index} className="min-w-full flex-shrink-0">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

// Progress animation component
export function AnimatedProgress({ 
  value, 
  max = 100, 
  className 
}: { 
  value: number; 
  max?: number; 
  className?: string; 
}) {
  const percentage = (value / max) * 100;
  
  return (
    <div className={cn("w-full bg-gray-200 rounded-full h-2", className)}>
      <div
        className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}