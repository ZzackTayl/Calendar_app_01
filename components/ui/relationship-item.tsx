/**
 * RelationshipItem Component
 * 
 * A component that displays a relationship with a colored indicator
 * and the partner's name.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import RelationshipIndicator from './relationship-indicator';

interface RelationshipItemProps {
  /**
   * Relationship ID
   */
  id: string;
  
  /**
   * Display name of the partner
   */
  name: string;
  
  /**
   * Color associated with the relationship
   */
  color?: string;
  
  /**
   * Relationship type (primary, secondary, etc.)
   */
  type?: string;
  
  /**
   * Whether this relationship is currently selected
   */
  isSelected?: boolean;
  
  /**
   * Click handler
   */
  onClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * RelationshipItem - Displays a relationship with consistent styling
 */
export const RelationshipItem = React.forwardRef<HTMLButtonElement, RelationshipItemProps>(
  ({ id, name, color = '#6B7280', type, isSelected, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={cn(
          "p-3 rounded-lg border text-sm transition-all w-full text-left",
          isSelected
            ? "border-primary bg-primary/5 text-primary"
            : "border-gray-200 hover:border-gray-300",
          className
        )}
      >
        <div className="flex items-center">
          <RelationshipIndicator color={color} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {name}
            </p>
            {type && (
              <p className="text-xs text-muted-foreground capitalize">
                {type.replace('_', ' ')}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  }
);

RelationshipItem.displayName = 'RelationshipItem';

export default RelationshipItem;
