/**
 * Data Synchronization Validator
 * 
 * This module provides validation and synchronization capabilities
 * for ensuring data consistency between client and server.
 */

import { createSupabaseClient } from './client';
import { User } from '@supabase/supabase-js';

export interface DataSyncResult {
  isValid: boolean;
  discrepancies: DataDiscrepancy[];
  lastSync: number;
  totalRecords: number;
}

export interface DataDiscrepancy {
  type: 'missing_local' | 'missing_remote' | 'data_mismatch' | 'timestamp_mismatch';
  table: string;
  recordId: string;
  description: string;
  localData?: any;
  remoteData?: any;
  severity: 'low' | 'medium' | 'high';
}

export interface SyncValidationOptions {
  tables: string[];
  userId: string;
  includeTimestamps?: boolean;
  maxDiscrepancies?: number;
}

export class DataSyncValidator {
  private supabase = createSupabaseClient();
  private validationCache = new Map<string, DataSyncResult>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate data synchronization for a user
   */
  public async validateUserDataSync(
    user: User,
    options: Partial<SyncValidationOptions> = {}
  ): Promise<DataSyncResult> {
    const config: SyncValidationOptions = {
      tables: ['relationships', 'events', 'contacts'],
      userId: user.id,
      includeTimestamps: true,
      maxDiscrepancies: 100,
      ...options
    };

    const cacheKey = `${config.userId}-${config.tables.join(',')}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.lastSync < this.cacheTimeout) {
      return cached;
    }

    console.log('DataSyncValidator: Starting validation for user:', config.userId);
    
    const discrepancies: DataDiscrepancy[] = [];
    let totalRecords = 0;

    for (const table of config.tables) {
      try {
        const tableDiscrepancies = await this.validateTable(table, config);
        discrepancies.push(...tableDiscrepancies);
        totalRecords += await this.getTableRecordCount(table, config.userId);
      } catch (error) {
        console.error(`DataSyncValidator: Error validating table ${table}:`, error);
        discrepancies.push({
          type: 'data_mismatch',
          table,
          recordId: 'unknown',
          description: `Failed to validate table ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'high'
        });
      }
    }

    const result: DataSyncResult = {
      isValid: discrepancies.length === 0,
      discrepancies: discrepancies.slice(0, config.maxDiscrepancies || 100),
      lastSync: Date.now(),
      totalRecords
    };

    this.validationCache.set(cacheKey, result);
    
    console.log('DataSyncValidator: Validation completed', {
      userId: config.userId,
      totalRecords,
      discrepancies: discrepancies.length,
      isValid: result.isValid
    });

    return result;
  }

  /**
   * Validate a specific table
   */
  private async validateTable(
    table: string,
    config: SyncValidationOptions
  ): Promise<DataDiscrepancy[]> {
    const discrepancies: DataDiscrepancy[] = [];

    try {
      // Get local data (simulated - in real implementation this would come from local storage/cache)
      const localData = await this.getLocalTableData(table, config.userId);
      
      // Get remote data
      const remoteData = await this.getRemoteTableData(table, config.userId);

      // Compare data
      const comparisonResult = await this.compareTableData(
        table,
        localData,
        remoteData,
        config
      );

      discrepancies.push(...comparisonResult);

    } catch (error) {
      console.error(`DataSyncValidator: Error validating table ${table}:`, error);
      discrepancies.push({
        type: 'data_mismatch',
        table,
        recordId: 'unknown',
        description: `Table validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
    }

    return discrepancies;
  }

  /**
   * Get local table data (simulated)
   */
  private async getLocalTableData(table: string, userId: string): Promise<any[]> {
    // In a real implementation, this would fetch from local storage, IndexedDB, or cache
    // For now, we'll simulate by fetching from the database
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn(`Failed to get local data for ${table}:`, error);
      return [];
    }
  }

  /**
   * Get remote table data
   */
  private async getRemoteTableData(table: string, userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Failed to get remote data for ${table}:`, error);
      return [];
    }
  }

  /**
   * Compare local and remote table data
   */
  private async compareTableData(
    table: string,
    localData: any[],
    remoteData: any[],
    config: SyncValidationOptions
  ): Promise<DataDiscrepancy[]> {
    const discrepancies: DataDiscrepancy[] = [];

    // Handle specific table comparisons
    switch (table) {
      case 'relationships':
        return this.compareRelationships(localData, remoteData);
      case 'events':
        return this.compareEvents(localData, remoteData, config);
      case 'contacts':
        return this.compareContacts(localData, remoteData);
      default:
        return this.compareGenericRecords(table, localData, remoteData, config);
    }
  }

  /**
   * Compare relationships data
   */
  private compareRelationships(
    localRelationships: any[],
    remoteRelationships: any[]
  ): DataDiscrepancy[] {
    const discrepancies: DataDiscrepancy[] = [];

    try {
      // Create maps for efficient comparison
      const localMap = new Map(localRelationships.map((r: any) => [r.id, r]));
      const remoteMap = new Map((remoteRelationships || []).map((r: any) => [r.id, r]));

      // Find records missing locally
      for (const [id, remoteRecord] of remoteMap) {
        if (!localMap.has(id as string)) {
          discrepancies.push({
            type: 'missing_local',
            table: 'relationships',
            recordId: id as string,
            description: `Relationship ${id} exists remotely but not locally`,
            remoteData: remoteRecord,
            severity: 'medium'
          });
        }
      }

      // Find records missing remotely
      for (const [id, localRecord] of localMap) {
        if (!remoteMap.has(id)) {
          discrepancies.push({
            type: 'missing_remote',
            table: 'relationships',
            recordId: id,
            description: `Relationship ${id} exists locally but not remotely`,
            localData: localRecord,
            severity: 'medium'
          });
        }
      }

      // Find data mismatches
      for (const [id, localRecord] of localMap) {
        const remoteRecord = remoteMap.get(id);
        if (remoteRecord) {
          const mismatches = this.compareRecords(localRecord, remoteRecord);
          if (mismatches.length > 0) {
            discrepancies.push({
              type: 'data_mismatch',
              table: 'relationships',
              recordId: id,
              description: `Relationship ${id} has data mismatches: ${mismatches.join(', ')}`,
              localData: localRecord,
              remoteData: remoteRecord,
              severity: 'low'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error comparing relationships:', error);
      discrepancies.push({
        type: 'data_mismatch',
        table: 'relationships',
        recordId: 'unknown',
        description: `Relationship comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
    }

    return discrepancies;
  }

  /**
   * Compare events data
   */
  private compareEvents(
    localEvents: any[],
    remoteEvents: any[],
    config: SyncValidationOptions
  ): DataDiscrepancy[] {
    const discrepancies: DataDiscrepancy[] = [];

    try {
      const localMap = new Map(localEvents.map((e: any) => [e.id, e]));
      const remoteMap = new Map(remoteEvents.map((e: any) => [e.id, e]));

      // Similar comparison logic as relationships
      for (const [id, remoteRecord] of remoteMap) {
        if (!localMap.has(id)) {
          discrepancies.push({
            type: 'missing_local',
            table: 'events',
            recordId: id,
            description: `Event ${id} exists remotely but not locally`,
            remoteData: remoteRecord,
            severity: 'medium'
          });
        }
      }

      for (const [id, localRecord] of localMap) {
        if (!remoteMap.has(id)) {
          discrepancies.push({
            type: 'missing_remote',
            table: 'events',
            recordId: id,
            description: `Event ${id} exists locally but not remotely`,
            localData: localRecord,
            severity: 'medium'
          });
        }
      }

      // Check for timestamp mismatches if enabled
      if (config.includeTimestamps) {
        for (const [id, localRecord] of localMap) {
          const remoteRecord = remoteMap.get(id);
          if (remoteRecord && localRecord.updated_at !== remoteRecord.updated_at) {
            discrepancies.push({
              type: 'timestamp_mismatch',
              table: 'events',
              recordId: id,
              description: `Event ${id} has timestamp mismatch`,
              localData: { updated_at: localRecord.updated_at },
              remoteData: { updated_at: remoteRecord.updated_at },
              severity: 'low'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error comparing events:', error);
      discrepancies.push({
        type: 'data_mismatch',
        table: 'events',
        recordId: 'unknown',
        description: `Event comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
    }

    return discrepancies;
  }

  /**
   * Compare contacts data
   */
  private compareContacts(localContacts: any[], remoteContacts: any[]): DataDiscrepancy[] {
    const discrepancies: DataDiscrepancy[] = [];

    try {
      const localMap = new Map(localContacts.map((c: any) => [c.id, c]));
      const remoteMap = new Map(remoteContacts.map((c: any) => [c.id, c]));

      // Similar comparison logic
      for (const [id, remoteRecord] of remoteMap) {
        if (!localMap.has(id)) {
          discrepancies.push({
            type: 'missing_local',
            table: 'contacts',
            recordId: id,
            description: `Contact ${id} exists remotely but not locally`,
            remoteData: remoteRecord,
            severity: 'medium'
          });
        }
      }

      for (const [id, localRecord] of localMap) {
        if (!remoteMap.has(id)) {
          discrepancies.push({
            type: 'missing_remote',
            table: 'contacts',
            recordId: id,
            description: `Contact ${id} exists locally but not remotely`,
            localData: localRecord,
            severity: 'medium'
          });
        }
      }

    } catch (error) {
      console.error('Error comparing contacts:', error);
      discrepancies.push({
        type: 'data_mismatch',
        table: 'contacts',
        recordId: 'unknown',
        description: `Contact comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
    }

    return discrepancies;
  }

  /**
   * Compare generic records
   */
  private compareGenericRecords(
    table: string,
    localData: any[],
    remoteData: any[],
    config: SyncValidationOptions
  ): DataDiscrepancy[] {
    const discrepancies: DataDiscrepancy[] = [];

    try {
      const localMap = new Map(localData.map((r: any) => [r.id, r]));
      const remoteMap = new Map(remoteData.map((r: any) => [r.id, r]));

      for (const [id, remoteRecord] of remoteMap) {
        if (!localMap.has(id)) {
          discrepancies.push({
            type: 'missing_local',
            table,
            recordId: id,
            description: `Record ${id} in ${table} exists remotely but not locally`,
            remoteData: remoteRecord,
            severity: 'medium'
          });
        }
      }

      for (const [id, localRecord] of localMap) {
        if (!remoteMap.has(id)) {
          discrepancies.push({
            type: 'missing_remote',
            table,
            recordId: id,
            description: `Record ${id} in ${table} exists locally but not remotely`,
            localData: localRecord,
            severity: 'medium'
          });
        }
      }

    } catch (error) {
      console.error(`Error comparing ${table}:`, error);
      discrepancies.push({
        type: 'data_mismatch',
        table,
        recordId: 'unknown',
        description: `${table} comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high'
      });
    }

    return discrepancies;
  }

  /**
   * Compare individual records for differences
   */
  private compareRecords(local: any, remote: any): string[] {
    const differences: string[] = [];

    try {
      const localKeys = Object.keys(local);
      const remoteKeys = Object.keys(remote);

      // Check for missing keys
      for (const key of localKeys) {
        if (!remoteKeys.includes(key)) {
          differences.push(`Missing remote key: ${key}`);
        }
      }

      for (const key of remoteKeys) {
        if (!localKeys.includes(key)) {
          differences.push(`Missing local key: ${key}`);
        }
      }

      // Check for value differences
      for (const key of localKeys) {
        if (remoteKeys.includes(key) && local[key] !== remote[key]) {
          differences.push(`Value mismatch for ${key}`);
        }
      }

    } catch (error) {
      console.error('Error comparing records:', error);
      differences.push('Record comparison failed');
    }

    return differences;
  }

  /**
   * Get record count for a table
   */
  private async getTableRecordCount(table: string, userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error(`Failed to get record count for ${table}:`, error);
      return 0;
    }
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.validationCache.size,
      keys: Array.from(this.validationCache.keys())
    };
  }
}

// Singleton instance
let dataSyncValidator: DataSyncValidator | null = null;

/**
 * Get the singleton data sync validator instance
 */
export function getDataSyncValidator(): DataSyncValidator {
  if (!dataSyncValidator) {
    dataSyncValidator = new DataSyncValidator();
  }
  return dataSyncValidator;
}