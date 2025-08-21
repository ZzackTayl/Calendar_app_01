/**
 * Relationship Indicator Component
 * 
 * Displays a colored dot representing a relationship
 */
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RelationshipIndicatorProps {
  /**
   * The color for the indicator (e.g., "#FF5500")
   * Will be used as a data attribute to match CSS rules
   */
  color?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * RelationshipIndicator - Displays a colored indicator for relationships
 * 
 * This component uses data attributes and CSS classes to avoid inline styles
 * while still supporting dynamic relationship colors.
 */
export const RelationshipIndicator = React.forwardRef<HTMLDivElement, RelationshipIndicatorProps>(
  ({ color = '#6B7280', className }, ref) => {
    // Get a color class that best matches the provided color
    // or default to using a data attribute
    const colorClass = getColorClass(color);
    
    return (
      <div
        ref={ref}
        className={cn(
          "relationship-indicator",
          colorClass,
          className
        )}
        data-relationship-color={color}
      />
    );
  }
);

/**
 * Map a hex color to a predefined color class
 */
function getColorClass(color: string): string {
  // Common color mapping
  const colorMap: Record<string, string> = {
    '#3B82F6': 'relationship-color-1',  // blue
    '#6366F1': 'relationship-color-2',  // indigo
    '#8B5CF6': 'relationship-color-3',  // violet
    '#EC4899': 'relationship-color-4',  // pink
    '#EF4444': 'relationship-color-5',  // red
    '#F97316': 'relationship-color-6',  // orange
    '#EAB308': 'relationship-color-7',  // yellow
    '#22C55E': 'relationship-color-8',  // green
    '#06B6D4': 'relationship-color-9',  // cyan
    '#6B7280': 'relationship-color-10', // gray
  };
  
  // Return the matching class or empty string (will fall back to data attribute)
  return colorMap[color] || '';
}

RelationshipIndicator.displayName = 'RelationshipIndicator';

export default RelationshipIndicator;