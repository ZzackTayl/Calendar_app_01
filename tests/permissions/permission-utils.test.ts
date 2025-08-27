import { describe, it, expect } from 'vitest'
import {
  resolvePermissionConflict,
  calculateEffectivePermissions,
  getEffectivePermissionLevel,
  isMoreRestrictive,
  hasPermissionLevel,
  getPrivacyLevelRestrictiveness,
  type PrivacyLevel
} from '../../lib/permissions/permission-utils'

describe('Permission Utils', () => {
  describe('Privacy Level Order', () => {
    it('correctly identifies more restrictive levels', () => {
      expect(isMoreRestrictive('no_access', 'private')).toBe(true)
      expect(isMoreRestrictive('private', 'semi_private')).toBe(true)
      expect(isMoreRestrictive('semi_private', 'visible')).toBe(true)
      expect(isMoreRestrictive('no_access', 'visible')).toBe(true)
      
      expect(isMoreRestrictive('private', 'private')).toBe(false)
      expect(isMoreRestrictive('visible', 'private')).toBe(false)
    })
    
    it('returns correct restrictiveness scores', () => {
      expect(getPrivacyLevelRestrictiveness('no_access')).toBeLessThan(
        getPrivacyLevelRestrictiveness('private')
      )
      
      expect(getPrivacyLevelRestrictiveness('private')).toBeLessThan(
        getPrivacyLevelRestrictiveness('semi_private')
      )
      
      expect(getPrivacyLevelRestrictiveness('semi_private')).toBeLessThan(
        getPrivacyLevelRestrictiveness('visible')
      )
    })
    
    it('correctly checks permission level requirements', () => {
      // Required level: private
      expect(hasPermissionLevel('private', 'private')).toBe(true)
      expect(hasPermissionLevel('private', 'semi_private')).toBe(true)
      expect(hasPermissionLevel('private', 'visible')).toBe(true)
      expect(hasPermissionLevel('private', 'no_access')).toBe(false)
      
      // Required level: visible
      expect(hasPermissionLevel('visible', 'visible')).toBe(true)
      expect(hasPermissionLevel('visible', 'private')).toBe(false)
      
      // Required level: no_access (weird case but should work)
      expect(hasPermissionLevel('no_access', 'no_access')).toBe(true)
      expect(hasPermissionLevel('no_access', 'private')).toBe(true)
      expect(hasPermissionLevel('no_access', 'visible')).toBe(true)
    })
  })
  
  describe('Conflict Resolution', () => {
    const rules = [
      {
        permissionKey: 'view_calendar',
        level: 'visible' as PrivacyLevel,
        source: { id: '1', name: 'Source 1', type: 'contact' as const },
        isExplicit: false
      },
      {
        permissionKey: 'view_calendar',
        level: 'private' as PrivacyLevel,
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
      expect(result.level).toBe('visible')
      expect(result.source.id).toBe('1')
      expect(result.overriddenSources?.length).toBe(2)
    })
    
    it('resolves conflicts using explicit_wins strategy', () => {
      const result = resolvePermissionConflict(rules, 'explicit_wins')
      expect(result.level).toBe('private')
      expect(result.source.id).toBe('2')
      expect(result.overriddenSources?.length).toBe(2)
    })
    
    it('uses default level when no rules are provided', () => {
      const result = resolvePermissionConflict([], 'most_restrictive', 'private')
      expect(result.level).toBe('private')
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
            level: 'visible'
          },
          {
            sourceId: 'contact-1',
            sourceName: 'Contact 1',
            sourceType: 'contact',
            level: 'private'
          }
        ],
        'explicit_wins',
        'private'
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
            level: 'visible',
            priority: 50
          },
          {
            sourceId: 'contact-1',
            sourceName: 'Contact 1',
            sourceType: 'contact',
            level: 'private',
            priority: 40
          }
        ],
        'most_permissive',
        'semi_private'
      )
      
      expect(result.level).toBe('visible') // Inherited from group
      expect(result.isInherited).toBe(true)
    })
    
    it('falls back to default when no rules are provided', () => {
      const result = calculateEffectivePermissions(
        'event-1',
        'view_details',
        null,
        [],
        'most_restrictive',
        'private'
      )
      
      expect(result.level).toBe('private')
      expect(result.source.id).toBe('default')
    })
  })
  
  describe('Effective Permission Calculation', () => {
    const userPermissions = {
      'contact-1': {
        'view_calendar': 'visible' as PrivacyLevel,
        'edit_events': 'no_access' as PrivacyLevel
      },
      'contact-2': {
        'view_calendar': 'private' as PrivacyLevel
      },
      'group-1': {
        'view_calendar': 'semi_private' as PrivacyLevel,
        'view_details': 'no_access' as PrivacyLevel
      }
    }
    
    const groupMemberships = {
      'contact-1': ['group-1'],
      'contact-2': ['group-1'],
      'contact-3': ['group-1']
    }
    
    const globalDefaults = {
      'view_calendar': 'private' as PrivacyLevel,
      'view_details': 'semi_private' as PrivacyLevel,
      'edit_events': 'no_access' as PrivacyLevel,
      'default': 'private' as PrivacyLevel
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
      
      expect(result.level).toBe('visible') // Direct setting
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
      
      expect(result.level).toBe('no_access') // Inherited from group
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
