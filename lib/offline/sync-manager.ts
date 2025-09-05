/**
 * Sync Manager
 * Handles bidirectional data synchronization between offline storage and Supabase
 */

import { createSupabaseClient } from '../supabase/client';
import offlineStore, { type OfflineChange } from './offline-store';
import connectionManager from './connection-manager';
import type { Relationship, Event, RelationshipGroup } from '../supabase/types';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

interface ConflictResolution {
  changeId: string;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: any;
}

type SyncCallback = (status: SyncStatus) => void;

interface SyncStatus {
  isActive: boolean;
  phase: 'idle' | 'up' | 'down' | 'conflicts';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  lastSync?: number;
  error?: string;
}

class SyncManager {
  private supabase = createSupabaseClient();
  private syncCallbacks: Set<SyncCallback> = new Set();
  private currentSyncPromise: Promise<SyncResult> | null = null;
  private syncStatus: SyncStatus = {
    isActive: false,
    phase: 'idle',
    progress: { total: 0, completed: 0, failed: 0 }
  };

  private backgroundSyncInterval?: NodeJS.Timeout;
  private isBackgroundSyncEnabled = true;

  constructor() {
    this.setupConnectionListener();
    this.startBackgroundSync();
  }

  private setupConnectionListener(): void {
    connectionManager.onConnectionChange(async (isOnline) => {
      if (isOnline) {
        console.log('Connection restored, triggering sync...');
        // Wait a bit for the connection to stabilize
        setTimeout(() => {
          this.triggerSync();
        }, 1000);
      }
    });
  }

  private startBackgroundSync(): void {
    // Sync every 5 minutes when online
    this.backgroundSyncInterval = setInterval(() => {
      if (this.isBackgroundSyncEnabled && connectionManager.isConnected()) {
        this.triggerSync('background');
      }
    }, 5 * 60 * 1000);
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyCallbacks();
  }

  private notifyCallbacks(): void {
    this.syncCallbacks.forEach(callback => {
      try {
        callback({ ...this.syncStatus });
      } catch (error) {
        console.error('Error in sync callback:', error);
      }
    });
  }

  // Public API
  async triggerSync(type: 'manual' | 'background' | 'auto' = 'manual'): Promise<SyncResult> {
    if (this.currentSyncPromise) {
      console.log('Sync already in progress, waiting for completion');
      return this.currentSyncPromise;
    }

    if (!connectionManager.isConnected()) {
      throw new Error('Cannot sync while offline');
    }

    console.log(`Starting ${type} sync...`);
    
    this.currentSyncPromise = this.performSync();
    
    try {
      const result = await this.currentSyncPromise;
      console.log(`${type} sync completed:`, result);
      return result;
    } finally {
      this.currentSyncPromise = null;
    }
  }

  private async performSync(): Promise<SyncResult> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user found');
    }

    this.updateSyncStatus({
      isActive: true,
      phase: 'up',
      progress: { total: 0, completed: 0, failed: 0 },
      error: undefined
    });

    try {
      // Phase 1: Sync up (local changes to server)
      const upResult = await this.syncUp(userId);
      
      // Phase 2: Sync down (server changes to local)
      this.updateSyncStatus({ phase: 'down' });
      const downResult = await this.syncDown(userId);

      // Phase 3: Handle any conflicts
      if (upResult.conflicts > 0 || downResult.conflicts > 0) {
        this.updateSyncStatus({ phase: 'conflicts' });
        // For now, we'll use last-write-wins for conflict resolution
        // In the future, we can implement user-prompted resolution
      }

      const finalResult: SyncResult = {
        success: upResult.success && downResult.success,
        synced: upResult.synced + downResult.synced,
        failed: upResult.failed + downResult.failed,
        conflicts: upResult.conflicts + downResult.conflicts,
        errors: [...upResult.errors, ...downResult.errors]
      };

      // Update last sync time
      await offlineStore.updateLastSyncTime(userId);
      
      this.updateSyncStatus({
        isActive: false,
        phase: 'idle',
        lastSync: Date.now(),
        progress: {
          total: finalResult.synced + finalResult.failed,
          completed: finalResult.synced,
          failed: finalResult.failed
        }
      });

      return finalResult;

    } catch (error) {
      console.error('Sync failed:', error);
      this.updateSyncStatus({
        isActive: false,
        phase: 'idle',
        error: error instanceof Error ? error.message : 'Unknown sync error'
      });

      return {
        success: false,
        synced: 0,
        failed: 1,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      };
    }
  }

  private async syncUp(userId: string): Promise<SyncResult> {
    const pendingChanges = await offlineStore.getPendingSyncChanges(userId);
    console.log(`Found ${pendingChanges.length} pending changes to sync up`);

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    this.updateSyncStatus({
      progress: { total: pendingChanges.length, completed: 0, failed: 0 }
    });

    for (const change of pendingChanges) {
      try {
        await this.applySyncChange(change);
        await offlineStore.markChangeSynced(change.id);
        result.synced++;
        
        this.updateSyncStatus({
          progress: {
            total: pendingChanges.length,
            completed: result.synced,
            failed: result.failed
          }
        });

      } catch (error) {
        console.error(`Failed to sync change ${change.id}:`, error);
        result.failed++;
        result.errors.push(`${change.table}:${change.operation} - ${error}`);
        
        // Update retry count
        await offlineStore.updateSyncRetryCount(change.id);
        
        // If we've retried too many times, remove from queue
        if (change.retry_count >= 5) {
          console.warn(`Removing change ${change.id} after ${change.retry_count} retries`);
          await offlineStore.markChangeSynced(change.id);
        }
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  private async syncDown(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // Get last sync time to only fetch changes since then
      const lastSync = await offlineStore.getLastSyncTime(userId);
      const lastSyncDate = new Date(lastSync).toISOString();

      console.log(`Syncing down changes since ${lastSyncDate}`);

      // Fetch updated data from server
      const { data: relationships, error: relError } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncDate);

      if (relError) throw new Error(`Relationships sync error: ${relError.message}`);

      const { data: events, error: eventsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncDate);

      if (eventsError) throw new Error(`Events sync error: ${eventsError.message}`);

      const { data: groups, error: groupsError } = await this.supabase
        .from('relationship_groups')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', lastSyncDate);

      if (groupsError) throw new Error(`Groups sync error: ${groupsError.message}`);

      // Cache the server data
      if (relationships?.length) {
        await offlineStore.cacheServerData(userId, 'relationships', relationships);
        result.synced += relationships.length;
      }

      if (events?.length) {
        await offlineStore.cacheServerData(userId, 'events', events);
        result.synced += events.length;
      }

      if (groups?.length) {
        await offlineStore.cacheServerData(userId, 'groups', groups);
        result.synced += groups.length;
      }

      console.log(`Synced down ${result.synced} records`);

    } catch (error) {
      console.error('Sync down failed:', error);
      result.success = false;
      result.failed = 1;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync down error');
    }

    return result;
  }

  private async applySyncChange(change: OfflineChange): Promise<void> {
    const { table, operation, data } = change;

    switch (table) {
      case 'relationships':
        await this.syncRelationshipChange(operation, data);
        break;
      case 'events':
        await this.syncEventChange(operation, data);
        break;
      case 'groups':
        await this.syncGroupChange(operation, data);
        break;
      default:
        throw new Error(`Unsupported table: ${table}`);
    }
  }

  private async syncRelationshipChange(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'create': {
        const { error } = await this.supabase
          .from('relationships')
          .insert(data);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { id, ...updates } = data;
        const { error } = await this.supabase
          .from('relationships')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await this.supabase
          .from('relationships')
          .delete()
          .eq('id', data.id);
        if (error) throw error;
        break;
      }
    }
  }

  private async syncEventChange(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'create': {
        const { error } = await this.supabase
          .from('events')
          .insert(data);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { id, ...updates } = data;
        const { error } = await this.supabase
          .from('events')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await this.supabase
          .from('events')
          .delete()
          .eq('id', data.id);
        if (error) throw error;
        break;
      }
    }
  }

  private async syncGroupChange(operation: string, data: any): Promise<void> {
    switch (operation) {
      case 'create': {
        const { error } = await this.supabase
          .from('relationship_groups')
          .insert(data);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { id, ...updates } = data;
        const { error } = await this.supabase
          .from('relationship_groups')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await this.supabase
          .from('relationship_groups')
          .delete()
          .eq('id', data.id);
        if (error) throw error;
        break;
      }
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user?.id || null;
  }

  // Public API for status monitoring
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  onSyncStatusChange(callback: SyncCallback): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  // Manual sync trigger
  async forcSync(): Promise<SyncResult> {
    return this.triggerSync('manual');
  }

  // Background sync control
  enableBackgroundSync(): void {
    this.isBackgroundSyncEnabled = true;
  }

  disableBackgroundSync(): void {
    this.isBackgroundSyncEnabled = false;
  }

  // Get pending sync count
  async getPendingCount(): Promise<number> {
    const userId = await this.getCurrentUserId();
    if (!userId) return 0;
    
    const changes = await offlineStore.getPendingSyncChanges(userId);
    return changes.length;
  }

  // Cleanup
  destroy(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    this.syncCallbacks.clear();
  }
}

// Singleton instance
const syncManager = new SyncManager();

export default syncManager;
export type { SyncResult, SyncStatus, SyncCallback, ConflictResolution };
