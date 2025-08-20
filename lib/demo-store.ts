/*
  DemoStore: Local, persistent (localStorage) data for demo/offline mode.
  Works with lib/supabase/types.ts shapes where relevant.
*/

import type { Relationship, Event, RelationshipGroup, GroupMember } from './supabase/types'

const STORAGE_KEYS = {
  relationships: 'ph_demo_relationships',
  events: 'ph_demo_events',
  groups: 'ph_demo_groups',
  groupMembers: 'ph_demo_group_members', // { id, group_id, relationship_id, privacy_level }
  version: 'ph_demo_version'
}

function guid(): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.randomUUID) {
    return (globalThis as any).crypto.randomUUID()
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

function nowIso(): string {
  return new Date().toISOString()
}

export const DemoStore = {
  // Reset all demo data
  reset(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k))
  },

  // Seed some sample data
  seedSampleData(userId: string): void {
    const relationships: Relationship[] = [
      {
        id: guid(),
        user_id: userId,
        partner_name: 'Alex',
        partner_email: 'alex@example.com',
        relationship_type: 'primary',
        start_date: nowIso().slice(0, 10),
        color: '#3B82F6',
        notes: 'Loves coffee',
        privacy_level: 'full_access',
        created_at: nowIso(),
        updated_at: nowIso(),
        is_active: true as any
      } as any,
      {
        id: guid(),
        user_id: userId,
        partner_name: 'Sam',
        partner_email: 'sam@example.com',
        relationship_type: 'secondary',
        start_date: nowIso().slice(0, 10),
        color: '#10B981',
        notes: '',
        privacy_level: 'limited_access',
        created_at: nowIso(),
        updated_at: nowIso(),
        is_active: true as any
      } as any,
    ]

    const events: Event[] = [
      {
        id: guid(),
        owner_id: userId,
        title: 'Coffee with Alex',
        description: 'At the new cafe',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        location: 'Downtown',
        privacy_level: 'public',
        relationship_id: relationships[0].id,
        visible_to_relationships: [],
        created_at: nowIso(),
        updated_at: nowIso(),
      },
      {
        id: guid(),
        owner_id: userId,
        title: 'Movie Night with Sam',
        description: 'Comedy night',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        location: 'Cinema',
        privacy_level: 'private',
        relationship_id: relationships[1].id,
        visible_to_relationships: [],
        created_at: nowIso(),
        updated_at: nowIso(),
      },
    ]

    const groups: RelationshipGroup[] = []
    const groupMembers: any[] = []

    save(STORAGE_KEYS.relationships, relationships)
    save(STORAGE_KEYS.events, events)
    save(STORAGE_KEYS.groups, groups)
    save(STORAGE_KEYS.groupMembers, groupMembers)
    save(STORAGE_KEYS.version, 1)
  },

  // Relationships
  listRelationships(userId: string): Relationship[] {
    const all = load<Relationship[]>(STORAGE_KEYS.relationships, [])
    return all.filter((r) => r.user_id === userId)
  },

  addRelationship(data: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Relationship {
    const all = load<Relationship[]>(STORAGE_KEYS.relationships, [])
    const newItem: Relationship = {
      ...data,
      id: guid(),
      created_at: nowIso(),
      updated_at: nowIso(),
    } as any
    all.push(newItem)
    save(STORAGE_KEYS.relationships, all)
    return newItem
  },

  updateRelationship(id: string, changes: Partial<Relationship>): Relationship | null {
    const all = load<Relationship[]>(STORAGE_KEYS.relationships, [])
    const idx = all.findIndex((r) => r.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...changes, updated_at: nowIso() }
    save(STORAGE_KEYS.relationships, all)
    return all[idx]
  },

  getRelationship(id: string): Relationship | null {
    const all = load<Relationship[]>(STORAGE_KEYS.relationships, [])
    return all.find((r) => r.id === id) || null
  },

  deleteRelationship(id: string): void {
    const all = load<Relationship[]>(STORAGE_KEYS.relationships, [])
    const next = all.filter((r) => r.id !== id)
    save(STORAGE_KEYS.relationships, next)
  },

  // Events
  listEvents(userId: string, opts?: { from?: string; to?: string }): Event[] {
    const all = load<Event[]>(STORAGE_KEYS.events, [])
    return all.filter((e) => {
      if (e.owner_id !== userId) return false
      if (opts?.from && e.start_time < opts.from) return false
      if (opts?.to && e.start_time > opts.to) return false
      return true
    })
  },

  getEvent(id: string): Event | null {
    const all = load<Event[]>(STORAGE_KEYS.events, [])
    return all.find((e) => e.id === id) || null
  },

  addEvent(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Event {
    const all = load<Event[]>(STORAGE_KEYS.events, [])
    const newItem: Event = {
      ...data,
      id: guid(),
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    all.push(newItem)
    save(STORAGE_KEYS.events, all)
    return newItem
  },

  updateEvent(id: string, changes: Partial<Event>): Event | null {
    const all = load<Event[]>(STORAGE_KEYS.events, [])
    const idx = all.findIndex((e) => e.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...changes, updated_at: nowIso() }
    save(STORAGE_KEYS.events, all)
    return all[idx]
  },

  deleteEvent(id: string): void {
    const all = load<Event[]>(STORAGE_KEYS.events, [])
    const next = all.filter((e) => e.id !== id)
    save(STORAGE_KEYS.events, next)
  },

  // Groups
  listGroups(userId: string): RelationshipGroup[] {
    const all = load<RelationshipGroup[]>(STORAGE_KEYS.groups, [])
    return all.filter((g) => g.user_id === userId)
  },

  getGroup(id: string): RelationshipGroup | null {
    const all = load<RelationshipGroup[]>(STORAGE_KEYS.groups, [])
    return all.find((g) => g.id === id) || null
  },

  createGroup(data: Omit<RelationshipGroup, 'id' | 'created_at' | 'updated_at'>): RelationshipGroup {
    const all = load<RelationshipGroup[]>(STORAGE_KEYS.groups, [])
    const newItem: RelationshipGroup = {
      ...data,
      id: guid(),
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    all.push(newItem)
    save(STORAGE_KEYS.groups, all)
    return newItem
  },

  updateGroup(id: string, changes: Partial<RelationshipGroup>): RelationshipGroup | null {
    const all = load<RelationshipGroup[]>(STORAGE_KEYS.groups, [])
    const idx = all.findIndex((g) => g.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...changes, updated_at: nowIso() }
    save(STORAGE_KEYS.groups, all)
    return all[idx]
  },

  deleteGroup(id: string): void {
    const all = load<RelationshipGroup[]>(STORAGE_KEYS.groups, [])
    const next = all.filter((g) => g.id !== id)
    save(STORAGE_KEYS.groups, next)
    // Also delete members belonging to this group
    const members = load<GroupMember[]>(STORAGE_KEYS.groupMembers, [])
    const remaining = members.filter((m) => m.group_id !== id)
    save(STORAGE_KEYS.groupMembers, remaining)
  },

  // Group Members
  listGroupMembers(groupId: string): GroupMember[] {
    return load<GroupMember[]>(STORAGE_KEYS.groupMembers, []).filter((m) => m.group_id === groupId)
  },

  addGroupMember(groupId: string, relationshipId: string, privacy_level: GroupMember['privacy_level'] = 'full_access'): GroupMember {
    const all = load<GroupMember[]>(STORAGE_KEYS.groupMembers, [])
    const newItem: GroupMember = {
      id: guid(),
      group_id: groupId,
      relationship_id: relationshipId,
      privacy_level,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    all.push(newItem)
    save(STORAGE_KEYS.groupMembers, all)
    return newItem
  },

  removeGroupMember(memberId: string): void {
    const all = load<GroupMember[]>(STORAGE_KEYS.groupMembers, [])
    const next = all.filter((m) => m.id !== memberId)
    save(STORAGE_KEYS.groupMembers, next)
  },

  updateGroupMemberPrivacy(memberId: string, privacy_level: GroupMember['privacy_level']): GroupMember | null {
    const all = load<GroupMember[]>(STORAGE_KEYS.groupMembers, [])
    const idx = all.findIndex((m) => m.id === memberId)
    if (idx === -1) return null
    all[idx] = { ...all[idx], privacy_level, updated_at: nowIso() }
    save(STORAGE_KEYS.groupMembers, all)
    return all[idx]
  },
}
