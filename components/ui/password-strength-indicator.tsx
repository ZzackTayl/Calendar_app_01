/**
 * Password Strength Indicator Component
 * 
 * Provides real-time visual feedback on password strength with:
 * - Color-coded strength meter
 * - Detailed feedback messages
 * - Accessibility features
 * - Progressive enhancement
 */

"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { validatePasswordStrength, PasswordStrength, PasswordValidationResult } from '@/lib/auth/password-utils';
import { validatePasswordSecurity } from '@/lib/security/password-breach-check';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
  showScore?: boolean;
  className?: string;
  onStrengthChange?: (result: PasswordValidationResult) => void;
}

/**
 * Get color and styling based on password strength
 */
const getStrengthStyles = (strength: PasswordStrength) => {
  switch (strength) {
    case PasswordStrength.VERY_WEAK:
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        label: 'Very Weak',
        width: '16.67%'
      };
    case PasswordStrength.WEAK:
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-400',
        label: 'Weak',
        width: '33.33%'
      };
    case PasswordStrength.FAIR:
      return {
        color: 'text-orange-500',
        bgColor: 'bg-orange-400',
        label: 'Fair',
        width: '50%'
      };
    case PasswordStrength.GOOD:
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-400',
        label: 'Good',
        width: '66.67%'
      };
    case PasswordStrength.STRONG:
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: 'Strong',
        width: '83.33%'
      };
    case PasswordStrength.VERY_STRONG:
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-600',
        label: 'Very Strong',
        width: '100%'
      };
    default:
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-300',
        label: 'Unknown',
        width: '0%'
      };
  }
};

/**
 * Password Strength Indicator Component
 */
export function PasswordStrengthIndicator({
  password,
  showDetails = true,
  showScore = false,
  className,
  onStrengthChange
}: PasswordStrengthIndicatorProps) {
  const [validationResult, setValidationResult] = useState<PasswordValidationResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Debounce validation to avoid excessive calculations
  const validatePassword = useCallback((pwd: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (pwd.length > 0) {
        const result = validatePasswordStrength(pwd);
        setValidationResult(result);
        onStrengthChange?.(result);
        setIsVisible(true);
      } else {
        setValidationResult(null);
        setIsVisible(false);
      }
    }, 150);
  }, [onStrengthChange]);

  useEffect(() => {
    validatePassword(password);
  }, [password, validatePassword]);

  if (!isVisible || !validationResult) {
    return null;
  }

  const styles = getStrengthStyles(validationResult.strength);

  return (
    <div className={cn("space-y-2", className)} role="region" aria-label="Password strength indicator">
      {/* Strength Meter */}
      <div className="flex items-center space-x-2">
        <div 
          className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={validationResult.score}
          aria-label={`Password strength: ${validationResult.score}% - ${styles.label}`}
        >
          <div 
            className={cn("h-full transition-all duration-300 ease-out", styles.bgColor)}
            style={{ width: styles.width }}
          />
        </div>
        <span className={cn("text-sm font-medium min-w-[80px]", styles.color)}>
          {styles.label}
        </span>
        {showScore && (
          <span className="text-xs text-gray-500 min-w-[35px]">
            {validationResult.score}%
          </span>
        )}
      </div>

      {/* Detailed Feedback */}
      {showDetails && (
        <div className="space-y-1 text-sm">
          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <ul className="space-y-1" role="alert" aria-label="Password requirements">
              {validationResult.errors.map((error, index) => (
                <li key={`error-${index}`} className="flex items-start space-x-2 text-red-600">
                  <span className="text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true">✗</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <ul className="space-y-1">
              {validationResult.warnings.map((warning, index) => (
                <li key={`warning-${index}`} className="flex items-start space-x-2 text-orange-600">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true">⚠</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Positive Feedback */}
          {validationResult.feedback.length > 0 && validationResult.isValid && (
            <ul className="space-y-1">
              {validationResult.feedback.map((feedback, index) => (
                <li key={`feedback-${index}`} className="flex items-start space-x-2 text-green-600">
                  <span className="text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true">✓</span>
                  <span>{feedback}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Password Strength Indicator for minimal space
 */
export function CompactPasswordStrengthIndicator({
  password,
  className,
  onStrengthChange
}: Omit<PasswordStrengthIndicatorProps, 'showDetails' | 'showScore'>) {
  return (
    <PasswordStrengthIndicator
      password={password}
      showDetails={false}
      showScore={false}
      className={className}
      onStrengthChange={onStrengthChange}
    />
  );
}

/**
 * Password Requirements Checklist Component
 * Shows a checklist of password requirements with real-time validation
 */
interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  const [validationResult, setValidationResult] = useState<PasswordValidationResult | null>(null);

  useEffect(() => {
    if (password.length > 0) {
      const result = validatePasswordStrength(password);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [password]);

  const requirements = [
    {
      label: 'At least 12 characters',
      test: (pwd: string) => pwd.length >= 12,
      met: validationResult ? validationResult.errors.findIndex(e => e.includes('12 characters')) === -1 : false
    },
    {
      label: 'Contains uppercase letter (A-Z)',
      test: (pwd: string) => /[A-Z]/.test(pwd),
      met: validationResult ? validationResult.errors.findIndex(e => e.includes('uppercase')) === -1 : false
    },
    {
      label: 'Contains lowercase letter (a-z)',
      test: (pwd: string) => /[a-z]/.test(pwd),
      met: validationResult ? validationResult.errors.findIndex(e => e.includes('lowercase')) === -1 : false
    },
    {
      label: 'Contains number (0-9)',
      test: (pwd: string) => /\d/.test(pwd),
      met: validationResult ? validationResult.errors.findIndex(e => e.includes('number')) === -1 : false
    },
    {
      label: 'Contains special character (!@#$%...)',
      test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      met: validationResult ? validationResult.errors.findIndex(e => e.includes('special character')) === -1 : false
    }
  ];

  return (
    <div className={cn("space-y-2", className)} role="region" aria-label="Password requirements">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Password Requirements
      </h4>
      <ul className="space-y-2 text-sm">
        {requirements.map((requirement, index) => (
          <li 
            key={index} 
            className={cn(
              "flex items-center space-x-2 transition-colors",
              requirement.met ? "text-green-600" : "text-gray-500"
            )}
          >
            <span 
              className={cn(
                "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                requirement.met 
                  ? "border-green-500 bg-green-500 text-white" 
                  : "border-gray-300"
              )}
              aria-hidden="true"
            >
              {requirement.met && (
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span className={requirement.met ? "line-through" : ""}>
              {requirement.label}
            </span>
            <span className="sr-only">
              {requirement.met ? "Requirement met" : "Requirement not met"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthIndicator;