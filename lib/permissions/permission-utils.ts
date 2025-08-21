import { PrivacyLevel } from "@/components/ui/privacy-level-selector"

export type ConflictResolutionStrategy = 'most_restrictive' | 'most_permissive' | 'explicit_wins'

export interface PermissionSource {
  id: string
  name: string
  type: 'contact' | 'group' | 'event' | 'category' | 'global'
}

export interface PermissionRule {
  permissionKey: string
  level: PrivacyLevel
  source: PermissionSource
  isExplicit: boolean
  priority?: number
}

export interface PermissionResult {
  level: PrivacyLevel
  source: PermissionSource
  isInherited: boolean
  overriddenSources?: PermissionSource[]
}

// Privacy levels from most restrictive to most permissive
const privacyLevelOrder: PrivacyLevel[] = [
  'no_access',
  'hidden',
  'busy_only',
  'limited_access',
  'full_access'
]

/**
 * Get the restrictiveness score of a privacy level (lower = more restrictive)
 */
export function getPrivacyLevelRestrictiveness(level: PrivacyLevel): number {
  return privacyLevelOrder.indexOf(level)
}

/**
 * Determine if one privacy level is more restrictive than another
 */
export function isMoreRestrictive(level1: PrivacyLevel, level2: PrivacyLevel): boolean {
  return getPrivacyLevelRestrictiveness(level1) < getPrivacyLevelRestrictiveness(level2)
}

/**
 * Resolve a permission conflict based on the provided strategy
 */
export function resolvePermissionConflict(
  rules: PermissionRule[], 
  strategy: ConflictResolutionStrategy,
  defaultLevel: PrivacyLevel = 'limited_access'
): PermissionResult {
  if (!rules || rules.length === 0) {
    return {
      level: defaultLevel,
      source: { id: 'default', name: 'Default', type: 'global' },
      isInherited: false
    }
  }

  if (rules.length === 1) {
    return {
      level: rules[0].level,
      source: rules[0].source,
      isInherited: false
    }
  }

  let result: PermissionRule
  const overriddenSources: PermissionSource[] = []

  switch (strategy) {
    case 'most_restrictive': {
      // Find the most restrictive rule
      let mostRestrictive = rules[0]
      
      for (const rule of rules.slice(1)) {
        if (isMoreRestrictive(rule.level, mostRestrictive.level)) {
          overriddenSources.push(mostRestrictive.source)
          mostRestrictive = rule
        } else {
          overriddenSources.push(rule.source)
        }
      }
      
      result = mostRestrictive
      break
    }

    case 'most_permissive': {
      // Find the most permissive rule
      let mostPermissive = rules[0]
      
      for (const rule of rules.slice(1)) {
        if (!isMoreRestrictive(rule.level, mostPermissive.level)) {
          overriddenSources.push(mostPermissive.source)
          mostPermissive = rule
        } else {
          overriddenSources.push(rule.source)
        }
      }
      
      result = mostPermissive
      break
    }

    case 'explicit_wins': {
      // First try to find explicit rules
      const explicitRules = rules.filter(rule => rule.isExplicit)
      
      if (explicitRules.length > 0) {
        // If multiple explicit rules, use the highest priority or most restrictive
        let winner = explicitRules[0]
        
        for (const rule of explicitRules.slice(1)) {
          // If priority is defined, use it
          if (rule.priority !== undefined && winner.priority !== undefined) {
            if (rule.priority > winner.priority) {
              overriddenSources.push(winner.source)
              winner = rule
              continue
            } else if (rule.priority < winner.priority) {
              overriddenSources.push(rule.source)
              continue
            }
          }
          
          // If no priority or same priority, use most restrictive
          if (isMoreRestrictive(rule.level, winner.level)) {
            overriddenSources.push(winner.source)
            winner = rule
          } else {
            overriddenSources.push(rule.source)
          }
        }
        
        // Add all non-explicit rules to overridden
        rules
          .filter(rule => !rule.isExplicit)
          .forEach(rule => overriddenSources.push(rule.source))
        
        result = winner
      } else {
        // If no explicit rules, fall back to most restrictive
        return resolvePermissionConflict(rules, 'most_restrictive', defaultLevel)
      }
      break
    }

    default:
      // Default to most restrictive if strategy is unknown
      return resolvePermissionConflict(rules, 'most_restrictive', defaultLevel)
  }

  return {
    level: result.level,
    source: result.source,
    isInherited: false,
    overriddenSources: overriddenSources.length > 0 ? overriddenSources : undefined
  }
}

/**
 * Calculate effective permissions by inheriting from groups or categories
 * 
 * This function simulates the inheritance of permissions from groups or categories
 * to the target objects (e.g., events or contacts).
 */
export function calculateEffectivePermissions(
  targetId: string,
  permissionKey: string,
  explicitLevel: PrivacyLevel | null,
  inheritanceRules: {
    sourceId: string
    sourceName: string
    sourceType: 'contact' | 'group' | 'event' | 'category' | 'global'
    level: PrivacyLevel
    priority?: number
  }[],
  strategy: ConflictResolutionStrategy,
  defaultLevel: PrivacyLevel = 'limited_access'
): PermissionResult {
  // Convert to PermissionRule format
  const rules: PermissionRule[] = []

  // Add explicit rule if it exists
  if (explicitLevel) {
    rules.push({
      permissionKey,
      level: explicitLevel,
      source: { 
        id: targetId,
        name: 'Direct Setting',
        type: 'event'
      },
      isExplicit: true,
      priority: 100 // Highest priority
    })
  }

  // Add inheritance rules
  inheritanceRules.forEach(rule => {
    rules.push({
      permissionKey,
      level: rule.level,
      source: {
        id: rule.sourceId,
        name: rule.sourceName,
        type: rule.sourceType
      },
      isExplicit: false,
      priority: rule.priority
    })
  })

  // If no rules, return default
  if (rules.length === 0) {
    return {
      level: defaultLevel,
      source: { id: 'default', name: 'Default', type: 'global' },
      isInherited: false
    }
  }

  // Resolve using the conflict resolution strategy
  const result = resolvePermissionConflict(rules, strategy, defaultLevel)

  // Mark as inherited if the winning rule is not the explicit one
  if (!explicitLevel || result.source.id !== targetId) {
    result.isInherited = true
  }

  return result
}

/**
 * Get the effective permission level for a specific permission on an entity
 * 
 * This is a higher-level function that combines inheritance and conflict resolution
 */
export function getEffectivePermissionLevel(
  entityId: string,
  entityType: 'contact' | 'group' | 'event' | 'category',
  permissionKey: string,
  userPermissions: Record<string, Record<string, PrivacyLevel>>, // entityId -> permission -> level
  groupMemberships: Record<string, string[]>, // entityId -> group IDs
  globalDefaults: Record<string, PrivacyLevel>, // permission -> level
  strategy: ConflictResolutionStrategy
): PermissionResult {
  // Get direct permission if it exists
  const entityPermissions = userPermissions[entityId] || {}
  const directPermission = entityPermissions[permissionKey]

  // Collect inherited permissions from groups
  const inheritanceRules = []
  
  // Add permissions from groups
  const entityGroups = groupMemberships[entityId] || []
  for (const groupId of entityGroups) {
    const groupPermissions = userPermissions[groupId] || {}
    const groupPermission = groupPermissions[permissionKey]
    
    if (groupPermission) {
      inheritanceRules.push({
        sourceId: groupId,
        sourceName: `Group ${groupId}`, // In a real app, we'd get the actual name
        sourceType: 'group' as const,
        level: groupPermission,
        priority: 50
      })
    }
  }

  // Add global default if it exists
  const globalDefault = globalDefaults[permissionKey]
  if (globalDefault) {
    inheritanceRules.push({
      sourceId: 'global',
      sourceName: 'Global Default',
      sourceType: 'global' as const,
      level: globalDefault,
      priority: 0 // Lowest priority
    })
  }

  // Calculate the effective permission
  return calculateEffectivePermissions(
    entityId,
    permissionKey,
    directPermission || null,
    inheritanceRules,
    strategy,
    globalDefaults.default || 'limited_access'
  )
}

/**
 * Check if a user has at least the specified permission level for an entity
 */
export function hasPermissionLevel(
  requiredLevel: PrivacyLevel,
  effectiveLevel: PrivacyLevel
): boolean {
  const requiredIndex = getPrivacyLevelRestrictiveness(requiredLevel)
  const effectiveIndex = getPrivacyLevelRestrictiveness(effectiveLevel)
  
  // Higher index means more permissive
  return effectiveIndex >= requiredIndex
}
