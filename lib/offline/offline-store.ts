/**
 * Offline Storage Layer for Authenticated Users
 * Replaces demo-store.ts with IndexedDB-based persistent storage
 * Supports offline operations with sync capabilities
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Relationship, Event, RelationshipGroup, RelationshipGroupMember } from '../supabase/types';

// IndexedDB Schema
interface OfflineDB extends DBSchema {
  relationships: {
    key: string;
    value: Relationship & { 
      sync_status: 'synced' | 'pending' | 'conflict';
      last_modified: number;
      offline_id?: string;
    };
    indexes: { 'by-user': string; 'by-sync-status': string };
  };
  events: {
    key: string;
    value: Event & { 
      sync_status: 'synced' | 'pending' | 'conflict';
      last_modified: number;
      offline_id?: string;
    };
    indexes: { 'by-user': string; 'by-sync-status': string; 'by-date': string };
  };
  groups: {
    key: string;
    value: RelationshipGroup & { 
      sync_status: 'synced' | 'pending' | 'conflict';
      last_modified: number;
      offline_id?: string;
    };
    indexes: { 'by-user': string; 'by-sync-status': string };
  };
  group_members: {
    key: string;
    value: RelationshipGroupMember & { 
      sync_status: 'synced' | 'pending' | 'conflict';
      last_modified: number;
      offline_id?: string;
    };
    indexes: { 'by-group': string; 'by-sync-status': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      user_id: string;
      table: string;
      operation: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retry_count: number;
    };
    indexes: { 'by-user': string; 'by-timestamp': number };
  };
  user_metadata: {
    key: string;
    value: {
      user_id: string;
      last_sync: number;
      encryption_key?: string;
      sync_version: number;
    };
  };
}

type SyncStatus = 'synced' | 'pending' | 'conflict';
type SyncableRecord = Relationship | Event | RelationshipGroup | RelationshipGroupMember;

interface OfflineChange {
  id: string;
  user_id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retry_count: number;
}

class OfflineStore {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private currentUserId: string | null = null;

  async init(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    if (!this.db) {
      this.db = await openDB<OfflineDB>('polyharmony-offline', 1, {
        upgrade(db) {
          // Relationships store
          const relationshipsStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relationshipsStore.createIndex('by-user', 'user_id');
          relationshipsStore.createIndex('by-sync-status', 'sync_status');

          // Events store
          const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
          eventsStore.createIndex('by-user', 'user_id');
          eventsStore.createIndex('by-sync-status', 'sync_status');
          eventsStore.createIndex('by-date', 'start_time');

          // Groups store
          const groupsStore = db.createObjectStore('groups', { keyPath: 'id' });
          groupsStore.createIndex('by-user', 'user_id');
          groupsStore.createIndex('by-sync-status', 'sync_status');

          // Group members store
          const groupMembersStore = db.createObjectStore('group_members', { keyPath: 'id' });
          groupMembersStore.createIndex('by-group', 'group_id');
          groupMembersStore.createIndex('by-sync-status', 'sync_status');

          // Sync queue
          const syncQueueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncQueueStore.createIndex('by-user', 'user_id');
          syncQueueStore.createIndex('by-timestamp', 'timestamp');

          // User metadata
          db.createObjectStore('user_metadata', { keyPath: 'user_id' });
        },
      });
    }

    // Initialize user metadata if not exists
    const existing = await this.db.get('user_metadata', userId);
    if (!existing) {
      await this.db.put('user_metadata', {
        user_id: userId,
        last_sync: 0,
        sync_version: 1
      });
    }
  }

  private generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addSyncMetadata<T extends SyncableRecord>(record: T): T & { sync_status: SyncStatus; last_modified: number; offline_id?: string } {
    return {
      ...record,
      sync_status: 'pending' as SyncStatus,
      last_modified: Date.now(),
      offline_id: this.generateOfflineId()
    };
  }

  // Relationships
  async listRelationships(userId: string): Promise<Relationship[]> {
    if (!this.db) throw new Error('Database not initialized');
    const relationships = await this.db.getAllFromIndex('relationships', 'by-user', userId);
    return relationships.map(rel => {
      const { sync_status, last_modified, offline_id, ...relationship } = rel;
      return relationship as Relationship;
    });
  }

  async getRelationship(id: string): Promise<Relationship | null> {
    if (!this.db) throw new Error('Database not initialized');
    const rel = await this.db.get('relationships', id);
    if (!rel) return null;
    
    const { sync_status, last_modified, offline_id, ...relationship } = rel;
    return relationship as Relationship;
  }

  async addRelationship(data: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const relationship: Relationship = {
      ...data,
      id: this.generateOfflineId(),
      created_at: now,
      updated_at: now,
    };

    const recordWithMeta = this.addSyncMetadata(relationship);
    await this.db.put('relationships', recordWithMeta);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: data.user_id,
      table: 'relationships',
      operation: 'create',
      data: relationship,
      timestamp: Date.now(),
      retry_count: 0
    });

    return relationship;
  }

  async updateRelationship(id: string, changes: Partial<Relationship>): Promise<Relationship | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const existing = await this.db.get('relationships', id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...changes,
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as SyncStatus,
      last_modified: Date.now()
    };

    await this.db.put('relationships', updated);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: existing.user_id,
      table: 'relationships',
      operation: 'update',
      data: { id, ...changes },
      timestamp: Date.now(),
      retry_count: 0
    });

    const { sync_status, last_modified, offline_id, ...relationship } = updated;
    return relationship as Relationship;
  }

  async deleteRelationship(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const existing = await this.db.get('relationships', id);
    if (!existing) return;

    await this.db.delete('relationships', id);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: existing.user_id,
      table: 'relationships',
      operation: 'delete',
      data: { id },
      timestamp: Date.now(),
      retry_count: 0
    });
  }

  // Events
  async listEvents(userId: string, opts?: { from?: string; to?: string }): Promise<Event[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    let events = await this.db.getAllFromIndex('events', 'by-user', userId);
    
    if (opts?.from || opts?.to) {
      events = events.filter(event => {
        if (opts.from && event.start_time < opts.from) return false;
        if (opts.to && event.start_time > opts.to) return false;
        return true;
      });
    }

    return events.map(event => {
      const { sync_status, last_modified, offline_id, ...eventData } = event;
      return eventData as Event;
    });
  }

  async getEvent(id: string): Promise<Event | null> {
    if (!this.db) throw new Error('Database not initialized');
    const event = await this.db.get('events', id);
    if (!event) return null;
    
    const { sync_status, last_modified, offline_id, ...eventData } = event;
    return eventData as Event;
  }

  async addEvent(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    if (!this.db) throw new Error('Database not initialized');
    
    const now = new Date().toISOString();
    const event: Event = {
      ...data,
      id: this.generateOfflineId(),
      created_at: now,
      updated_at: now,
    };

    const recordWithMeta = this.addSyncMetadata(event);
    await this.db.put('events', recordWithMeta);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: data.user_id,
      table: 'events',
      operation: 'create',
      data: event,
      timestamp: Date.now(),
      retry_count: 0
    });

    return event;
  }

  async updateEvent(id: string, changes: Partial<Event>): Promise<Event | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    const existing = await this.db.get('events', id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...changes,
      updated_at: new Date().toISOString(),
      sync_status: 'pending' as SyncStatus,
      last_modified: Date.now()
    };

    await this.db.put('events', updated);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: existing.user_id,
      table: 'events',
      operation: 'update',
      data: { id, ...changes },
      timestamp: Date.now(),
      retry_count: 0
    });

    const { sync_status, last_modified, offline_id, ...eventData } = updated;
    return eventData as Event;
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const existing = await this.db.get('events', id);
    if (!existing) return;

    await this.db.delete('events', id);

    // Add to sync queue
    await this.addToSyncQueue({
      id: this.generateOfflineId(),
      user_id: existing.user_id,
      table: 'events',
      operation: 'delete',
      data: { id },
      timestamp: Date.now(),
      retry_count: 0
    });
  }

  // Sync Management
  async addToSyncQueue(change: OfflineChange): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put('sync_queue', change);
  }

  async getPendingSyncChanges(userId: string): Promise<OfflineChange[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllFromIndex('sync_queue', 'by-user', userId);
  }

  async markChangeSynced(changeId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('sync_queue', changeId);
  }

  async updateSyncRetryCount(changeId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const change = await this.db.get('sync_queue', changeId);
    if (change) {
      change.retry_count += 1;
      await this.db.put('sync_queue', change);
    }
  }

  // Cache Management
  async cacheServerData(userId: string, table: 'relationships' | 'events' | 'groups' | 'group_members', data: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const store = this.db.transaction([table], 'readwrite').objectStore(table);
    
    // Clear existing synced records for this user
    const existing = await this.db.getAllFromIndex(table, 'by-user', userId);
    for (const record of existing) {
      if (record.sync_status === 'synced') {
        await store.delete(record.id);
      }
    }

    // Add new server data
    for (const item of data) {
      const recordWithMeta = {
        ...item,
        sync_status: 'synced' as SyncStatus,
        last_modified: Date.now()
      };
      await store.put(recordWithMeta);
    }
  }

  async updateLastSyncTime(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const metadata = await this.db.get('user_metadata', userId);
    if (metadata) {
      metadata.last_sync = Date.now();
      await this.db.put('user_metadata', metadata);
    }
  }

  async getLastSyncTime(userId: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const metadata = await this.db.get('user_metadata', userId);
    return metadata?.last_sync || 0;
  }

  // Cleanup
  async clearUserData(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction(['relationships', 'events', 'groups', 'group_members', 'sync_queue', 'user_metadata'], 'readwrite');
    
    // Clear all user data
    const stores = ['relationships', 'events', 'groups', 'group_members', 'sync_queue'] as const;
    for (const storeName of stores) {
      const store = tx.objectStore(storeName);
      const records = await store.index('by-user').getAll(userId);
      for (const record of records) {
        await store.delete(record.id);
      }
    }
    
    // Clear user metadata
    await tx.objectStore('user_metadata').delete(userId);
    
    await tx.done;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
const offlineStore = new OfflineStore();

export { offlineStore, type OfflineChange, type SyncStatus };
export default offlineStore;
