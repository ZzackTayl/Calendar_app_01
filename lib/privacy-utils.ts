import { PrivacyLevel, ConnectionTier, PrivacyOverride } from '@/lib/supabase/types';
import { Lock, Eye, EyeOff, Users, Shield, Calendar, Clock } from 'lucide-react';
import React from 'react';

// Legacy privacy levels (for backward compatibility)
export type LegacyPrivacyLevel = 'no_access' | 'private' | 'visible' | 'semi_private' | 'public' | 'full_access' | 'limited_access' | 'busy_only' | 'hidden';

// New unified privacy system
export type UnifiedPrivacyLevel = ConnectionTier | PrivacyOverride;

/**
 * Maps old privacy levels to new connection tiers
 */
export function mapLegacyToConnectionTier(legacyLevel: LegacyPrivacyLevel): ConnectionTier {
  switch (legacyLevel) {
    case 'no_access':
    case 'private':
    case 'hidden':
      return 'private';
    case 'busy_only':
    case 'limited_access':
      return 'busy_only';
    case 'visible':
    case 'full_access':
    case 'public':
      return 'details';
    case 'semi_private':
      return 'busy_only';
    default:
      return 'private';
  }
}

/**
 * Maps old privacy levels to new privacy overrides
 */
export function mapLegacyToPrivacyOverride(legacyLevel: LegacyPrivacyLevel): PrivacyOverride {
  switch (legacyLevel) {
    case 'no_access':
    case 'private':
    case 'hidden':
      return 'private';
    case 'visible':
    case 'full_access':
    case 'public':
    case 'semi_private':
    case 'busy_only':
    case 'limited_access':
    default:
      return 'default';
  }
}

/**
 * Gets the appropriate icon for a privacy level (supports both old and new systems)
 */
export function getPrivacyIcon(level: string): React.ReactElement {
  // Handle new unified system
  if (level === 'private' || level === 'default') {
    return React.createElement(Lock, { className: "h-4 w-4" });
  }
  if (level === 'busy_only') {
    return React.createElement(Clock, { className: "h-4 w-4" });
  }
  if (level === 'details') {
    return React.createElement(Eye, { className: "h-4 w-4" });
  }

  // Handle legacy system
  switch (level) {
    case 'no_access':
    case 'hidden':
      return React.createElement(EyeOff, { className: "h-4 w-4" });
    case 'private':
      return React.createElement(Lock, { className: "h-4 w-4" });
    case 'visible':
    case 'full_access':
      return React.createElement(Eye, { className: "h-4 w-4" });
    case 'semi_private':
    case 'limited_access':
      return React.createElement(Users, { className: "h-4 w-4" });
    case 'busy_only':
      return React.createElement(Clock, { className: "h-4 w-4" });
    case 'public':
      return React.createElement(Calendar, { className: "h-4 w-4" });
    default:
      return React.createElement(Shield, { className: "h-4 w-4" });
  }
}

/**
 * Gets the appropriate label for a privacy level (supports both old and new systems)
 */
export function getPrivacyLabel(level: string): string {
  // Handle new unified system
  if (level === 'private') {
    return 'Private';
  }
  if (level === 'busy_only') {
    return 'Busy Only';
  }
  if (level === 'details') {
    return 'Full Details';
  }
  if (level === 'default') {
    return 'Default';
  }

  // Handle legacy system
  switch (level) {
    case 'no_access':
      return 'No Access';
    case 'hidden':
      return 'Hidden';
    case 'private':
      return 'Private';
    case 'visible':
      return 'Visible';
    case 'full_access':
      return 'Full Access';
    case 'semi_private':
      return 'Semi-Private';
    case 'limited_access':
      return 'Limited Access';
    case 'busy_only':
      return 'Busy Only';
    case 'public':
      return 'Public';
    default:
      return 'Unknown';
  }
}

/**
 * Gets the description for a privacy level (supports both old and new systems)
 */
export function getPrivacyDescription(level: string): string {
  // Handle new unified system
  if (level === 'private') {
    return 'Only you can see this event';
  }
  if (level === 'busy_only') {
    return 'Others see only that you are busy';
  }
  if (level === 'details') {
    return 'Others can see event details';
  }
  if (level === 'default') {
    return 'Follows your relationship privacy settings';
  }

  // Handle legacy system
  switch (level) {
    case 'no_access':
      return 'No access to this content';
    case 'hidden':
      return 'This content is hidden from others';
    case 'private':
      return 'Only you can see this content';
    case 'visible':
      return 'Others can see this content';
    case 'full_access':
      return 'Full access to all details';
    case 'semi_private':
      return 'Limited visibility to others';
    case 'limited_access':
      return 'Limited access to details';
    case 'busy_only':
      return 'Others only see busy status';
    case 'public':
      return 'Publicly visible content';
    default:
      return 'Privacy level not specified';
  }
}

/**
 * Gets the badge variant for a privacy level (supports both old and new systems)
 */
export function getPrivacyVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  // Handle new unified system
  if (level === 'private') {
    return 'destructive';
  }
  if (level === 'busy_only') {
    return 'secondary';
  }
  if (level === 'details') {
    return 'default';
  }
  if (level === 'default') {
    return 'outline';
  }

  // Handle legacy system
  switch (level) {
    case 'no_access':
    case 'hidden':
    case 'private':
      return 'destructive';
    case 'visible':
    case 'full_access':
    case 'public':
      return 'default';
    case 'semi_private':
    case 'limited_access':
    case 'busy_only':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Gets the badge configuration for a privacy level (supports both old and new systems)
 */
export function getPrivacyLevelBadge(level: string) {
  return {
    variant: getPrivacyVariant(level),
    children: React.createElement('div', { className: "flex items-center space-x-1" },
      getPrivacyIcon(level),
      React.createElement('span', null, getPrivacyLabel(level))
    ),
    label: getPrivacyLabel(level),
    icon: getPrivacyIcon(level),
    description: getPrivacyDescription(level)
  };
}

/**
 * Checks if a privacy level is from the legacy system
 */
export function isLegacyPrivacyLevel(level: string): level is LegacyPrivacyLevel {
  const legacyLevels: LegacyPrivacyLevel[] = [
    'no_access', 'private', 'visible', 'semi_private', 'public',
    'full_access', 'limited_access', 'busy_only', 'hidden'
  ];
  return legacyLevels.includes(level as LegacyPrivacyLevel);
}

/**
 * Checks if a privacy level is from the new unified system
 */
export function isUnifiedPrivacyLevel(level: string): level is UnifiedPrivacyLevel {
  const unifiedLevels: UnifiedPrivacyLevel[] = [
    'private', 'busy_only', 'details', 'default'
  ];
  return unifiedLevels.includes(level as UnifiedPrivacyLevel);
}

/**
 * Migrates a legacy privacy level to the new unified system
 */
export function migratePrivacyLevel(legacyLevel: LegacyPrivacyLevel): {
  connectionTier: ConnectionTier;
  privacyOverride: PrivacyOverride;
} {
  return {
    connectionTier: mapLegacyToConnectionTier(legacyLevel),
    privacyOverride: mapLegacyToPrivacyOverride(legacyLevel)
  };
}

/**
 * Gets a user-friendly message about privacy migration
 */
export function getPrivacyMigrationMessage(oldLevel: string, newLevel: string): string {
  if (isLegacyPrivacyLevel(oldLevel)) {
    const migrated = migratePrivacyLevel(oldLevel);
    return `Privacy level "${oldLevel}" has been migrated to the new system: ${migrated.connectionTier} tier with ${migrated.privacyOverride} override`;
  }
  return `Using new privacy system: ${newLevel}`;
}
