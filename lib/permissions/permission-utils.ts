export type PrivacyLevel = 'visible' | 'private' | 'semi_private' | 'no_access'

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
  'private',
  'semi_private', 
  'visible'
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
  defaultLevel: PrivacyLevel = 'semi_private'
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
      // Explicit rules take precedence over inherited ones
      const explicitRules = rules.filter(rule => rule.isExplicit)
      const inheritedRules = rules.filter(rule => !rule.isExplicit)
      
      if (explicitRules.length > 0) {
        // If we have explicit rules, use the most restrictive among them
        let mostRestrictive = explicitRules[0]
        
        for (const rule of explicitRules.slice(1)) {
          if (isMoreRestrictive(rule.level, mostRestrictive.level)) {
            overriddenSources.push(mostRestrictive.source)
            mostRestrictive = rule
          } else {
            overriddenSources.push(rule.source)
          }
        }
        
        result = mostRestrictive
        // Mark inherited rules as overridden
        overriddenSources.push(...inheritedRules.map(rule => rule.source))
      } else {
        // No explicit rules, use most restrictive inherited rule
        let mostRestrictive = inheritedRules[0]
        
        for (const rule of inheritedRules.slice(1)) {
          if (isMoreRestrictive(rule.level, mostRestrictive.level)) {
            overriddenSources.push(mostRestrictive.source)
            mostRestrictive = rule
          } else {
            overriddenSources.push(rule.source)
          }
        }
        
        result = mostRestrictive
      }
      break
    }
  }

  return {
    level: result.level,
    source: result.source,
    isInherited: !result.isExplicit,
    overriddenSources: overriddenSources.length > 0 ? overriddenSources : undefined
  }
}

/**
 * Build a permission inheritance tree for a given permission key
 */
export function buildPermissionTree(
  permissionKey: string,
  userId: string,
  eventId?: string,
  categoryId?: string
): PermissionRule[] {
  const rules: PermissionRule[] = []
  
  // Add global permissions
  rules.push({
    permissionKey,
    level: 'semi_private', // Default global level
    source: { id: 'global', name: 'Global Default', type: 'global' },
    isExplicit: false,
    priority: 1
  })
  
  // Add category-level permissions if applicable
  if (categoryId) {
    rules.push({
      permissionKey,
      level: 'semi_private', // Default category level
      source: { id: categoryId, name: 'Category', type: 'category' },
      isExplicit: false,
      priority: 2
    })
  }
  
  // Add event-level permissions if applicable
  if (eventId) {
    rules.push({
      permissionKey,
      level: 'semi_private', // Default event level
      source: { id: eventId, name: 'Event', type: 'event' },
      isExplicit: false,
      priority: 3
    })
  }
  
  // Add contact-level permissions
  // In a real implementation, this would query the database for contact-specific permissions
  rules.push({
    permissionKey,
    level: 'semi_private', // Default contact level
    source: { id: userId, name: 'Contact', type: 'contact' },
    isExplicit: false,
    priority: 4
  })
  
  return rules.sort((a, b) => (a.priority || 0) - (b.priority || 0))
}

/**
 * Get the effective permission level for a user on a specific permission
 */
export function getEffectivePermission(
  permissionKey: string,
  userId: string,
  eventId?: string,
  categoryId?: string,
  strategy: ConflictResolutionStrategy = 'most_restrictive'
): PermissionResult {
  const rules = buildPermissionTree(permissionKey, userId, eventId, categoryId)
  return resolvePermissionConflict(rules, strategy)
}

/**
 * Check if a user has a specific permission level or higher
 */
export function hasPermission(
  requiredLevel: PrivacyLevel,
  actualLevel: PrivacyLevel
): boolean {
  // Special case: 'no_access' content cannot be accessed by anyone
  if (requiredLevel === 'no_access') {
    return false
  }
  
  // For other levels, follow the normal hierarchy
  return getPrivacyLevelRestrictiveness(actualLevel) >= getPrivacyLevelRestrictiveness(requiredLevel)
}

/**
 * Get all permission keys that are available in the system
 */
export function getAvailablePermissionKeys(): string[] {
  return [
    'view_event_details',
    'edit_event_details',
    'delete_event',
    'manage_attendees',
    'view_attendee_list',
    'edit_attendee_list',
    'send_notifications',
    'manage_permissions',
    'view_analytics',
    'export_data'
  ]
}

/**
 * PermissionUtils class for backward compatibility and convenience
 */
export class PermissionUtils {
  static getPrivacyLevelRestrictiveness = getPrivacyLevelRestrictiveness
  static isMoreRestrictive = isMoreRestrictive
  static resolvePermissionConflict = resolvePermissionConflict
  static buildPermissionTree = buildPermissionTree
  static hasPermission = hasPermission
  static getAvailablePermissionKeys = getAvailablePermissionKeys

  // Security and permission checking methods
  static canEscalatePermission(userLevel: PrivacyLevel, requestedLevel: PrivacyLevel): boolean {
    const userIndex = getPrivacyLevelRestrictiveness(userLevel)
    const requestedIndex = getPrivacyLevelRestrictiveness(requestedLevel)
    // Allow if requested level is less permissive (lower or equal index)
    return requestedIndex <= userIndex
  }

  static canAccessUserData(currentUserId: string, targetUserId: string): boolean {
    // Users can only access their own data
    return currentUserId === targetUserId
  }

  static canAccessGroup(userId: string, groupId: string, members: string[]): boolean {
    // Users can only access groups they are members of
    return members.includes(userId)
  }

  static isShareValid(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) return true // No expiration means always valid
    return new Date(expiresAt) > new Date()
  }

  static canAccessShare(userEmail: string, recipientEmail: string): boolean {
    // Only the intended recipient can access the share
    return userEmail === recipientEmail
  }

  static canBulkOperate(userId: string, targetData: string[], targetUserId: string): boolean {
    // Users can only bulk operate on their own data
    return userId === targetUserId
  }

  static canSetPermission(userLevel: PrivacyLevel, targetLevel: PrivacyLevel): boolean {
    const userIndex = getPrivacyLevelRestrictiveness(userLevel)
    const targetIndex = getPrivacyLevelRestrictiveness(targetLevel)
    // Users cannot set permissions higher than their own level
    return targetIndex <= userIndex
  }

  static requiresAuthentication(endpoint: string): boolean {
    const protectedEndpoints = ['/api/contacts', '/api/groups', '/api/sharing', '/api/relationships']
    return protectedEndpoints.some(protectedEndpoint => endpoint.startsWith(protectedEndpoint))
  }

  static requiresCSRFToken(method: string, endpoint: string): boolean {
    const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    return stateChangingMethods.includes(method.toUpperCase())
  }

  static isInputSafe(input: string): boolean {
    // Basic SQL injection and XSS detection
    const sqlInjectionPatterns = [
      /('|(\\'))([\s]*)((\w+)([\s]+)=)|((\w+)([\s]+)(like|in|between|not))/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /('|\s|;)+drop\s+table/i,
      /(\w+)\s*=\s*\1/i, // 1=1 type patterns
      /'\s*(or|and)\s*'/i, // OR/AND injection patterns like ' OR '1'='1
      /'\s*(or|and)\s*\d+\s*=\s*\d+/i, // patterns like ' OR 1=1
      /--/i, // SQL comments
      /\/\*/i // SQL block comments
    ]
    
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // event handlers like onclick, onerror
      /<iframe[^>]*>/gi
    ]

    const allPatterns = [...sqlInjectionPatterns, ...xssPatterns]
    return !allPatterns.some(pattern => pattern.test(input))
  }

  static isFileSafe(file: { name: string; type: string }): boolean {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar', '.php', '.sh', '.ps1']
    const dangerousMimeTypes = [
      'application/x-msdownload',
      'application/x-php', 
      'application/x-sh',
      'application/x-executable',
      'application/java-archive'
    ]

    const hasDeviousExtension = dangerousExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    const hasDeviousMimeType = dangerousMimeTypes.includes(file.type)

    return !hasDeviousExtension && !hasDeviousMimeType
  }

  // Overloaded getEffectivePermission method for test compatibility
  static getEffectivePermission(userLevel: PrivacyLevel, groupLevel?: PrivacyLevel): PrivacyLevel {
    if (!groupLevel) return userLevel
    
    // Return the more restrictive of the two levels (cannot escalate through group membership)
    const userIndex = getPrivacyLevelRestrictiveness(userLevel)
    const groupIndex = getPrivacyLevelRestrictiveness(groupLevel)
    
    return userIndex <= groupIndex ? userLevel : groupLevel
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
  defaultLevel: PrivacyLevel = 'semi_private'
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
    globalDefaults.default || 'semi_private'
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
