import { describe, it, expect } from 'vitest'
import {
  resolvePermissionConflict,
  calculateEffectivePermissions,
  getEffectivePermissionLevel,
  isMoreRestrictive,
  hasPermissionLevel,
  getPrivacyLevelRestrictiveness
} from '@/lib/permissions/permission-utils'
import type { PrivacyLevel } from '@/components/ui/privacy-level-selector'

describe('Permission Utils', () => {
  describe('Privacy Level Order', () => {
    it('correctly identifies more restrictive levels', () => {
      expect(isMoreRestrictive('no_access', 'limited_access')).toBe(true)
      expect(isMoreRestrictive('hidden', 'busy_only')).toBe(true)
      expect(isMoreRestrictive('busy_only', 'limited_access')).toBe(true)
      expect(isMoreRestrictive('limited_access', 'full_access')).toBe(true)
      
      expect(isMoreRestrictive('limited_access', 'limited_access')).toBe(false)
      expect(isMoreRestrictive('full_access', 'limited_access')).toBe(false)
    })
    
    it('returns correct restrictiveness scores', () => {
      expect(getPrivacyLevelRestrictiveness('no_access')).toBeLessThan(
        getPrivacyLevelRestrictiveness('hidden')
      )
      
      expect(getPrivacyLevelRestrictiveness('hidden')).toBeLessThan(
        getPrivacyLevelRestrictiveness('busy_only')
      )
      
      expect(getPrivacyLevelRestrictiveness('busy_only')).toBeLessThan(
        getPrivacyLevelRestrictiveness('limited_access')
      )
      
      expect(getPrivacyLevelRestrictiveness('limited_access')).toBeLessThan(
        getPrivacyLevelRestrictiveness('full_access')
      )
    })
    
    it('correctly checks permission level requirements', () => {
      // Required level: limited_access
      expect(hasPermissionLevel('limited_access', 'limited_access')).toBe(true)
      expect(hasPermissionLevel('limited_access', 'full_access')).toBe(true)
      expect(hasPermissionLevel('limited_access', 'busy_only')).toBe(false)
      expect(hasPermissionLevel('limited_access', 'hidden')).toBe(false)
      
      // Required level: full_access
      expect(hasPermissionLevel('full_access', 'full_access')).toBe(true)
      expect(hasPermissionLevel('full_access', 'limited_access')).toBe(false)
      
      // Required level: no_access (weird case but should work)
      expect(hasPermissionLevel('no_access', 'no_access')).toBe(true)
      expect(hasPermissionLevel('no_access', 'hidden')).toBe(true)
      expect(hasPermissionLevel('no_access', 'full_access')).toBe(true)
    })
  })
  
  describe('Conflict Resolution', () => {
    const rules = [
      {
        permissionKey: 'view_calendar',
        level: 'full_access' as PrivacyLevel,
        source: { id: '1', name: 'Source 1', type: 'contact' as const },
        isExplicit: false
      },
      {
        permissionKey: 'view_calendar',
        level: 'limited_access' as PrivacyLevel,
        source: { id: '2', name: 'Source 2', type: 'group' as const },
        isExplicit: true
      },
      {
        permissionKey: 'view_calendar',
        level: 'no_access' as PrivacyLevel,
        source: { id: '3', name: 'Source 3', type: 'event' as const },
        isExplicit: false
      }
    ]
    
    it('resolves conflicts using most_restrictive strategy', () => {
      const result = resolvePermissionConflict(rules, 'most_restrictive')
      expect(result.level).toBe('no_access')
      expect(result.source.id).toBe('3')
      expect(result.overriddenSources?.length).toBe(2)
    })
    
    it('resolves conflicts using most_permissive strategy', () => {
      const result = resolvePermissionConflict(rules, 'most_permissive')
      expect(result.level).toBe('full_access')
      expect(result.source.id).toBe('1')
      expect(result.overriddenSources?.length).toBe(2)
    })
    
    it('resolves conflicts using explicit_wins strategy', () => {
      const result = resolvePermissionConflict(rules, 'explicit_wins')
      expect(result.level).toBe('limited_access')
      expect(result.source.id).toBe('2')
      expect(result.overriddenSources?.length).toBe(2)
    })
    
    it('uses default level when no rules are provided', () => {
      const result = resolvePermissionConflict([], 'most_restrictive', 'limited_access')
      expect(result.level).toBe('limited_access')
      expect(result.source.id).toBe('default')
    })
  })
  
  describe('Permission Inheritance', () => {
    it('calculates effective permissions with explicit override', () => {
      const result = calculateEffectivePermissions(
        'event-1',
        'view_details',
        'no_access',
        [
          {
            sourceId: 'group-1',
            sourceName: 'Group 1',
            sourceType: 'group',
            level: 'full_access'
          },
          {
            sourceId: 'contact-1',
            sourceName: 'Contact 1',
            sourceType: 'contact',
            level: 'limited_access'
          }
        ],
        'explicit_wins',
        'limited_access'
      )
      
      expect(result.level).toBe('no_access') // Explicit override
      expect(result.isInherited).toBe(false)
    })
    
    it('calculates effective permissions with inheritance', () => {
      const result = calculateEffectivePermissions(
        'event-1',
        'view_details',
        null, // No explicit setting
        [
          {
            sourceId: 'group-1',
            sourceName: 'Group 1',
            sourceType: 'group',
            level: 'full_access',
            priority: 50
          },
          {
            sourceId: 'contact-1',
            sourceName: 'Contact 1',
            sourceType: 'contact',
            level: 'limited_access',
            priority: 40
          }
        ],
        'most_permissive',
        'busy_only'
      )
      
      expect(result.level).toBe('full_access') // Inherited from group
      expect(result.isInherited).toBe(true)
    })
    
    it('falls back to default when no rules are provided', () => {
      const result = calculateEffectivePermissions(
        'event-1',
        'view_details',
        null,
        [],
        'most_restrictive',
        'limited_access'
      )
      
      expect(result.level).toBe('limited_access')
      expect(result.source.id).toBe('default')
    })
  })
  
  describe('Effective Permission Calculation', () => {
    const userPermissions = {
      'contact-1': {
        'view_calendar': 'full_access' as PrivacyLevel,
        'edit_events': 'no_access' as PrivacyLevel
      },
      'contact-2': {
        'view_calendar': 'limited_access' as PrivacyLevel
      },
      'group-1': {
        'view_calendar': 'busy_only' as PrivacyLevel,
        'view_details': 'hidden' as PrivacyLevel
      }
    }
    
    const groupMemberships = {
      'contact-1': ['group-1'],
      'contact-2': ['group-1'],
      'contact-3': ['group-1']
    }
    
    const globalDefaults = {
      'view_calendar': 'limited_access' as PrivacyLevel,
      'view_details': 'busy_only' as PrivacyLevel,
      'edit_events': 'no_access' as PrivacyLevel,
      'default': 'limited_access' as PrivacyLevel
    }
    
    it('gets direct permission over group permission', () => {
      const result = getEffectivePermissionLevel(
        'contact-1',
        'contact',
        'view_calendar',
        userPermissions,
        groupMemberships,
        globalDefaults,
        'explicit_wins'
      )
      
      expect(result.level).toBe('full_access') // Direct setting
      expect(result.isInherited).toBe(false)
    })
    
    it('inherits permission from group', () => {
      const result = getEffectivePermissionLevel(
        'contact-3', // No direct permissions
        'contact',
        'view_details',
        userPermissions,
        groupMemberships,
        globalDefaults,
        'explicit_wins'
      )
      
      expect(result.level).toBe('hidden') // Inherited from group
      expect(result.isInherited).toBe(true)
      expect(result.source.id).toBe('group-1')
    })
    
    it('falls back to global default when no other permissions exist', () => {
      const result = getEffectivePermissionLevel(
        'contact-3',
        'contact',
        'edit_events', // No direct or group permission
        userPermissions,
        groupMemberships,
        globalDefaults,
        'explicit_wins'
      )
      
      expect(result.level).toBe('no_access') // Global default
      expect(result.isInherited).toBe(true)
      expect(result.source.type).toBe('global')
    })
  })
})
