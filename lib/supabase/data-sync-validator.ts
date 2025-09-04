/**
 * Data Synchronization Validator
 * 
 * Provides comprehensive data integrity validation and synchronization
 * checks for real-time systems to ensure data consistency.
 */

import { createSupabaseClient } from './client';
import { type Relationship } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corrections?: any;
}

export interface SyncValidationOptions {
  validateRLS?: boolean;
  validateForeignKeys?: boolean;
  validateTimestamps?: boolean;
  validateUserOwnership?: boolean;
  autoCorrect?: boolean;
}

export interface DataIntegrityReport {
  timestamp: Date;
  table: string;
  userId: string;
  localCount: number;
  remoteCount: number;
  discrepancies: Array<{
    type: 'missing_local' | 'missing_remote' | 'data_mismatch';
    recordId: string;
    description: string;
    localData?: any;
    remoteData?: any;
  }>;
  suggestions: string[];
}

class DataSyncValidator {
  private static instance: DataSyncValidator;
  private supabase = createSupabaseClient();

  private constructor() {}

  static getInstance(): DataSyncValidator {
    if (!DataSyncValidator.instance) {
      DataSyncValidator.instance = new DataSyncValidator();
    }
    return DataSyncValidator.instance;
  }

  /**
   * Validate relationship data integrity
   */
  async validateRelationships(
    localData: Relationship[],
    userId: string,
    options: SyncValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const corrections: any = {};

    try {
      // Basic structure validation
      for (const relationship of localData) {
        const structureValidation = this.validateRelationshipStructure(relationship);
        if (!structureValidation.isValid) {
          errors.push(...structureValidation.errors);
          warnings.push(...structureValidation.warnings);
        }
      }

      // User ownership validation
      if (options.validateUserOwnership !== false) {
        const ownershipValidation = this.validateUserOwnership(localData, userId);
        if (!ownershipValidation.isValid) {
          errors.push(...ownershipValidation.errors);
        }
      }

      // Timestamp validation
      if (options.validateTimestamps !== false) {
        const timestampValidation = this.validateTimestamps(localData);
        if (!timestampValidation.isValid) {
          warnings.push(...timestampValidation.warnings);
        }
      }

      // Foreign key validation (if enabled)
      if (options.validateForeignKeys) {
        // This would check if referenced users exist, etc.
        // Implementation would depend on your foreign key relationships
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        corrections: Object.keys(corrections).length > 0 ? corrections : undefined
      };

    } catch (error) {
      console.error('[DATA-SYNC-VALIDATOR] Validation error:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  private validateRelationshipStructure(relationship: Relationship): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!relationship.id) {
      errors.push(`Relationship missing required field: id`);
    }
    if (!relationship.user_id) {
      errors.push(`Relationship ${relationship.id} missing required field: user_id`);
    }
    if (!relationship.relationship_type) {
      errors.push(`Relationship ${relationship.id} missing required field: relationship_type`);
    }
    if (!relationship.created_at) {
      errors.push(`Relationship ${relationship.id} missing required field: created_at`);
    }
    if (!relationship.updated_at) {
      errors.push(`Relationship ${relationship.id} missing required field: updated_at`);
    }

    // Data type validation
    if (relationship.id && typeof relationship.id !== 'string') {
      errors.push(`Relationship id must be a string, got ${typeof relationship.id}`);
    }
    
    if (relationship.user_id && typeof relationship.user_id !== 'string') {
      errors.push(`Relationship user_id must be a string, got ${typeof relationship.user_id}`);
    }

    // Enum validation
    const validRelationshipTypes = [
      'primary_partner', 'secondary_partner', 'metamour', 'friend', 
      'family', 'professional', 'other'
    ];
    if (relationship.relationship_type && !validRelationshipTypes.includes(relationship.relationship_type)) {
      warnings.push(`Relationship ${relationship.id} has unusual relationship_type: ${relationship.relationship_type}`);
    }

    const validPrivacyLevels = ['public', 'friends', 'limited_access', 'private'];
    if (relationship.privacy_level && !validPrivacyLevels.includes(relationship.privacy_level)) {
      warnings.push(`Relationship ${relationship.id} has invalid privacy_level: ${relationship.privacy_level}`);
    }

    // Date validation
    if (relationship.created_at && isNaN(new Date(relationship.created_at).getTime())) {
      errors.push(`Relationship ${relationship.id} has invalid created_at date`);
    }
    if (relationship.updated_at && isNaN(new Date(relationship.updated_at).getTime())) {
      errors.push(`Relationship ${relationship.id} has invalid updated_at date`);
    }
    if (relationship.start_date && isNaN(new Date(relationship.start_date).getTime())) {
      warnings.push(`Relationship ${relationship.id} has invalid start_date`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateUserOwnership(relationships: Relationship[], userId: string): ValidationResult {
    const errors: string[] = [];

    for (const relationship of relationships) {
      if (relationship.user_id !== userId) {
        errors.push(`Relationship ${relationship.id} belongs to user ${relationship.user_id}, not ${userId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateTimestamps(relationships: Relationship[]): ValidationResult {
    const warnings: string[] = [];
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const futureThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in future

    for (const relationship of relationships) {
      const createdAt = new Date(relationship.created_at);
      const updatedAt = new Date(relationship.updated_at);

      // Check for reasonable timestamp ranges
      if (createdAt < oneYearAgo) {
        warnings.push(`Relationship ${relationship.id} created_at is more than 1 year ago`);
      }
      if (createdAt > futureThreshold) {
        warnings.push(`Relationship ${relationship.id} created_at is in the future`);
      }
      if (updatedAt > futureThreshold) {
        warnings.push(`Relationship ${relationship.id} updated_at is in the future`);
      }
      if (updatedAt < createdAt) {
        warnings.push(`Relationship ${relationship.id} updated_at is before created_at`);
      }
    }

    return {
      isValid: true,
      errors: [],
      warnings
    };
  }

  /**
   * Compare local data with remote data and generate integrity report
   */
  async generateIntegrityReport(
    localRelationships: Relationship[],
    userId: string
  ): Promise<DataIntegrityReport> {
    try {
      console.log('[DATA-SYNC-VALIDATOR] Generating integrity report for user:', userId);

      // Fetch fresh data from database
      const { data: remoteRelationships, error } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const discrepancies: DataIntegrityReport['discrepancies'] = [];
      const suggestions: string[] = [];

      // Create maps for efficient comparison
      const localMap = new Map(localRelationships.map(r => [r.id, r]));
      const remoteMap = new Map((remoteRelationships || []).map(r => [r.id, r]));

      // Find records missing locally
      for (const [id, remoteRecord] of remoteMap) {
        if (!localMap.has(id)) {
          discrepancies.push({
            type: 'missing_local',
            recordId: id,
            description: `Relationship ${id} exists remotely but not locally`,
            remoteData: remoteRecord
          });
        }
      }

      // Find records missing remotely
      for (const [id, localRecord] of localMap) {
        if (!remoteMap.has(id)) {
          discrepancies.push({
            type: 'missing_remote',
            recordId: id,
            description: `Relationship ${id} exists locally but not remotely`,
            localData: localRecord
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
              recordId: id,
              description: `Data mismatch in relationship ${id}: ${mismatches.join(', ')}`,
              localData: localRecord,
              remoteData: remoteRecord
            });
          }
        }
      }

      // Generate suggestions based on discrepancies
      if (discrepancies.some(d => d.type === 'missing_local')) {
        suggestions.push('Consider refetching data to sync missing local records');
      }
      if (discrepancies.some(d => d.type === 'missing_remote')) {
        suggestions.push('Some local records may need to be re-synced to the server');
      }
      if (discrepancies.some(d => d.type === 'data_mismatch')) {
        suggestions.push('Data conflicts detected - real-time subscription may need to be reset');
      }

      const report: DataIntegrityReport = {
        timestamp: new Date(),
        table: 'relationships',
        userId,
        localCount: localRelationships.length,
        remoteCount: (remoteRelationships || []).length,
        discrepancies,
        suggestions
      };

      console.log('[DATA-SYNC-VALIDATOR] Integrity report generated:', {
        localCount: report.localCount,
        remoteCount: report.remoteCount,
        discrepancies: report.discrepancies.length,
        suggestions: report.suggestions.length
      });

      return report;

    } catch (error) {
      console.error('[DATA-SYNC-VALIDATOR] Failed to generate integrity report:', error);
      throw error;
    }
  }

  private compareRecords(local: Relationship, remote: Relationship): string[] {
    const mismatches: string[] = [];
    const fieldsToCompare = [
      'partner_name', 'partner_email', 'relationship_type', 'privacy_level',
      'start_date', 'notes', 'color', 'invitation_status'
    ];

    for (const field of fieldsToCompare) {
      const localValue = (local as any)[field];
      const remoteValue = (remote as any)[field];
      
      if (localValue !== remoteValue) {
        mismatches.push(`${field}: local='${localValue}' vs remote='${remoteValue}'`);
      }
    }

    // Special handling for timestamps (allow small differences due to precision)
    const localUpdated = new Date(local.updated_at).getTime();
    const remoteUpdated = new Date(remote.updated_at).getTime();
    const timeDiff = Math.abs(localUpdated - remoteUpdated);
    
    if (timeDiff > 5000) { // More than 5 seconds difference
      mismatches.push(`updated_at: ${timeDiff}ms difference`);
    }

    return mismatches;
  }

  /**
   * Auto-correct data based on validation results
   */
  async autoCorrectData(
    relationships: Relationship[],
    validationResult: ValidationResult
  ): Promise<Relationship[]> {
    if (validationResult.isValid || !validationResult.corrections) {
      return relationships;
    }

    console.log('[DATA-SYNC-VALIDATOR] Auto-correcting data based on validation results');

    // Apply corrections (this is a simplified example)
    const correctedRelationships = relationships.map(relationship => {
      const correctedRelationship = { ...relationship };
      
      // Example corrections
      if (!correctedRelationship.privacy_level) {
        correctedRelationship.privacy_level = 'limited_access';
      }
      
      if (!correctedRelationship.color) {
        correctedRelationship.color = '#6B7280';
      }

      return correctedRelationship;
    });

    return correctedRelationships;
  }

  /**
   * Validate real-time payload before processing
   */
  validateRealtimePayload(payload: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!payload) {
      errors.push('Payload is null or undefined');
      return { isValid: false, errors, warnings };
    }

    if (!payload.eventType) {
      errors.push('Payload missing eventType');
    }

    if (!['INSERT', 'UPDATE', 'DELETE'].includes(payload.eventType)) {
      errors.push(`Invalid eventType: ${payload.eventType}`);
    }

    if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && !payload.new) {
      errors.push(`${payload.eventType} event missing new record`);
    }

    if (payload.eventType === 'DELETE' && !payload.old) {
      errors.push('DELETE event missing old record');
    }

    // Validate the actual record data if present
    if (payload.new) {
      const recordValidation = this.validateRelationshipStructure(payload.new);
      errors.push(...recordValidation.errors);
      warnings.push(...recordValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const dataSyncValidator = DataSyncValidator.getInstance();

// Utility functions
export async function validateRelationshipsData(
  localData: Relationship[],
  userId: string,
  options?: SyncValidationOptions
): Promise<ValidationResult> {
  return await dataSyncValidator.validateRelationships(localData, userId, options);
}

export async function generateDataIntegrityReport(
  localData: Relationship[],
  userId: string
): Promise<DataIntegrityReport> {
  return await dataSyncValidator.generateIntegrityReport(localData, userId);
}

export function validatePayload(payload: any): ValidationResult {
  return dataSyncValidator.validateRealtimePayload(payload);
}
