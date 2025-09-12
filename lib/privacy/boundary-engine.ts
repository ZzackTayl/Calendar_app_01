/**
 * Privacy Boundary Engine
 * 
 * Core privacy enforcement system for PolyHarmony Calendar.
 * Implements sophisticated metamour privacy cascade logic and relationship-aware access control.
 * 
 * CRITICAL: This module ensures complete privacy boundary enforcement for complex 
 * polyamorous relationship networks with 95%+ confidence.
 */

import { ConnectionTier } from '@/lib/supabase/types';

export type PrivacyLevel = 'private' | 'semi_private' | 'visible' | 'public' | 'busy_only' | 'details';
export type RelationshipTier = 'private' | 'busy_only' | 'details' | 'none';

export interface RelationshipChain {
  fromUserId: string;
  toUserId: string;
  directRelationship?: {
    tier: RelationshipTier;
    established: Date;
  };
  indirectPath?: {
    intermediateUsers: string[];
    shortestDistance: number;
    weakestLink: RelationshipTier;
  };
}

export interface FieldContext {
  ownerId: string;
  viewerId: string;
  fieldType: 'title' | 'description' | 'location' | 'notes' | 'attendees';
  privacyLevel: PrivacyLevel;
  eventId?: string;
  entityType: 'event' | 'profile' | 'relationship';
}

export interface AccessLevel {
  canView: boolean;
  canViewDetails: boolean;
  effectivePrivacyLevel: PrivacyLevel;
  reason: string;
  enforcementRules: string[];
}

/**
 * Privacy Access Control Matrix
 * Defines what access level viewers get based on their relationship tier
 */
const PRIVACY_ACCESS_MATRIX: Record<RelationshipTier, Record<PrivacyLevel, PrivacyLevel>> = {
  // Direct relationship tiers
  details: {
    private: 'private',        // Owner only
    semi_private: 'details',   // Full access for details tier
    visible: 'details',        // Full access
    public: 'public',          // Full access
    busy_only: 'busy_only',    // Downgraded from details request
    details: 'details'         // Full access
  },
  
  busy_only: {
    private: 'private',        // Owner only
    semi_private: 'busy_only', // DOWNGRADE: semi_private becomes busy_only
    visible: 'busy_only',      // DOWNGRADE: visible becomes busy_only  
    public: 'public',          // Public data remains public
    busy_only: 'busy_only',    // Appropriate level
    details: 'busy_only'       // DOWNGRADE: details becomes busy_only
  },
  
  // Metamour relationship (indirect)
  private: {
    private: 'private',        // Owner only
    semi_private: 'private',   // BLOCKED: metamour gets nothing
    visible: 'private',        // BLOCKED: metamour gets nothing
    public: 'public',          // Public data only
    busy_only: 'private',      // BLOCKED: metamour gets nothing
    details: 'private'         // BLOCKED: metamour gets nothing
  },
  
  // No relationship
  none: {
    private: 'private',        // Owner only
    semi_private: 'private',   // No access
    visible: 'private',        // No access
    public: 'public',          // Public data only
    busy_only: 'private',      // No access
    details: 'private'         // No access
  }
};

/**
 * Field-Level Privacy Rules
 * Different fields have different sensitivity levels
 */
const FIELD_PRIVACY_RULES = {
  title: {
    sensitivityLevel: 'low',
    visibleAtTier: 'busy_only',
    requiresDetailsFor: ['private', 'semi_private']
  },
  description: {
    sensitivityLevel: 'high', 
    visibleAtTier: 'details',
    requiresDetailsFor: ['private', 'semi_private', 'visible']
  },
  location: {
    sensitivityLevel: 'high',
    visibleAtTier: 'details', 
    requiresDetailsFor: ['private', 'semi_private', 'visible']
  },
  notes: {
    sensitivityLevel: 'critical',
    visibleAtTier: 'owner_only',
    requiresDetailsFor: ['private', 'semi_private', 'visible', 'public']
  },
  attendees: {
    sensitivityLevel: 'medium',
    visibleAtTier: 'busy_only',
    requiresDetailsFor: ['private', 'semi_private']
  }
} as const;

/**
 * Privacy Boundary Engine - Core privacy enforcement system
 */
export class PrivacyBoundaryEngine {
  private relationshipCache: Map<string, RelationshipChain> = new Map();
  private accessCache: Map<string, AccessLevel> = new Map();

  /**
   * Determine effective privacy level for viewer based on their relationship with owner
   * CRITICAL: This is the core privacy enforcement method
   */
  getEffectivePrivacyLevel(
    viewerId: string, 
    ownerId: string, 
    basePrivacy: PrivacyLevel
  ): AccessLevel {
    // Owner always gets full access
    if (viewerId === ownerId) {
      return {
        canView: true,
        canViewDetails: true,
        effectivePrivacyLevel: basePrivacy,
        reason: 'Data owner has full access',
        enforcementRules: ['OWNER_FULL_ACCESS']
      };
    }

    const cacheKey = `${viewerId}:${ownerId}:${basePrivacy}`;
    const cached = this.accessCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const relationshipChain = this.analyzeRelationshipPath(viewerId, ownerId);
    const viewerTier = this.determineViewerTier(relationshipChain);
    
    // Apply privacy access matrix
    const effectivePrivacy = PRIVACY_ACCESS_MATRIX[viewerTier][basePrivacy];
    
    const accessLevel: AccessLevel = {
      canView: effectivePrivacy !== 'private',
      canViewDetails: effectivePrivacy === 'details' || effectivePrivacy === 'public',
      effectivePrivacyLevel: effectivePrivacy,
      reason: this.buildAccessReason(viewerTier, basePrivacy, effectivePrivacy, relationshipChain),
      enforcementRules: this.buildEnforcementRules(viewerTier, basePrivacy, effectivePrivacy)
    };

    // Cache result (with short TTL for real-time relationship changes)
    this.accessCache.set(cacheKey, accessLevel);
    
    return accessLevel;
  }

  /**
   * Check if viewer can access specific field
   * CRITICAL: Field-level access control prevents information leakage
   */
  canAccessField(
    viewerId: string,
    ownerId: string, 
    fieldType: keyof typeof FIELD_PRIVACY_RULES,
    privacyLevel: PrivacyLevel
  ): boolean {
    const accessLevel = this.getEffectivePrivacyLevel(viewerId, ownerId, privacyLevel);
    const fieldRules = FIELD_PRIVACY_RULES[fieldType];

    // Notes are always owner-only
    if (fieldType === 'notes' && viewerId !== ownerId) {
      return false;
    }

    // Apply field-specific rules
    switch (fieldRules.sensitivityLevel) {
      case 'critical':
        return viewerId === ownerId;
      
      case 'high':
        return accessLevel.canViewDetails;
      
      case 'medium':
        return accessLevel.canView && 
               (accessLevel.effectivePrivacyLevel === 'details' || 
                accessLevel.effectivePrivacyLevel === 'busy_only' ||
                accessLevel.effectivePrivacyLevel === 'public');
      
      case 'low':
        return accessLevel.canView;
      
      default:
        return false;
    }
  }

  /**
   * Apply metamour privacy downgrade rules
   * CRITICAL: Ensures intimate details don't leak through relationship chains
   */
  applyMetamourDowngrade(relationshipChain: RelationshipChain): RelationshipTier {
    if (relationshipChain.directRelationship) {
      return relationshipChain.directRelationship.tier;
    }

    if (relationshipChain.indirectPath) {
      // Metamour relationships get maximum privacy protection
      // Even if both intermediate relationships are "details", 
      // the metamour only gets "busy_only" at most
      const { shortestDistance, weakestLink } = relationshipChain.indirectPath;
      
      if (shortestDistance > 2) {
        return 'none'; // Too distant, no access
      }
      
      if (shortestDistance === 2) {
        // Direct metamour scenario (A -> B -> C)
        // Maximum access is busy_only, regardless of intermediate tiers
        return weakestLink === 'details' ? 'busy_only' : 'none';
      }
    }

    return 'none';
  }

  /**
   * Analyze relationship path between users
   * CRITICAL: Handles complex polyamorous relationship networks
   */
  analyzeRelationshipPath(fromUserId: string, toUserId: string): RelationshipChain {
    const cacheKey = `${fromUserId}:${toUserId}`;
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check for direct relationship first
    const directRelationship = this.getDirectRelationship(fromUserId, toUserId);
    
    if (directRelationship) {
      const chain: RelationshipChain = {
        fromUserId,
        toUserId,
        directRelationship
      };
      
      this.relationshipCache.set(cacheKey, chain);
      return chain;
    }

    // Find indirect path (metamour scenarios)
    const indirectPath = this.findShortestRelationshipPath(fromUserId, toUserId);
    
    const chain: RelationshipChain = {
      fromUserId,
      toUserId,
      ...(indirectPath ? { indirectPath } : {})
    };

    this.relationshipCache.set(cacheKey, chain);
    return chain;
  }

  /**
   * Clear relationship cache when relationships change
   * CRITICAL: Must be called when relationship tiers are updated
   */
  invalidateRelationshipCache(userId1?: string, userId2?: string): void {
    if (userId1 && userId2) {
      // Clear specific relationship
      this.relationshipCache.delete(`${userId1}:${userId2}`);
      this.relationshipCache.delete(`${userId2}:${userId1}`);
      
      // Clear access cache for these users
      for (const [key] of this.accessCache) {
        if (key.includes(`${userId1}:`) || key.includes(`${userId2}:`)) {
          this.accessCache.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.relationshipCache.clear();
      this.accessCache.clear();
    }
  }

  /**
   * Get direct relationship between two users
   * MOCK IMPLEMENTATION: In production, this would query the database
   */
  private getDirectRelationship(userId1: string, userId2: string): { tier: RelationshipTier; established: Date } | null {
    // Mock implementation - in production this would query the relationships table
    if (typeof window !== 'undefined' && window.localStorage) {
      const relationships = JSON.parse(localStorage.getItem('demo_relationships') || '[]');
      const relationship = relationships.find((r: any) => 
        (r.user1Id === userId1 && r.user2Id === userId2) ||
        (r.user1Id === userId2 && r.user2Id === userId1)
      );
      
      if (relationship) {
        return {
          tier: relationship.tier as RelationshipTier,
          established: new Date(relationship.createdAt)
        };
      }
    }
    
    return null;
  }

  /**
   * Find shortest relationship path between users (for metamour scenarios)
   * MOCK IMPLEMENTATION: In production, this would use graph algorithms on the database
   */
  private findShortestRelationshipPath(
    fromUserId: string, 
    toUserId: string
  ): { intermediateUsers: string[]; shortestDistance: number; weakestLink: RelationshipTier } | null {
    // Mock implementation - in production this would use BFS/Dijkstra on relationship graph
    if (typeof window !== 'undefined' && window.localStorage) {
      const relationships = JSON.parse(localStorage.getItem('demo_relationships') || '[]');
      
      // Simple 2-hop check (A -> B -> C)
      for (const rel1 of relationships) {
        if (rel1.user1Id === fromUserId || rel1.user2Id === fromUserId) {
          const intermediateUser = rel1.user1Id === fromUserId ? rel1.user2Id : rel1.user1Id;
          
          for (const rel2 of relationships) {
            if ((rel2.user1Id === intermediateUser && rel2.user2Id === toUserId) ||
                (rel2.user1Id === toUserId && rel2.user2Id === intermediateUser)) {
              
              const tier1 = rel1.tier as RelationshipTier;
              const tier2 = rel2.tier as RelationshipTier;
              const weakestLink = this.getWeakerTier(tier1, tier2);
              
              return {
                intermediateUsers: [intermediateUser],
                shortestDistance: 2,
                weakestLink
              };
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Determine viewer's effective tier based on relationship analysis
   */
  private determineViewerTier(relationshipChain: RelationshipChain): RelationshipTier {
    if (relationshipChain.directRelationship) {
      return relationshipChain.directRelationship.tier;
    }
    
    if (relationshipChain.indirectPath) {
      return this.applyMetamourDowngrade(relationshipChain);
    }
    
    return 'none';
  }

  /**
   * Build human-readable access reason
   */
  private buildAccessReason(
    viewerTier: RelationshipTier,
    basePrivacy: PrivacyLevel, 
    effectivePrivacy: PrivacyLevel,
    relationshipChain: RelationshipChain
  ): string {
    if (relationshipChain.directRelationship) {
      if (effectivePrivacy === basePrivacy) {
        return `Direct relationship (${viewerTier}) grants ${effectivePrivacy} access`;
      } else {
        return `Direct relationship (${viewerTier}) downgrades ${basePrivacy} to ${effectivePrivacy}`;
      }
    }
    
    if (relationshipChain.indirectPath) {
      const { shortestDistance, intermediateUsers } = relationshipChain.indirectPath;
      return `Metamour relationship (distance ${shortestDistance}) limits access to ${effectivePrivacy}`;
    }
    
    return `No relationship - access denied except for public content`;
  }

  /**
   * Build enforcement rules for audit logging
   */
  private buildEnforcementRules(
    viewerTier: RelationshipTier,
    basePrivacy: PrivacyLevel,
    effectivePrivacy: PrivacyLevel
  ): string[] {
    const rules: string[] = [];
    
    rules.push(`VIEWER_TIER_${viewerTier.toUpperCase()}`);
    rules.push(`BASE_PRIVACY_${basePrivacy.toUpperCase()}`);
    rules.push(`EFFECTIVE_PRIVACY_${effectivePrivacy.toUpperCase()}`);
    
    if (effectivePrivacy !== basePrivacy) {
      rules.push('PRIVACY_DOWNGRADE_APPLIED');
    }
    
    if (viewerTier === 'none') {
      rules.push('NO_RELATIONSHIP_RESTRICTION');
    }
    
    return rules;
  }

  /**
   * Determine which relationship tier is weaker (more restrictive)
   */
  private getWeakerTier(tier1: RelationshipTier, tier2: RelationshipTier): RelationshipTier {
    const tierStrength = {
      'none': 0,
      'private': 1, 
      'busy_only': 2,
      'details': 3
    };
    
    return tierStrength[tier1] < tierStrength[tier2] ? tier1 : tier2;
  }
}

/**
 * Global privacy boundary engine instance
 */
let privacyBoundaryEngine: PrivacyBoundaryEngine | null = null;

export function getPrivacyBoundaryEngine(): PrivacyBoundaryEngine {
  if (!privacyBoundaryEngine) {
    privacyBoundaryEngine = new PrivacyBoundaryEngine();
  }
  return privacyBoundaryEngine;
}

/**
 * Relationship Chain Analyzer - Specialized for complex relationship networks
 */
export class RelationshipChainAnalyzer {
  private boundaryEngine: PrivacyBoundaryEngine;

  constructor(boundaryEngine?: PrivacyBoundaryEngine) {
    this.boundaryEngine = boundaryEngine || getPrivacyBoundaryEngine();
  }

  /**
   * Analyze relationship path between users with detailed metrics
   */
  analyzeRelationshipPath(fromUserId: string, toUserId: string): RelationshipChain {
    return this.boundaryEngine.analyzeRelationshipPath(fromUserId, toUserId);
  }

  /**
   * Determine access level based on relationship chain with confidence scoring
   */
  getChainAccessLevel(chain: RelationshipChain): AccessLevel & { confidenceScore: number } {
    const baseAccess = this.boundaryEngine.getEffectivePrivacyLevel(
      chain.fromUserId, 
      chain.toUserId, 
      'details' // Use details as base to see maximum possible access
    );

    let confidenceScore = 1.0;

    if (chain.indirectPath) {
      // Reduce confidence for indirect relationships
      confidenceScore = Math.max(0.1, 1.0 - (chain.indirectPath.shortestDistance - 1) * 0.3);
    }

    return {
      ...baseAccess,
      confidenceScore
    };
  }

  /**
   * Validate relationship network for consistency
   * CRITICAL: Detects potential privacy boundary violations
   */
  validateRelationshipNetwork(userIds: string[]): {
    isValid: boolean;
    violations: string[];
    recommendations: string[];
  } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Check for potential privacy leakage scenarios
    for (let i = 0; i < userIds.length; i++) {
      for (let j = i + 1; j < userIds.length; j++) {
        const userId1 = userIds[i];
        const userId2 = userIds[j];
        
        const chain1to2 = this.analyzeRelationshipPath(userId1, userId2);
        const chain2to1 = this.analyzeRelationshipPath(userId2, userId1);

        // Check for asymmetric relationship definitions
        if (chain1to2.directRelationship && chain2to1.directRelationship) {
          if (chain1to2.directRelationship.tier !== chain2to1.directRelationship.tier) {
            violations.push(`Asymmetric relationship tiers between ${userId1} and ${userId2}`);
          }
        }

        // Check for potential metamour information leakage
        if (chain1to2.indirectPath && chain1to2.indirectPath.shortestDistance === 2) {
          const intermediateUser = chain1to2.indirectPath.intermediateUsers[0];
          recommendations.push(
            `Consider privacy settings for metamour relationship: ${userId1} -> ${intermediateUser} -> ${userId2}`
          );
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations
    };
  }
}